/**
 * ค่าปรับและค่าบริการเพิ่มเติม — แหล่งข้อมูลเดียวของทั้งระบบ
 * แก้ที่นี่แล้วเปลี่ยนทุกที่: หน้า /fees, หน้าคู่มือ, ฟอร์มจอง และข้อความใน LINE
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

export const FEE_ITEMS: FeeItem[] = [
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

/** รายการที่ใช้แสดงแบบย่อในฟอร์มจองและในแชท LINE */
export function highlightFees(): FeeItem[] {
  return FEE_ITEMS.filter((f) => f.highlight);
}

/** ข้อความสรุปสำหรับส่งในแชท LINE */
export function feeSummaryText(siteUrl: string): string {
  const lines = highlightFees().map((f) => `• ${f.title} — ${f.amount}`);
  return [
    "⚠️ ค่าปรับที่พบบ่อย",
    "",
    ...lines,
    "",
    `เงินประกันความเสียหาย ${SECURITY_DEPOSIT.amount.toLocaleString()} บาท คืนเต็มจำนวนถ้าคืนรถเรียบร้อย`,
    "",
    `รายการทั้งหมด: ${siteUrl}/fees`,
  ].join("\n");
}
