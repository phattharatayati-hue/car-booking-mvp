/**
 * ภาษาของหน้าลูกค้า (ไทย/อังกฤษ) — ส่วนที่ใช้ได้ทั้งฝั่งเซิร์ฟเวอร์และเบราว์เซอร์
 *
 * ไฟล์นี้ต้องไม่ import next/headers หรืออะไรที่ใช้ได้แต่ฝั่งเซิร์ฟเวอร์
 * เพราะคอมโพเนนต์ฝั่งเบราว์เซอร์ (LangToggle) ต้อง import ชื่อคุกกี้จากที่นี่
 * ถ้าปนกัน Next จะฟ้อง "This API is only available in Server Components"
 * ตัวอ่านคุกกี้ฝั่งเซิร์ฟเวอร์อยู่ที่ lib/locale-server.ts
 *
 * ทำไมใช้คุกกี้ ไม่ใช่ /en/... ในเส้นทาง
 *   ลิงก์ที่ส่งออกไปทาง LINE และอีเมลใช้เส้นทางเดิมอยู่แล้ว เช่น /booking/<id>
 *   ถ้าย้ายไปเป็น /th/booking/<id> ลิงก์เก่าทั้งหมดจะพัง
 *
 * หลังบ้านไม่ใช้ระบบนี้ — ใช้ไทยตายตัว เพราะทีมงานเป็นคนไทยทั้งหมด
 */
export type Lang = "th" | "en";

export const LANG_COOKIE = "phuping-lang";

/** แปลงค่าดิบจากคุกกี้ให้เป็นภาษาที่รองรับ ค่าอื่นถือเป็นไทย */
export function toLang(raw: string | undefined | null): Lang {
  return raw === "en" ? "en" : "th";
}
