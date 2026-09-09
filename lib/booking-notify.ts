import { prisma } from "@/lib/prisma";
import { pushRaw, siteUrl } from "@/lib/line";
import { flexDepositConfirmed, flexReadyForPickup } from "@/lib/line-flex";
import { getSettings } from "@/lib/settings";
import { DOCUMENT_KINDS, DOCUMENT_LABEL, type DocumentKind } from "@/lib/documents";
import { highlightFees } from "@/lib/fees";

/**
 * แจ้งลูกค้าทาง LINE "ครั้งเดียว" เมื่อการจองพร้อมรับรถ
 *
 * แอดมินต้องทำสองอย่างคือตรวจสลิปและตรวจเอกสาร ซึ่งมักทำคนละจังหวะ
 * ฟังก์ชันนี้ถูกเรียกจากทั้งสองที่ แล้วตัดสินใจเองว่าถึงเวลาส่งหรือยัง
 * ลูกค้าจึงได้ข้อความสรุปฉบับเดียว ไม่ใช่สามข้อความไล่กันมา
 *
 * เงื่อนไข
 *   สลิปยังไม่ผ่าน            → ไม่ส่ง (ลูกค้าได้ข้อความตอนจองไปแล้ว)
 *   สลิปผ่าน + เอกสารครบ      → ส่งฉบับเต็ม แล้วปักธง readyNotifiedAt
 *   สลิปผ่าน + เอกสารไม่ครบ   → ส่งฉบับสั้นบอกว่าขาดอะไร ปักธง depositNotifiedAt
 *                               พอเอกสารครบภายหลังจึงส่งฉบับเต็มตามไป
 */
export async function notifyBookingProgress(bookingId: string): Promise<void> {
  try {
    const b = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { car: true, customer: true, deposit: true, documents: true },
    });
    if (!b?.customer.lineUserId) return;

    const slipOk = b.deposit?.status === "CONFIRMED" || b.status === "CONFIRMED";
    if (!slipOk) return;

    const approved = new Set(
      b.documents.filter((d) => d.status === "APPROVED").map((d) => d.kind)
    );
    const missing = DOCUMENT_KINDS.filter((k) => !approved.has(k));
    const link = `${siteUrl()}/booking/${b.id}`;

    // เอกสารยังไม่ครบ — บอกให้ชัดว่าขาดอะไร แล้วรอส่งฉบับเต็มทีหลัง
    if (missing.length > 0) {
      if (b.depositNotifiedAt || b.readyNotifiedAt) return;

      await pushRaw(b.customer.lineUserId, [
        flexDepositConfirmed({
          bookingId: b.id,
          missing: missing.map((k) => DOCUMENT_LABEL[k as DocumentKind]),
          bookingUrl: link,
        }),
      ]);

      await prisma.booking.update({
        where: { id: b.id },
        data: { depositNotifiedAt: new Date() },
      });
      return;
    }

    // ครบทั้งสองอย่างแล้ว — ส่งฉบับเต็มครั้งเดียวจบ
    if (b.readyNotifiedAt) return;

    const settings = await getSettings();
    const paid = b.deposit?.amount ?? settings.bookingFee;
    const rentalBalance = Math.max(0, b.totalPrice - paid);
    const dueOnPickup = rentalBalance + settings.securityDeposit;

    await pushRaw(b.customer.lineUserId, [
      flexReadyForPickup({
        bookingId: b.id,
        carLabel: `${b.car.brand} ${b.car.name}`,
        plate: b.car.licensePlate,
        start: b.startDate,
        end: b.endDate,
        total: b.totalPrice,
        paid,
        rentalBalance,
        securityDeposit: settings.securityDeposit,
        dueOnPickup,
        fees: highlightFees().map((f) => ({ title: f.title, amount: f.amount })),
        feesUrl: `${siteUrl()}/fees`,
        bookingUrl: link,
      }),
    ]);

    await prisma.booking.update({
      where: { id: b.id },
      data: { readyNotifiedAt: new Date() },
    });
  } catch (err) {
    // แจ้งเตือนล้มเหลวต้องไม่ทำให้งานหลักของแอดมินพัง
    console.error("notifyBookingProgress failed:", err);
  }
}
