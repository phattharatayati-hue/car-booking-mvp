import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

/**
 * กันคิวรถไว้ชั่วคราวให้คนที่เพิ่งกดจอง แล้วปล่อยคืนถ้าไม่โอน
 *
 * ที่มา: เมื่อก่อนระบบยิง LINE ทันทีที่กดจอง ทำให้คนจองเล่นกินโควตาข้อความ
 * และมีคนส่งรูปบัตรประชาชนเข้ามาทั้งที่ไม่ได้ตั้งใจเช่า
 * กติกาใหม่คือ "ต้องอัปสลิปค่าจองก่อน" ทุกอย่างจึงจะเดินต่อ
 *
 * ใบจองที่ยังไม่มีสลิปจะถือครองคิวรถได้แค่ holdMinutes นาที (ตั้งที่ /admin/settings)
 * พ้นจากนั้นระบบยกเลิกให้เอง รถกลับมาว่างให้คนอื่นจองได้
 *
 * ทำไมไม่ใช้ cron: Vercel Hobby รัน cron ได้วันละครั้ง ซึ่งหยาบเกินไปสำหรับ 30 นาที
 * จึงใช้วิธี "กวาดตอนมีคนเข้ามาใช้งาน" แทน — เรียก sweepUnpaidHolds() ก่อนงานที่
 * ต้องเห็นคิวรถล่าสุด (สร้างการจอง, ดูปฏิทินว่าง, เปิดหน้าหลังบ้าน)
 */

/** ใบจองที่ยังไม่มีสลิปและหมดเวลากันคิวแล้ว */
export function expiredUnpaidWhere(holdMinutes: number) {
  const cutoff = new Date(Date.now() - holdMinutes * 60000);
  return {
    status: "PENDING_DEPOSIT" as const,
    deposit: { is: null },
    createdAt: { lt: cutoff },
  };
}

/** ใบจองที่ยังไม่มีสลิปแต่ยังอยู่ในเวลากันคิว — ใช้โชว์ให้แอดมินเห็นว่ามีคนกำลังโอน */
export function waitingForSlipWhere() {
  return {
    status: "PENDING_DEPOSIT" as const,
    deposit: { is: null },
  };
}

/**
 * ยกเลิกใบจองที่หมดเวลารอสลิป — ปลอดภัยถ้าถูกเรียกซ้ำหรือเรียกพร้อมกันหลายที่
 * คืนจำนวนใบที่เพิ่งถูกยกเลิกรอบนี้
 */
export async function sweepUnpaidHolds(holdMinutes?: number): Promise<number> {
  try {
    const minutes = holdMinutes ?? (await getSettings()).holdMinutes;
    if (minutes <= 0) return 0;

    const { count } = await prisma.booking.updateMany({
      where: expiredUnpaidWhere(minutes),
      data: {
        status: "CANCELLED",
        // เขียนลง cancelReason ไม่ใช่ adminNote — adminNote เป็นที่ของแอดมิน
        // ถ้าเขียนทับ บันทึกที่แอดมินพิมพ์ไว้เองจะหายเงียบ ๆ
        cancelReason: `ไม่ได้อัปสลิปค่าจองภายใน ${minutes} นาที`,
      },
    });
    return count;
  } catch (err) {
    // การกวาดล้มเหลวต้องไม่ทำให้หน้าที่เรียกมันพัง
    console.error("sweepUnpaidHolds failed:", err);
    return 0;
  }
}

/** เหลือเวลาอีกกี่นาทีก่อนใบจองนี้จะถูกยกเลิก (ติดลบ = เลยเวลาแล้ว) */
export function minutesLeftToPay(createdAt: Date, holdMinutes: number): number {
  const deadline = createdAt.getTime() + holdMinutes * 60000;
  return Math.ceil((deadline - Date.now()) / 60000);
}

/** ข้อความบอกลูกค้าว่าต้องโอนภายในกี่นาที */
export function holdNotice(holdMinutes: number): string {
  return `กรุณาโอนค่าจองและอัปสลิปภายใน ${holdMinutes} นาที มิฉะนั้นระบบจะยกเลิกการจองอัตโนมัติเพื่อปล่อยคิวรถให้ลูกค้าท่านอื่น`;
}
