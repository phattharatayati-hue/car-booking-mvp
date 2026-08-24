import crypto from "node:crypto";

/**
 * เข้ารหัสความลับก่อนเก็บลงฐานข้อมูล (ใช้กับ Google refresh token)
 *
 * คีย์มาจาก env `GOOGLE_TOKEN_ENC_KEY` — สร้างด้วย:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *
 * รูปแบบที่เก็บ: v1.<iv>.<authTag>.<ciphertext>  (base64url ทุกส่วน)
 */
const VERSION = "v1";

function key(): Buffer {
  const raw = process.env.GOOGLE_TOKEN_ENC_KEY;
  if (!raw) throw new Error("ยังไม่ได้ตั้ง GOOGLE_TOKEN_ENC_KEY");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error("GOOGLE_TOKEN_ENC_KEY ต้องเป็น base64 ของ 32 ไบต์");
  }
  return buf;
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [
    VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    enc.toString("base64url"),
  ].join(".");
}

export function decryptSecret(stored: string): string {
  const [v, ivB64, tagB64, dataB64] = stored.split(".");
  if (v !== VERSION || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("รูปแบบข้อมูลที่เข้ารหัสไม่ถูกต้อง");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(ivB64, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/** เซ็นข้อความสั้นๆ ด้วย AUTH_SECRET — ใช้กับ state ของ OAuth */
export function signState(payload: string): string {
  const secret = process.env.AUTH_SECRET ?? "";
  const mac = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${Buffer.from(payload, "utf8").toString("base64url")}.${mac}`;
}

/** ตรวจ state — คืน payload ถ้าถูกต้อง ไม่ถูกคืน null (เทียบแบบ timing-safe) */
export function verifyState(state: string): string | null {
  const [dataB64, mac] = state.split(".");
  if (!dataB64 || !mac) return null;
  const payload = Buffer.from(dataB64, "base64url").toString("utf8");
  const expected = crypto
    .createHmac("sha256", process.env.AUTH_SECRET ?? "")
    .update(payload)
    .digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return payload;
}
