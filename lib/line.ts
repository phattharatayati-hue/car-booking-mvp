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

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * ตอบกลับด้วยข้อความรูปแบบอิสระ (Flex / quick reply) — ฟรีเหมือน replyMessage
 */
export async function replyRaw(replyToken: string, messages: any[]) {
  if (!token()) return;

  try {
    const res = await fetch(`${LINE_API}/message/reply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token()}`,
      },
      body: JSON.stringify({ replyToken, messages: messages.slice(0, 5) }),
    });
    if (!res.ok) {
      console.error("LINE replyRaw failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("LINE replyRaw error:", err);
  }
}

/** ดึงชื่อผู้ใช้จากโปรไฟล์ LINE (ใช้เป็นชื่อผู้เช่าตอนจองในแชท) */
export async function getProfileName(userId: string): Promise<string | null> {
  if (!token()) return null;

  try {
    const res = await fetch(`${LINE_API}/profile/${userId}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { displayName?: string };
    return data.displayName ?? null;
  } catch (err) {
    console.error("LINE profile error:", err);
    return null;
  }
}

/** ดาวน์โหลดรูปที่ลูกค้าส่งมาในแชท (ใช้รับสลิปมัดจำ) */
export async function getMessageContent(
  messageId: string
): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
  if (!token()) return null;

  try {
    const res = await fetch(
      `https://api-data.line.me/v2/bot/message/${messageId}/content`,
      { headers: { Authorization: `Bearer ${token()}` } }
    );
    if (!res.ok) {
      console.error("LINE content failed:", res.status);
      return null;
    }
    return {
      buffer: await res.arrayBuffer(),
      contentType: res.headers.get("content-type") ?? "image/jpeg",
    };
  } catch (err) {
    console.error("LINE content error:", err);
    return null;
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

/**
 * ส่งข้อความรูปแบบอิสระ (Flex / ปุ่ม) หาผู้ใช้ — คิดโควตาเหมือน pushMessage
 */
export async function pushRaw(to: string, messages: any[]) {
  if (!token() || !to) return;

  try {
    const res = await fetch(`${LINE_API}/message/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token()}`,
      },
      body: JSON.stringify({ to, messages: messages.slice(0, 5) }),
    });
    if (!res.ok) {
      console.error("LINE pushRaw failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("LINE pushRaw error:", err);
  }
}

/**
 * LINE ID จาก environment variable (ใช้เป็นตัวสำรอง)
 *
 * LINE_ADMIN_USER_ID รองรับหลายคน คั่นด้วยจุลภาค เช่น
 *   Uaaa...,Ubbb...,Uccc...
 *
 * ถ้าใส่ ID ของกลุ่ม (ขึ้นต้นด้วย C) ก็ส่งเข้ากลุ่มได้เหมือนกัน
 * แต่ต้องเปิด "Allow bot to join group chats" ใน LINE Developers Console ก่อน
 */
export function adminIdsFromEnv(): string[] {
  return (process.env.LINE_ADMIN_USER_ID ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

/**
 * รวมรายชื่อผู้รับแจ้งเตือน = แอดมินในฐานข้อมูลที่ผูก LINE ไว้ + ค่าจาก env
 * (ถ้าซ้ำกันจะส่งครั้งเดียว)
 */
export async function adminIds(): Promise<string[]> {
  const ids = new Set(adminIdsFromEnv());

  try {
    const { prisma } = await import("@/lib/prisma");
    const admins = await prisma.adminUser.findMany({
      where: { lineUserId: { not: null } },
      select: { lineUserId: true },
    });
    for (const a of admins as { lineUserId: string | null }[]) {
      if (a.lineUserId) ids.add(a.lineUserId.trim());
    }
  } catch (err) {
    // อ่านฐานข้อมูลไม่ได้ก็ยังส่งตาม env ได้
    console.error("load admin line ids failed:", err);
  }

  return [...ids].filter(Boolean);
}

export async function notifyAdmin(text: string) {
  const ids = await adminIds();
  if (ids.length === 0) return;

  // ส่งพร้อมกัน — คนใดคนหนึ่งพังต้องไม่กระทบคนอื่น
  await Promise.all(
    ids.map((id) =>
      pushMessage(id, text).catch((err) => console.error(`push to ${id} failed:`, err))
    )
  );
}

/** แจ้งแอดมินด้วยข้อความ Flex — ใช้แทน notifyAdmin สำหรับการ์ดทุกใบ */
export async function notifyAdminRaw(message: any) {
  const ids = await adminIds();
  if (ids.length === 0) return;

  await Promise.all(
    ids.map((id) =>
      pushRaw(id, [message]).catch((err) => console.error(`push to ${id} failed:`, err))
    )
  );
}

/* ข้อความแบบตัวอักษรล้วนถูกแทนด้วยการ์ด Flex ทั้งหมดแล้ว — ดู lib/line-flex.ts
   ฟังก์ชัน buildNewBookingMessage / buildCustomerBookingMessage / buildSlipUploadedMessage
   ถูกถอดออกเพราะไม่มีใครเรียกแล้ว ถ้าต้องการข้อความล้วนให้ใช้ pushMessage ตรงๆ */

/** URL ของเว็บ ใช้ตอนแนบลิงก์ในข้อความ */
export function siteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "https://car-booking-mvp.vercel.app";
}
