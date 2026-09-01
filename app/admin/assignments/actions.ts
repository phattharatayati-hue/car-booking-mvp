"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { pushMessage, siteUrl } from "@/lib/line";
import { toBangkokDate, formatBangkokDateTime } from "@/lib/settings";
import { syncAssignment, removeAssignmentEvent } from "@/lib/calendar-sync";
import {
  HANDOFF_LABEL,
  defaultMeetAt,
  defaultPlace,
  type HandoffKind,
} from "@/lib/assignments";

/** แจ้งคนที่รับงานทาง LINE — ล้มเหลวไม่ทำให้การมอบหมายล้ม */
async function notifyAssignee(assignmentId: string) {
  try {
    const a = await prisma.bookingAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        admin: true,
        booking: { include: { car: true, customer: true } },
      },
    });
    if (!a?.admin.lineUserId) return;

    const text = [
      `🚗 คุณได้รับงาน${HANDOFF_LABEL[a.kind as HandoffKind]}`,
      "",
      `รถ: ${a.booking.car.brand} ${a.booking.car.name}`,
      `ทะเบียน: ${a.booking.car.licensePlate}`,
      `ลูกค้า: ${a.booking.customer.fullName} (${a.booking.customer.phone})`,
      `เวลานัด: ${formatBangkokDateTime(a.meetAt)}`,
      ...(a.place ? [`จุดนัด: ${a.place}`] : []),
      ...(a.note ? [`หมายเหตุ: ${a.note}`] : []),
      `รหัสจอง: ${a.bookingId.slice(0, 8).toUpperCase()}`,
      "",
      `${siteUrl()}/admin/bookings`,
    ].join("\n");

    await pushMessage(a.admin.lineUserId, text);
    await prisma.bookingAssignment.update({
      where: { id: assignmentId },
      data: { notifiedAt: new Date() },
    });
  } catch (err) {
    console.error("notifyAssignee failed:", err);
  }
}

/**
 * มอบหมายงานหนึ่งชิ้น — ใช้ร่วมกันทั้งฟอร์มเดี่ยวและฟอร์มรวม
 * คืนค่า true ถ้าบันทึกจริง (false = ไม่ได้เลือกคน จึงข้ามไป)
 */
async function assignOne(
  booking: {
    id: string;
    startDate: Date;
    endDate: Date;
    pickupPlace: string | null;
    returnPlace: string | null;
  },
  kind: HandoffKind,
  input: { adminUserId: string; meetDate: string; meetTime: string; place: string; note: string }
): Promise<boolean> {
  const adminUserId = input.adminUserId.trim();
  if (!adminUserId) return false;

  // ถ้าแอดมินไม่ได้แก้เวลา ใช้เวลารับ/คืนรถของการจองนั้น
  const meetAt =
    input.meetDate && input.meetTime
      ? toBangkokDate(input.meetDate, input.meetTime)
      : defaultMeetAt(booking, kind);

  if (Number.isNaN(meetAt.getTime())) return false;

  const place = input.place.trim() || defaultPlace(booking, kind);
  const note = input.note.trim() || null;

  const saved = await prisma.bookingAssignment.upsert({
    where: { bookingId_kind_adminUserId: { bookingId: booking.id, kind, adminUserId } },
    create: { bookingId: booking.id, kind, adminUserId, meetAt, place, note },
    update: { meetAt, place, note },
  });

  await notifyAssignee(saved.id);
  await syncAssignment(saved.id);
  return true;
}

/** อ่านค่าจากฟอร์มรวม ที่ตั้งชื่อฟิลด์แยกตามชนิดงาน */
function readFields(formData: FormData, prefix: string) {
  const get = (k: string) => String(formData.get(`${prefix}_${k}`) ?? "");
  return {
    adminUserId: get("adminUserId"),
    meetDate: get("meetDate"),
    meetTime: get("meetTime"),
    place: get("place"),
    note: get("note"),
  };
}

/**
 * มอบหมายทั้งงานส่งรถและงานรับรถคืนในครั้งเดียว
 * เลือกแค่ฝั่งเดียวก็ได้ อีกฝั่งที่ไม่ได้เลือกคนจะถูกข้ามไปเฉย ๆ
 */
export async function assignBothAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) redirect("/admin/bookings?error=assign");

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) redirect("/admin/bookings?error=notfound");

  const delivered = await assignOne(booking, "DELIVERY", readFields(formData, "DELIVERY"));
  const picked = await assignOne(booking, "PICKUP", readFields(formData, "PICKUP"));

  if (!delivered && !picked) {
    redirect("/admin/bookings?error=nobody");
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  redirect("/admin/bookings?ok=assigned");
}

/** ถอนคนออกจากงาน */
export async function unassignAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = String(formData.get("assignmentId") ?? "");
  if (!id) redirect("/admin/bookings?error=assign");

  // ลบ event ในปฏิทินก่อน แล้วจึงลบแถว
  await removeAssignmentEvent(id);
  await prisma.bookingAssignment.delete({ where: { id } });

  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  redirect("/admin/bookings?ok=unassigned");
}

/** ลองซิงก์ปฏิทินใหม่ หลังจากครั้งก่อนพลาด */
export async function resyncAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = String(formData.get("assignmentId") ?? "");
  if (!id) redirect("/admin/bookings?error=assign");

  await syncAssignment(id);

  revalidatePath("/admin/bookings");
  redirect("/admin/bookings?ok=resynced");
}
