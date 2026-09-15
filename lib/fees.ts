/**
 * ค่าปรับและค่าบริการเพิ่มเติม — ชนิดข้อมูลและ "ค่าตั้งต้น"
 *
 * ของจริงที่ใช้แสดงมาจากตาราง FeeItem ในฐานข้อมูล แก้ได้จากหลังบ้าน /admin/fees
 * อ่านผ่าน lib/fees-server.ts (`getFeeItems()` / `getHighlightFees()`) เท่านั้น
 *
 * รายการในไฟล์นี้เหลือไว้ 2 หน้าที่:
 *   1. เป็นข้อมูลตั้งต้นให้ `npx tsx prisma/seed-fees.ts` ใส่ลงฐานข้อมูลครั้งแรก
 *   2. เป็นตัวสำรองเวลาตารางยังว่าง — หน้าเว็บจะไม่ว่างเปล่าถ้ายังไม่ได้ seed
 *
 * ห้าม import FEE_ITEMS ไปแสดงผลตรง ๆ เพราะจะไม่เห็นราคาที่แอดมินแก้
 */

export type FeeIconKey =
  | "smoke"
  | "tar"
  | "dirty"
  | "key"
  | "keyService"
  | "unlock"
  | "fuel"
  | "tow"
  | "ticket"
  | "earlyReturn"
  | "collision";

export type FeeItem = {
  icon: FeeIconKey;
  title: string;
  amount: string;
  note?: string;
  /** รายการที่อยากให้ลูกค้าเห็นตอนกดจอง (สรุปย่อ) */
  highlight?: boolean;
};

export const DEFAULT_FEE_ITEMS: FeeItem[] = [
  {
    icon: "smoke",
    title: "สูบบุหรี่ในรถ",
    amount: "3,000 บาท",
    note: "รวมบุหรี่ไฟฟ้า — กลิ่นติดเบาะต้องอบทำความสะอาดทั้งคัน",
    highlight: true,
  },
  {
    icon: "tar",
    title: "คราบยางมะตอย",
    amount: "500 – 1,000 บาท",
    note: "ตามพื้นที่ที่ต้องขัดออก",
  },
  {
    icon: "dirty",
    title: "อาเจียน / คราบสกปรก",
    amount: "1,000 – 3,000 บาท",
    note: "ตามความยากในการทำความสะอาด",
    highlight: true,
  },
  {
    icon: "key",
    title: "กุญแจหาย (ทั้งชุด)",
    amount: "3,000 – 10,000 บาท",
    note: "ราคาต่างกันตามรุ่นรถ กุญแจรีโมทราคาสูงกว่ากุญแจธรรมดา",
    highlight: true,
  },
  {
    icon: "keyService",
    title: "กุญแจหาย — ค่าบริการเริ่มต้น",
    amount: "500 บาท",
    note: "ค่าเดินทางไปดำเนินการ คิดแยกจากค่ากุญแจ",
  },
  {
    icon: "unlock",
    title: "ค่าบริการเปิดรถ",
    amount: "เริ่มต้น 500 บาท",
    note: "กรณีลืมกุญแจไว้ในรถ หรือกุญแจหาย",
  },
  {
    icon: "fuel",
    title: "ค่าบริการน้ำมัน",
    amount: "300 – 3,000 บาท",
    note: "กรณีไม่เติมน้ำมันคืนตามระดับที่รับไป",
    highlight: true,
  },
  {
    icon: "tow",
    title: "ค่าบริการรถลาก",
    amount: "เริ่มต้น 2,000 บาท",
    note: "ยางแตก ยางรั่ว หรืออุบัติเหตุ",
  },
  {
    icon: "ticket",
    title: "ค่าบริการชำระค่าปรับตามใบสั่ง",
    amount: "300 บาท",
    note: "คิดแยกจากค่าปรับจริงที่ต้องจ่ายให้เจ้าหน้าที่",
  },
  {
    icon: "earlyReturn",
    title: "คืนรถก่อนกำหนด",
    amount: "ไม่คืนเงินทุกกรณี",
    note: "ค่าเช่าคิดตามช่วงที่จองไว้",
    highlight: true,
  },
  {
    icon: "collision",
    title: "ค่าเสียหายส่วนแรก",
    amount: "3,000 บาท",
    note: "กรณีเป็นฝ่ายผิด หรือไม่มีคู่กรณี",
    highlight: true,
  },
];

export const SECURITY_DEPOSIT = {
  amount: 3000,
  conditions: [
    "คืนรถในสภาพเรียบร้อย ไม่มีความเสียหายเพิ่มเติม",
    "เติมน้ำมันคืนตามระดับที่รับไป",
    "ไม่มีค่าปรับหรือใบสั่งค้างชำระ",
  ],
};

export const FEE_TERMS = [
  "ค่าปรับข้างต้นเป็นอัตราเริ่มต้น อาจเปลี่ยนแปลงตามรุ่นรถและระดับความเสียหาย",
  "บริษัทฯ ขอสงวนสิทธิ์ในการประเมินความเสียหายตามความเป็นจริง",
  "การตัดสินของบริษัทฯ ถือเป็นที่สิ้นสุด",
];

/** ชื่อไอคอนทั้งหมดที่เลือกได้ในหลังบ้าน พร้อมคำอธิบายภาษาไทย */
export const FEE_ICON_CHOICES: { key: FeeIconKey; label: string }[] = [
  { key: "smoke", label: "บุหรี่" },
  { key: "tar", label: "คราบยางมะตอย" },
  { key: "dirty", label: "คราบสกปรก" },
  { key: "key", label: "กุญแจ" },
  { key: "keyService", label: "บริการเรื่องกุญแจ" },
  { key: "unlock", label: "เปิดรถ" },
  { key: "fuel", label: "น้ำมัน" },
  { key: "tow", label: "รถลาก" },
  { key: "ticket", label: "ใบสั่ง" },
  { key: "earlyReturn", label: "คืนรถก่อนกำหนด" },
  { key: "collision", label: "อุบัติเหตุ" },
];

/** ชื่อไอคอนที่แอดมินกรอกมาใช้ได้จริงไหม — กันค่าแปลกปลอมจากฐานข้อมูล */
export function isFeeIconKey(v: string): v is FeeIconKey {
  return FEE_ICON_CHOICES.some((c) => c.key === v);
}
