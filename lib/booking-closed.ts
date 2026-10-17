/**
 * สวิตช์ปิดรับจองใหม่ — ปิดอยู่เป็นค่าเริ่มต้น
 * จะเปิดรับจองอีกครั้งให้ตั้ง env BOOKING_OPEN=1 แล้ว redeploy
 * (การจองที่แอดมินสร้างเองจากหลังบ้านไม่ถูกบล็อก)
 */
export const BOOKING_CLOSED = process.env.BOOKING_OPEN !== "1";

export const BOOKING_CLOSED_MESSAGE =
  "ขออภัยครับ ขณะนี้ปิดรับจองรถใหม่ชั่วคราว ขอบคุณที่ใช้บริการครับ";

export function bookingClosedResponse() {
  return Response.json({ error: BOOKING_CLOSED_MESSAGE }, { status: 403 });
}
