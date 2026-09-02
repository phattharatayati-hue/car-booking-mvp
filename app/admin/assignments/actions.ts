"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { toBangkokDate } from "@/lib/settings";
import { syncAssignment, removeAssignmentEvent } from "@/lib/calendar-sync";
import { notifyJob } from "@/lib/driver-jobs";
import { defaultMeetAt, defaultPlace, type HandoffKind } from "@/lib/assignments";

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

  const key = { bookingId_kind_adminUserId: { bookingId: booking.id, kind, adminUserId } };

  // เคยมอบหมายไว้แล้วหรือยัง — ใช้เลือกข้อความแจ้งเตือน (งานใหม่ / งานแก้ไข)
  const existing = await prisma.bookingAssignment.findUnique({
    where: key,
    select: { id: true, notifiedAt: true },
  });

  const saved = await prisma.bookingAssignment.upsert({
    where: key,
    create: { bookingId: booking.id, kind, adminUserId, meetAt, place, note },
    update: { meetAt, place, note },
  });

  await notifyJob(saved.id, existing?.notifiedAt ? "updated" : "new");
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

  // บอกคนรับงานก่อนว่าไม่ต้องไปแล้ว แล้วจึงลบ event ในปฏิทินและลบแถว
  await notifyJob(id, "cancelled");
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
