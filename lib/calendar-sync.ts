import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/line";
import { formatBangkokDateTime, getSettings } from "@/lib/settings";
import { securityDepositOf } from "@/lib/car-money";
import { rentBreakdown } from "@/lib/rent-breakdown";
import { jobSummaryLines } from "@/lib/driver-cards";
import { HANDOFF_LABEL, eventWindow, type HandoffKind } from "@/lib/assignments";
import { markCalendarDisconnected } from "@/lib/google-health";
import {
  accessTokenFor,
  insertEvent,
  patchEvent,
  deleteEvent,
  oauthConfigured,
  isAuthExpired,
  type CalendarEventInput,
} from "@/lib/google-calendar";

/** โทเคนหน้างาน — ใช้ตัวเดิมถ้ามีแล้ว (ลิงก์ใน LINE กับในปฏิทินจะได้เป็นลิงก์เดียวกัน) */
async function jobViewToken(assignmentId: string, existing: string | null): Promise<string> {
  if (existing) return existing;
  const token = crypto.randomBytes(24).toString("base64url");
  await prisma.bookingAssignment.update({
    where: { id: assignmentId },
    data: { viewToken: token },
  });
  return token;
}

/**
 * ซิงก์งานมอบหมายหนึ่งงาน ขึ้นปฏิทิน "งานรับส่งรถ" ของคนที่รับงาน
 *
 * กฎเหล็ก: ฟังก์ชันนี้ไม่ throw ออกไปข้างนอก — ปฏิทินล่มต้องไม่ทำให้การมอบหมายล้ม
 * ผลลัพธ์เก็บไว้ที่ syncedAt / syncError ให้หน้าหลังบ้านแสดงพร้อมปุ่มลองใหม่
 */
export async function syncAssignment(assignmentId: string): Promise<void> {
  if (!oauthConfigured()) return;

  try {
    const a = await prisma.bookingAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        admin: true,
        booking: { include: { car: true, customer: true } },
      },
    });
    if (!a) return;

    // แอดมินยังไม่เชื่อมปฏิทิน — ไม่ถือเป็นข้อผิดพลาด
    if (!a.admin.googleRefreshToken || !a.admin.googleCalendarId) {
      await prisma.bookingAssignment.update({
        where: { id: a.id },
        data: { syncError: null },
      });
      return;
    }

    const { start, end } = eventWindow(a.meetAt);
    const kind = a.kind as HandoffKind;
    const car = a.booking.car;

    const event: CalendarEventInput = {
      summary: `${HANDOFF_LABEL[kind]} · ${car.brand} ${car.name} (${car.licensePlate})`,
      location: a.place ?? undefined,
      description: [
        // ส่วนบนเหมือนการ์ดรับทราบงานใน LINE ทุกบรรทัด
        ...jobSummaryLines({
          carLabel: `${car.brand} ${car.name}`,
          plate: car.licensePlate,
          customerName: a.booking.customer.fullName,
          customerPhone: a.booking.customer.phone,
          start: a.booking.startDate,
          end: a.booking.endDate,
          pickupPlace: a.booking.pickupPlace,
          returnPlace: a.booking.returnPlace,
          rent: await rentBreakdown(a.booking),
          totalPrice: a.booking.totalPrice,
          deposit: securityDepositOf(car, await getSettings()),
        }),
        "",
        `ทะเบียน: ${car.licensePlate}`,
        `ลูกค้า: ${a.booking.customer.fullName}`,
        `รหัสจอง: ${a.bookingId.slice(0, 8).toUpperCase()}`,
        `เวลานัดงานนี้: ${formatBangkokDateTime(a.meetAt)}`,
        ...(a.note ? [`หมายเหตุ: ${a.note}`] : []),
        "",
        /* ลิงก์หน้างาน (ไม่ใช่หลังบ้าน) — คนส่งรถเปิดดูเอกสารได้โดยไม่ต้องล็อกอิน
           ผูกกับงานชิ้นเดียว ถอนงานแล้วลิงก์ตาย และปิดเองเมื่อพ้นเวลานัดไป 1 วัน */
        "เอกสารการจอง:",
        `${siteUrl()}/job/${await jobViewToken(a.id, a.viewToken)}`,
        "",
        "บจก. ภูพิงค์คอร์ปอเรชั่น",
      ].join("\n"),
      start,
      end,
      assignmentId: a.id,
    };

    const token = await accessTokenFor(a.admin.googleRefreshToken);

    if (a.googleEventId) {
      await patchEvent(token, a.admin.googleCalendarId, a.googleEventId, event);
      await prisma.bookingAssignment.update({
        where: { id: a.id },
        data: { syncedAt: new Date(), syncError: null },
      });
    } else {
      const eventId = await insertEvent(token, a.admin.googleCalendarId, event);
      await prisma.bookingAssignment.update({
        where: { id: a.id },
        data: { googleEventId: eventId, syncedAt: new Date(), syncError: null },
      });
    }
  } catch (err) {
    console.error("syncAssignment failed:", err);

    /* สิทธิ์หมดอายุแก้เองไม่ได้ ต้องให้เจ้าตัวเชื่อมใหม่
       ตัดการเชื่อมทิ้งแล้วส่ง LINE บอกทันที ไม่ต้องรอ cron รอบหน้า
       ส่วน error อื่น (เน็ตล่ม, Google ล่มชั่วคราว) ปล่อยไว้ เพราะหายเองได้ */
    if (isAuthExpired(err)) {
      const a = await prisma.bookingAssignment
        .findUnique({
          where: { id: assignmentId },
          select: {
            admin: {
              select: {
                id: true,
                name: true,
                lineUserId: true,
                googleRefreshToken: true,
                googleCalendarId: true,
              },
            },
          },
        })
        .catch(() => null);

      if (a?.admin) await markCalendarDisconnected(a.admin).catch(() => {});
    }

    const message = err instanceof Error ? err.message : "ซิงก์ปฏิทินไม่สำเร็จ";
    await prisma.bookingAssignment
      .update({
        where: { id: assignmentId },
        data: { syncError: message.slice(0, 300) },
      })
      .catch(() => {});
  }
}

