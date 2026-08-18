import crypto from "crypto";
import { cookies } from "next/headers";

export const CUSTOMER_COOKIE = "cb_customer";
/** เซสชันลูกค้ามีอายุ 30 วัน */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

function sign(data: string): string {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

/** ทำให้เบอร์อยู่ในรูปเดียวกันเสมอ — ตัดช่องว่างและขีดออก */
export function normalizePhone(input: unknown): string {
  return String(input ?? "").replace(/[\s-]/g, "");
}

export function isValidPhone(phone: string): boolean {
  return /^0\d{8,9}$/.test(phone);
}

/** สร้าง token แบบ stateless: payload.signature */
export function createSessionToken(phone: string): string {
  const payload = Buffer.from(
    JSON.stringify({ phone, exp: Date.now() + SESSION_TTL_MS })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** คืนเบอร์โทรถ้า token ถูกต้องและยังไม่หมดอายุ */
export function readSessionToken(token: string | undefined): string | null {
  if (!token) return null;

  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;

  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = sign(payload);
  // เทียบแบบ timing-safe — ความยาวต้องเท่ากันก่อนไม่งั้น timingSafeEqual จะ throw
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      phone?: string;
      exp?: number;
    };
    if (!data.phone || !data.exp || data.exp < Date.now()) return null;
    return data.phone;
  } catch {
    return null;
  }
}

/** อ่านเบอร์โทรของลูกค้าที่ล็อกอินอยู่ (ใช้ใน server component / route handler) */
export async function getSessionPhone(): Promise<string | null> {
  const store = await cookies();
  return readSessionToken(store.get(CUSTOMER_COOKIE)?.value);
}
