import { prisma } from "@/lib/prisma";
import { pushMessage, siteUrl } from "@/lib/line";
import { getSettings, formatBangkokDateTime } from "@/lib/settings";
import { DOCUMENT_KINDS, DOCUMENT_LABEL, type DocumentKind } from "@/lib/documents";
import { highlightFees, SECURITY_DEPOSIT } from "@/lib/fees";

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
    const code = b.id.slice(0, 8).toUpperCase();
    const link = `${siteUrl()}/booking/${b.id}`;

    // เอกสารยังไม่ครบ — บอกให้ชัดว่าขาดอะไร แล้วรอส่งฉบับเต็มทีหลัง
    if (missing.length > 0) {
      if (b.depositNotifiedAt || b.readyNotifiedAt) return;

      await pushMessage(
        b.customer.lineUserId,
        [
          "✅ ยืนยันการจองเรียบร้อยแล้ว",
          "",
          "บริษัทฯ ได้ตรวจสอบหลักฐานการชำระค่าจองของท่านเรียบร้อยแล้ว",
          `รหัสจอง: ${code}`,
          "",
          "ยังขาดเอกสารอีก " + missing.length + " รายการ",
          ...missing.map((k) => `• ${DOCUMENT_LABEL[k as DocumentKind]}`),
          "",
          "กรุณาอัปโหลดที่หน้าการจองของท่าน เมื่อเอกสารครบแล้ว",
          "บริษัทฯ จะแจ้งสรุปรายละเอียดการรับรถให้ทราบอีกครั้งครับ",
          "",
          link,
        ].join("\n")
      );

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

    await pushMessage(
      b.customer.lineUserId,
      [
        "✅ การจองของท่านพร้อมรับรถแล้ว",
        "",
        "บริษัทฯ ตรวจสอบหลักฐานการชำระเงินและเอกสารของท่านครบถ้วนแล้ว",
        `รหัสจอง: ${code}`,
        `รถ: ${b.car.brand} ${b.car.name} (${b.car.licensePlate})`,
        `รับรถ: ${formatBangkokDateTime(b.startDate)}`,
        `คืนรถ: ${formatBangkokDateTime(b.endDate)}`,
        "",
        "── สรุปการชำระเงิน ──",
        `• ค่าเช่ารวม ${b.totalPrice.toLocaleString()} บาท`,
        `• ชำระค่าจองแล้ว ${paid.toLocaleString()} บาท`,
        `• คงเหลือค่าเช่า ${rentalBalance.toLocaleString()} บาท`,
        `• เงินประกันความเสียหาย ${settings.securityDeposit.toLocaleString()} บาท`,
        "  (ได้รับคืนเต็มจำนวนเมื่อส่งคืนรถเรียบร้อย)",
        "",
        `ยอดที่ต้องชำระในวันรับรถ ${dueOnPickup.toLocaleString()} บาท`,
        "",
        "── สิ่งที่ต้องเตรียมในวันรับรถ ──",
        "📄 บัตรประชาชนและใบขับขี่ฉบับจริง",
        "   แสดงต่อพนักงานส่งรถเพื่อตรวจสอบก่อนรับรถ",
        "📷 บันทึกภาพถ่ายและวิดีโอสภาพรถโดยรอบ",
        "   ก่อนนำรถออก เพื่อเป็นหลักฐานของทั้งสองฝ่าย",
        "🔍 ตรวจสอบสภาพรถร่วมกับพนักงาน",
        "   หากพบรอยขีดข่วน กรุณาแจ้งทันทีก่อนรับรถ",
        "",
        "── ค่าปรับที่พบบ่อย ──",
        ...highlightFees().map((f) => `• ${f.title} — ${f.amount}`),
        `รายการทั้งหมด: ${siteUrl()}/fees`,
        "",
        `เงินประกัน ${SECURITY_DEPOSIT.amount.toLocaleString()} บาท คืนเต็มจำนวนเมื่อคืนรถเรียบร้อย`,
        "เติมน้ำมันคืนตามระดับที่รับไป และไม่มีค่าปรับค้างชำระ",
        "",
        "ขอบพระคุณที่ใช้บริการครับ",
        link,
      ].join("\n")
    );

    await prisma.booking.update({
      where: { id: b.id },
      data: { readyNotifiedAt: new Date() },
    });
  } catch (err) {
    // แจ้งเตือนล้มเหลวต้องไม่ทำให้งานหลักของแอดมินพัง
    console.error("notifyBookingProgress failed:", err);
  }
}