/**
 * ลบ event ของงานมอบหมาย — เรียกก่อนลบแถวออกจากฐานข้อมูล
 * คืน true ถ้าลบสำเร็จหรือไม่มีอะไรต้องลบ
 */
export async function removeAssignmentEvent(assignmentId: string): Promise<boolean> {
  if (!oauthConfigured()) return true;

  try {
    const a = await prisma.bookingAssignment.findUnique({
      where: { id: assignmentId },
      include: { admin: true },
    });
    if (!a?.googleEventId || !a.admin.googleRefreshToken || !a.admin.googleCalendarId) {
      return true;
    }
    const token = await accessTokenFor(a.admin.googleRefreshToken);
    await deleteEvent(token, a.admin.googleCalendarId, a.googleEventId);
    return true;
  } catch (err) {
    console.error("removeAssignmentEvent failed:", err);
    return false;
  }
}

/**
 * เคลียร์งานมอบหมายทั้งหมดของใบจอง — ใช้ตอนยกเลิก/ปฏิเสธใบจอง
 *
 * ลำดับสำคัญ: บอกคนรับงานก่อนว่าไม่ต้องไปแล้ว → ลบ event ในปฏิทิน → ลบแถว
 * ถ้าไม่ทำ event ค้างในปฏิทิน Google ของคนส่งรถ แล้วจะมีคนขับไปตามนัดที่ยกเลิกไปแล้ว
 *
 * ไม่ throw ออกไปข้างนอก — ปฏิทินล่มต้องไม่ทำให้การยกเลิกใบจองล้ม
 */
export async function clearBookingAssignments(bookingId: string): Promise<void> {
  try {
    const rows = await prisma.bookingAssignment.findMany({
      where: { bookingId },
      select: { id: true },
    });
    if (rows.length === 0) return;

    const { notifyJob } = await import("@/lib/driver-jobs");

    for (const r of rows) {
      await notifyJob(r.id, "cancelled").catch(() => {});
      await removeAssignmentEvent(r.id);
      await prisma.bookingAssignment.delete({ where: { id: r.id } }).catch(() => {});
    }
  } catch (err) {
    console.error("clearBookingAssignments failed:", err);
  }
}
