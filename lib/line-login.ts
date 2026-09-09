import crypto from "crypto";
import { siteUrl } from "@/lib/line";

/**
 * เข้าสู่ระบบด้วย LINE สำหรับ "หน้าเว็บปกติ" (OAuth 2.0 authorization code)
 *
 * ต่างจากฝั่ง LIFF ในแอป LINE ที่ได้ id_token มาจาก SDK ตรงๆ
 * (ดู app/api/line/book/route.ts) — บนเว็บต้องพาผู้ใช้ไปหน้า LINE
 * แล้วรับ code กลับมาแลกเป็น token เอง
 *
 * หลักความปลอดภัยที่ยึดไว้
 *   1. state  กัน CSRF — สุ่มแล้วเก็บในคุกกี้ httpOnly เทียบตอนกลับมา
 *   2. nonce  กัน replay — ส่งไปกับ authorize แล้วให้ LINE ยืนยันกลับใน id_token
 *   3. ไม่เชื่อ userId ที่ผ่านเบราว์เซอร์เด็ดขาด ใช้ค่าที่ LINE ยืนยันมาเท่านั้น

 * บัญชี LINE ที่ยืนยันแล้วคือ "ตัวตน" ของลูกค้าโดยตรง ไม่ต้องยืนยันเบอร์ซ้ำ
 * เพราะระบบไม่ได้ใช้เบอร์เป็นกุญแจเข้าถึงข้อมูลอีกต่อไป (ดู lib/customer-session.ts)
 *
 * ตั้งค่าใน LINE Developers Console → ช่อง Callback URL ต้องมี
 *   https://<โดเมนจริง>/api/line/callback
 *   http://localhost:3000/api/line/callback
 */

const AUTH_URL = "https://access.line.me/oauth2/v2.1/authorize";
const TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";

/** คุกกี้เก็บ state/nonce ระหว่างเด้งไป LINE — อายุสั้น ใช้ครั้งเดียว */
export const LINE_STATE_COOKIE = "cb_line_state";
export const STATE_TTL_MS = 10 * 60 * 1000;

export function loginChannelId(): string | null {
  return process.env.LINE_LOGIN_CHANNEL_ID || null;
}

function channelSecret(): string | null {
  return process.env.LINE_LOGIN_CHANNEL_SECRET || null;
}

/** ตั้งค่าครบพอที่จะเปิดปุ่ม "เข้าสู่ระบบด้วย LINE" ไหม */
export function lineLoginReady(): boolean {
  return Boolean(loginChannelId() && channelSecret() && process.env.AUTH_SECRET);
}

export function callbackUrl(): string {
  return `${siteUrl()}/api/line/callback`;
}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

function sign(data: string): string {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

/** เทียบสตริงแบบ timing-safe — ความยาวต้องเท่ากันก่อน ไม่งั้น timingSafeEqual จะ throw */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/* ---------- state ---------- */

export type LineState = { state: string; nonce: string; next: string };

export function newState(next: string): LineState {
  return {
    state: crypto.randomBytes(16).toString("base64url"),
    nonce: crypto.randomBytes(16).toString("base64url"),
    next,
  };
}

export function packState(s: LineState): string {
  const payload = Buffer.from(
    JSON.stringify({ ...s, exp: Date.now() + STATE_TTL_MS })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readState(token: string | undefined): LineState | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;

  const payload = token.slice(0, dot);
  if (!safeEqual(token.slice(dot + 1), sign(payload))) return null;

  try {
    const d = JSON.parse(Buffer.from(payload, "base64url").toString()) as
      LineState & { exp?: number };
    if (!d.state || !d.nonce || !d.exp || d.exp < Date.now()) return null;
    return { state: d.state, nonce: d.nonce, next: d.next || "/my" };
  } catch {
    return null;
  }
}

/* ---------- ขั้นตอนคุยกับ LINE ---------- */

export function authorizeUrl(s: LineState): string {
  const q = new URLSearchParams({
    response_type: "code",
    client_id: loginChannelId() ?? "",
    redirect_uri: callbackUrl(),
    state: s.state,
    scope: "openid profile",
    nonce: s.nonce,
  });
  return `${AUTH_URL}?${q.toString()}`;
}

/** แลก code เป็น id_token — ทำฝั่งเซิร์ฟเวอร์เท่านั้นเพราะใช้ channel secret */
export async function exchangeCode(code: string): Promise<string | null> {
  const id = loginChannelId();
  const sec = channelSecret();
  if (!id || !sec) return null;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl(),
      client_id: id,
      client_secret: sec,
    }),
  });

  if (!res.ok) {
    console.error("line token exchange failed:", res.status, await res.text());
    return null;
  }

  const data = (await res.json()) as { id_token?: string };
  return data.id_token ?? null;
}

/**
 * ให้ LINE ยืนยัน id_token แล้วคืนตัวตนที่เชื่อถือได้
 * ส่ง nonce ไปด้วยเพื่อให้ LINE ตรวจว่าเป็น token ของคำขอนี้จริง
 */
export async function verifyIdToken(
  idToken: string,
  nonce: string
): Promise<{ lineUserId: string; name: string } | null> {
  const id = loginChannelId();
  if (!id) return null;

  const res = await fetch(VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: id, nonce }),
  });

  if (!res.ok) {
    console.error("line verify id_token failed:", res.status, await res.text());
    return null;
  }

  const p = (await res.json()) as { sub?: string; name?: string };
  if (!p.sub) return null;
  return { lineUserId: p.sub, name: p.name ?? "" };
}

/** จำกัดปลายทางหลัง login ให้เป็นเส้นทางภายในเว็บเท่านั้น กัน open redirect */
export function safeNext(raw: string | null | undefined): string {
  const v = String(raw ?? "");
  if (!v.startsWith("/") || v.startsWith("//")) return "/my";
  return v;
}
