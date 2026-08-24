import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/line";
import { formatBangkokDateTime } from "@/lib/settings";
import { HANDOFF_LABEL, eventWindow, type HandoffKind } from "@/lib/assignments";
import {
  accessTokenFor,
  insertEvent,
  patchEvent,
  deleteEvent,
  oauthConfigured,
  type CalendarEventInput,
} from "@/lib/google-calendar";

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
        `เวลานัดลูกค้า: ${formatBangkokDateTime(a.meetAt)}`,
        `ลูกค้า: ${a.booking.customer.fullName}`,
        `เบอร์: ${a.booking.customer.phone}`,
        ...(a.note ? [`หมายเหตุ: ${a.note}`] : []),
        `รหัสจอง: ${a.bookingId.slice(0, 8).toUpperCase()}`,
        "",
        `${siteUrl()}/admin/bookings`,
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
