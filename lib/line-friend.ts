import { LINE_OA_ID } from "@/lib/contact";

/**
 * บังคับจอง: ลูกค้าต้อง (1) เข้าสู่ระบบด้วย LINE และ (2) เป็นเพื่อนกับ LINE OA ของร้าน
 * เพราะทุกขั้นตอนหลังจอง (ยืนยันการจอง เตือนรับ-คืนรถ คืนเงินประกัน) ส่งทาง LINE
 * ถ้าไม่ได้แอดเพื่อน ร้านส่งข้อความหาไม่ได้เลย
 */

/** ลิงก์เพิ่มเพื่อน LINE OA — เปิดในแอป LINE ได้ทั้งมือถือและคอม */
export const LINE_ADD_FRIEND_URL = `https://line.me/R/ti/p/${encodeURIComponent(LINE_OA_ID)}`;

/**
 * เช็คว่าเป็นเพื่อนกับ OA หรือยัง ผ่าน Messaging API (ดึงโปรไฟล์ได้ = เป็นเพื่อนและไม่ได้บล็อก)
 * true = เป็นเพื่อน · false = ยังไม่แอด/บล็อก
 * "down" = LINE ขัดข้อง/ตอบช้า → ไม่รับจอง แสดงป๊อปอัปให้รอแล้วกลับมาใหม่
 * null = ไม่ได้ตั้ง LINE token (เครื่องทดสอบ) → ข้ามการเช็ค
 */
export async function isLineFriend(lineUserId: string): Promise<boolean | "down" | null> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !lineUserId) return null;
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return true;
    if (res.status === 404) return false;
    console.error("LINE friend check failed:", res.status);
    return "down";
  } catch (err) {
    console.error("LINE friend check error:", err);
    return "down";
  }
}

export const LINE_DOWN_MSG =
  "ขณะนี้ LINE ขัดข้อง ยังจองรถไม่ได้ กรุณารอสักครู่แล้วกลับมาจองใหม่อีกครั้ง";

export const NEED_LINE_MSG = "กรุณาเข้าสู่ระบบด้วย LINE ก่อนจองรถ";
export const NEED_FRIEND_MSG =
  "กรุณาเพิ่มเพื่อน LINE ของร้านก่อนจอง — ร้านจะแจ้งยืนยันการจองและนัดรับรถทาง LINE";
