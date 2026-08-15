import crypto from "crypto";

const LINE_API = "https://api.line.me/v2/bot";

function token() {
  return process.env.LINE_CHANNEL_ACCESS_TOKEN;
}

/**
 * ตรวจสอบว่า request มาจาก LINE จริง (ป้องกันคนอื่นยิง webhook ปลอม)
 */
export function verifyLineSignature(body: string, signature: string | null): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;

  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * ตอบกลับข้อความ — ไม่คิดโควตา ใช้ได้ไม่จำกัด
 * ใช้ได้เฉพาะภายใน ~1 นาทีหลังลูกค้าทักมา และใช้ replyToken ได้ครั้งเดียว
 */
export async function replyMessage(replyToken: string, text: string) {
  if (!token()) return;

  try {
    const res = await fetch(`${LINE_API}/message/reply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token()}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: "text", text: text.slice(0, 4900) }],
      }),
    });
    if (!res.ok) {
      console.error("LINE reply failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("LINE reply error:", err);
  }
}

/**
 * ส่งข้อความหาผู้ใช้ — คิดโควตา ใช้เท่าที่จำเป็น
 */
export async function pushMessage(to: string, text: string) {
  if (!token() || !to) return;

  try {
    const res = await fetch(`${LINE_API}/message/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token()}`,
      },
      body: JSON.stringify({
        to,
        messages: [{ type: "text", text: text.slice(0, 4900) }],
      }),
    });
    if (!res.ok) {
      console.error("LINE push failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("LINE push error:", err);
  }
}

/** ส่งหาแอดมิน (ถ้าตั้งค่า LINE_ADMIN_USER_ID ไว้) */
export async function notifyAdmin(text: string) {
  const adminId = process.env.LINE_ADMIN_USER_ID;
  if (!adminId) return;
  await pushMessage(adminId, text);
}

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function buildNewBookingMessage(data: {
  bookingId: string;
  carLabel: string;
  customerName: string;
  phone: string;
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  siteUrl: string;
}) {
  return [
    "🚗 มีการจองใหม่",
    "",
    `รถ: ${data.carLabel}`,
    `ลูกค้า: ${data.customerName}`,
    `เบอร์: ${data.phone}`,
    `วันที่: ${fmtDate(data.startDate)} - ${fmtDate(data.endDate)}`,
    `ยอดรวม: ${data.totalPrice.toLocaleString()} บาท`,
    `รหัสจอง: ${data.bookingId.slice(0, 8).toUpperCase()}`,
    "",
    "สถานะ: รอลูกค้าโอนมัดจำ",
    `${data.siteUrl}/admin/bookings`,
  ].join("\n");
}

export function buildSlipUploadedMessage(data: {
  bookingId: string;
  carLabel: string;
  customerName: string;
  amount: number;
  siteUrl: string;
}) {
  return [
    "💰 ลูกค้าอัปโหลดสลิปมัดจำแล้ว",
    "",
    `รถ: ${data.carLabel}`,
    `ลูกค้า: ${data.customerName}`,
    `ยอดที่แจ้ง: ${data.amount.toLocaleString()} บาท`,
    `รหัสจอง: ${data.bookingId.slice(0, 8).toUpperCase()}`,
    "",
    "กรุณาตรวจสอบและยืนยัน",
    `${data.siteUrl}/admin/bookings`,
  ].join("\n");
}

/** URL ของเว็บ ใช้ตอนแนบลิงก์ในข้อความ */
export function siteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "https://car-booking-mvp.vercel.app";
}
