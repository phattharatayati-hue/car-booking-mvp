import { prisma } from "@/lib/prisma";
import { pushRaw, siteUrl } from "@/lib/line";
import { flexReturnComplete } from "@/lib/line-flex";
import { getSettings } from "@/lib/settings";
import { FACEBOOK_REVIEW_URL, forLineBrowser } from "@/lib/contact";

/**
 * ลิงก์ให้ลูกค้าไปรีวิวที่เพจเฟซบุ๊กของร้าน
 *
 * เลือกเพจแทนการตอบในแชท เพราะรีวิวบนเพจคนนอกเห็น ช่วยให้ลูกค้าใหม่ตัดสินใจ
 * ส่วนความเห็นที่อยากบอกร้านตรง ๆ ลูกค้าพิมพ์ในแชทได้อยู่แล้วโดยไม่ต้องมีปุ่ม
 *
 * `inLine` = ลิงก์ที่ส่งในแชท LINE ต้องบังคับเปิดเบราว์เซอร์ของเครื่อง
 * ไม่งั้นเฟซบุ๊กในเบราว์เซอร์ของ LINE จะขอให้ล็อกอินใหม่แล้วลูกค้าเลิกกลางทาง
 */
export function reviewUrl(inLine = false): string {
  return inLine ? forLineBrowser(FACEBOOK_REVIEW_URL) : FACEBOOK_REVIEW_URL;
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

    // สร้างรายการคืนเงินไว้เสมอ แม้ลูกค้าไม่ได้ผูก LINE — แอดมินจะได้เห็นในหน้าคืนเงิน
    // และโทรถามเลขบัญชีเองได้ ไม่ใช่หายไปเฉย ๆ
    if (!booking.refund) {
      await prisma.depositRefund.create({
        data: { bookingId, depositAmount: settings.securityDeposit },
      });
    }

    if (booking.returnNotifiedAt) return;
    if (!booking.customer.lineUserId) return;

    await pushRaw(booking.customer.lineUserId, [
      flexReturnComplete({
        bookingId,
        carLabel: `${booking.car.brand} ${booking.car.name}`,
        plate: booking.car.licensePlate,
        refundAmount: settings.securityDeposit,
        reviewedHours: settings.refundReviewedHours,
        normalHours: settings.refundNormalHours,
        openHour: settings.refundOpenHour,
        closeHour: settings.refundCloseHour,
        reviewUrl: reviewUrl(true),
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
