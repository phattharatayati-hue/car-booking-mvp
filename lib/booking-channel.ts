/**
 * จองมาจากช่องทางไหน — แสดงในหลังบ้าน
 *
 * WEB       หน้าเว็บ /cars/<id>/book
 * LIFF      ปฏิทินจองที่เปิดในแอป LINE (/line/book)
 * LINE_CHAT ขั้นตอนถาม-ตอบในแชท LINE
 * ADMIN     แอดมินสร้างใบให้เอง (ลูกค้าโทร/ทักมา)
 *
 * ใบเก่าที่สร้างก่อนมีคอลัมน์นี้เป็น null — เดาเท่าที่รู้: มีแอดมินสร้าง = ADMIN
 * นอกนั้นแสดง "ไม่ทราบช่องทาง"
 */
export type BookingChannel = "WEB" | "LIFF" | "LINE_CHAT" | "ADMIN";

export function channelOf(b: {
  channel?: string | null;
  createdByAdminUserId?: string | null;
}): BookingChannel | null {
  if (b.channel === "WEB" || b.channel === "LIFF" || b.channel === "LINE_CHAT" || b.channel === "ADMIN") {
    return b.channel;
  }
  return b.createdByAdminUserId ? "ADMIN" : null;
}

export const CHANNEL_LABEL: Record<BookingChannel, string> = {
  WEB: "จองผ่านเว็บ",
  LIFF: "จองผ่าน LINE (ปฏิทิน)",
  LINE_CHAT: "จองผ่านแชท LINE",
  ADMIN: "แอดมินสร้างให้",
};

export const CHANNEL_CLASS: Record<BookingChannel, string> = {
  WEB: "bg-sky-50 text-sky-700 border-sky-200",
  LIFF: "bg-emerald-50 text-emerald-700 border-emerald-200",
  LINE_CHAT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ADMIN: "bg-violet-50 text-violet-700 border-violet-200",
};
