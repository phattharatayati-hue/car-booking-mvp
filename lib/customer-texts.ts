/**
 * ข้อความ LINE แบบตัวหนังสือที่แอดมินกดส่งจากหลังบ้าน
 *
 * เดิมพิมพ์ไว้ในหน้า app/admin/bookings/page.tsx ตรง ๆ — ย้ายมารวมที่นี่
 * เพื่อให้หน้าตัวอย่างข้อความ (/admin/notifications) ใช้ข้อความชุดเดียวกับที่ส่งจริง
 * แก้ถ้อยคำที่นี่ที่เดียว ทั้งข้อความจริงและตัวอย่างเปลี่ยนพร้อมกัน
 *
 * ทุกฟังก์ชันคืนข้อความล้วน — ตอนส่ง lib/line.ts แปลงเป็นการ์ด Flex ให้เอง
 * (บรรทัดแรกเป็นหัวการ์ด อีโมจินำหน้ากำหนดสี ลิงก์กลายเป็นปุ่ม)
 */
import { formatBangkokDateTime } from "@/lib/settings";

const code = (id: string) => id.slice(0, 8).toUpperCase();

/** เอกสารลูกค้าไม่ผ่าน */
export function documentRejectedText(d: {
  documentLabel: string;
  reason: string;
  bookingUrl: string;
}): string {
  return [
    "⚠️ เอกสารไม่ผ่านการตรวจสอบ",
    "",
    `เอกสาร: ${d.documentLabel}`,
    `เหตุผล: ${d.reason}`,
    "",
    "กรุณาถ่ายใหม่แล้วอัปโหลดอีกครั้งครับ",
    d.bookingUrl,
  ].join("\n");
}

/** สลิปค่าจองไม่ผ่าน */
export function slipRejectedText(d: { bookingId: string; bookingUrl: string }): string {
  return [
    "⚠️ สลิปค่าจองไม่ผ่านการตรวจสอบ",
    "",
    `รหัสจอง: ${code(d.bookingId)}`,
    "",
    "กรุณาติดต่อแอดมินเพื่อตรวจสอบอีกครั้ง",
    d.bookingUrl,
  ].join("\n");
}

/** รถพาร์ทเนอร์ว่าง — อนุมัติคำขอจอง */
export function requestApprovedText(d: {
  carLabel: string;
  start: Date;
  end: Date;
  total: number;
  bookingFee: number;
  bookingUrl: string;
}): string {
  return [
    "✅ รถว่าง! ยืนยันคำขอจองแล้ว",
    "",
    `รถ: ${d.carLabel}`,
    `รับรถ: ${formatBangkokDateTime(d.start)}`,
    `คืนรถ: ${formatBangkokDateTime(d.end)}`,
    `ยอดรวม: ${d.total.toLocaleString()} บาท`,
    "",
    `กรุณาโอนค่าจอง ${d.bookingFee.toLocaleString()} บาท`,
    "แล้วแนบสลิปและอัปโหลดเอกสารที่ลิงก์นี้ครับ",
    "",
    d.bookingUrl,
  ].join("\n");
}

/** รถพาร์ทเนอร์ไม่ว่าง — ปฏิเสธคำขอจอง */
export function requestRejectedText(d: { carLabel: string; start: Date }): string {
  return [
    "😔 ขออภัย รถไม่ว่างในช่วงที่ขอ",
    "",
    `รถ: ${d.carLabel}`,
    `รับรถ: ${formatBangkokDateTime(d.start)}`,
    "",
    "เจ้าของรถแจ้งว่ารถไม่ว่างในช่วงเวลานี้",
    'พิมพ์ "จองรถ" เพื่อเลือกรถคันอื่นหรือวันอื่นได้เลยครับ',
  ].join("\n");
}

/** เปลี่ยนรถให้ลูกค้า */
export function carSwappedText(d: {
  oldLabel: string;
  newLabel: string;
  reasonLabel: string;
  /** ยอดใหม่ — null คือยอดเท่าเดิม */
  newTotal: number | null;
  bookingUrl: string;
}): string {
  return [
    "🚗 แจ้งเปลี่ยนรถสำหรับการจองของคุณ",
    "",
    `จากเดิม: ${d.oldLabel}`,
    `เปลี่ยนเป็น: ${d.newLabel}`,
    `เหตุผล: ${d.reasonLabel}`,
    d.newTotal != null ? `ยอดค่าเช่าใหม่: ${d.newTotal.toLocaleString()} บาท` : "ยอดค่าเช่าเท่าเดิม",
    "",
    `ดูรายละเอียด: ${d.bookingUrl}`,
  ].join("\n");
}
