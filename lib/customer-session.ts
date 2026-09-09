import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * เซสชันลูกค้า — ผูกกับ "ตัวลูกค้า" ไม่ใช่เบอร์โทร
 *
 * เดิมเก็บเบอร์ไว้ใน token แล้วดึงการจองจากเบอร์
 * ปัญหาคือเบอร์เป็นสิ่งที่ใครก็พิมพ์ได้ พอใช้เป็นกุญแจเข้าระบบจึงเปิดช่องให้สวมรอย
 * ตอนนี้ตัวตนของลูกค้าคือบัญชี LINE (Customer.lineUserId เป็น unique)
 * เข้าสู่ระบบได้ทางเดียวคือ LINE Login ที่เซิร์ฟเวอร์ LINE ยืนยันให้ (ดู lib/line-login.ts)
 * เบอร์โทรเหลือสถานะเป็นข้อมูลติดต่อเท่านั้น
 */

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
export function createSessionToken(customerId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ cid: customerId, exp: Date.now() + SESSION_TTL_MS })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** คืน customerId ถ้า token ถูกต้องและยังไม่หมดอายุ */
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
      cid?: string;
      exp?: number;
    };
    if (!data.cid || !data.exp || data.exp < Date.now()) return null;
    return data.cid;
  } catch {
    return null;
  }
}

/** อ่าน id ของลูกค้าที่เข้าสู่ระบบอยู่ (ใช้ใน server component / route handler) */
export async function getSessionCustomerId(): Promise<string | null> {
  const store = await cookies();
  return readSessionToken(store.get(CUSTOMER_COOKIE)?.value);
}

/**
 * อ่านตัวลูกค้าที่เข้าสู่ระบบอยู่จากฐานข้อมูล
 * คืน null ถ้าคุกกี้ชี้ไปที่ลูกค้าที่ถูกลบไปแล้ว หรือถูกระงับ
 */
export async function getSessionCustomer() {
  const id = await getSessionCustomerId();
  if (!id) return null;

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer || customer.isBlacklisted) return null;
  return customer;
}
