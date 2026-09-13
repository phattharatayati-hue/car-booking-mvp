import { prisma } from "@/lib/prisma";
import { pushRaw, siteUrl } from "@/lib/line";
import { flexReturnComplete } from "@/lib/line-flex";
import { getSettings } from "@/lib/settings";
import { securityDepositOf } from "@/lib/car-money";
import { LINE_OA_ID } from "@/lib/contact";

/**
 * ลิงก์เปิดแชท LINE OA พร้อมข้อความตั้งต้นให้ลูกค้าแค่กดส่ง
 *
 * ไม่ได้พาไปหน้ารีวิวสาธารณะ เพราะร้านเก็บรีวิวผ่าน LINE OA เอง
 * ลูกค้าจะได้ไม่ต้องออกจากแอปไปไหน และร้านได้ข้อความในแชทที่ตอบกลับต่อได้จริง
 */
export function reviewUrl(): string {
  const text = encodeURIComponent(
    "รีวิวการใช้บริการ:\n(ให้กี่ดาว และอยากบอกอะไรกับร้าน พิมพ์ต่อได้เลยครับ)"
  );
  return `https://line.me/R/oaMessage/${LINE_OA_ID}/?${text}`;
}

/**
 * ปิดการเช่า: สร้างรายการคืนเงินประกัน แล้วส่งข้อความสุดท้ายให้ลูกค้า
 *
 * เรียกจากสองที่ที่ปิดงาน "รับรถคืน" ได้ — ลิงก์งานของคนขับ และหน้า /admin/schedule
 * จึงต้องกันทำซ้ำเอง ใช้ returnNotifiedAt เป็นธง และ upsert แถวคืนเงิน
 * ส่ง LINE ไม่สำเร็จต้องไม่ทำให้การปิดงานพัง — คนขับยืนรออยู่หน้างาน
 */
export async function completeReturn(bookingId: string): Promise<void> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { car: true, customer: true, refund: true },
    });
    if (!booking) return;

    const settings = await getSettings();
    /* เงินประกันของรถคันนั้น ไม่ใช่ค่ากลางเสมอไป — รถหรูบางคันเก็บ 5,000
       ต้องคืนเท่าที่เก็บจริง ไม่งั้นลูกค้าได้คืนน้อยกว่าที่จ่ายมา */
    const deposit = securityDepositOf(booking.car, settings);

    // สร้างรายการคืนเงินไว้เสมอ แม้ลูกค้าไม่ได้ผูก LINE — แอดมินจะได้เห็นในหน้าคืนเงิน
    // และโทรถามเลขบัญชีเองได้ ไม่ใช่หายไปเฉย ๆ
    if (!booking.refund) {
      await prisma.depositRefund.create({
        data: { bookingId, depositAmount: deposit },
      });
    }

    if (booking.returnNotifiedAt) return;
    if (!booking.customer.lineUserId) return;

    await pushRaw(booking.customer.lineUserId, [
      flexReturnComplete({
        bookingId,
        carLabel: `${booking.car.brand} ${booking.car.name}`,
        plate: booking.car.licensePlate,
        refundAmount: deposit,
        reviewedHours: settings.refundReviewedHours,
        normalHours: settings.refundNormalHours,
        openHour: settings.refundOpenHour,
        closeHour: settings.refundCloseHour,
        reviewUrl: reviewUrl(),
        refundUrl: `${siteUrl()}/booking/${bookingId}/refund`,
      }),
    ]);

    await prisma.booking.update({
      where: { id: bookingId },
      data: { returnNotifiedAt: new Date() },
    });
  } catch (err) {
    console.error("completeReturn failed:", err);
  }
}
