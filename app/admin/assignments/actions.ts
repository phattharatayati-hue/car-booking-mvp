"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { toBangkokDate, formatBangkokDateTime } from "@/lib/settings";
import { syncAssignment, removeAssignmentEvent } from "@/lib/calendar-sync";
import { notifyJob, type NotifyResult } from "@/lib/driver-jobs";
import { audit } from "@/lib/audit";
import {
  HANDOFF_LABEL,
  defaultMeetAt,
  defaultPlace,
  type HandoffKind,
} from "@/lib/assignments";

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
): Promise<NotifyResult | null> {
  const adminUserId = input.adminUserId.trim();
  if (!adminUserId) return null;

  // ถ้าแอดมินไม่ได้แก้เวลา ใช้เวลารับ/คืนรถของการจองนั้น
  const meetAt =
    input.meetDate && input.meetTime
      ? toBangkokDate(input.meetDate, input.meetTime)
      : defaultMeetAt(booking, kind);

  if (Number.isNaN(meetAt.getTime())) return null;

  const place = input.place.trim() || defaultPlace(booking, kind);
  const note = input.note.trim() || null;

  const key = { bookingId_kind_adminUserId: { bookingId: booking.id, kind, adminUserId } };

  // เคยมอบหมายไว้แล้วหรือยัง — ใช้เลือกข้อความแจ้งเตือน (งานใหม่ / งานแก้ไข)
  const existing = await prisma.bookingAssignment.findUnique({
    where: key,
    select: { id: true, notifiedAt: true, meetAt: true, place: true, note: true },
  });

  // กดซ้ำโดยไม่แก้อะไรเลย = ตั้งใจส่งแจ้งเตือนซ้ำ (เช่น เพิ่งผูก LINE เสร็จ)
  // ถ้าแก้เวลา จุดนัด หรือหมายเหตุ จึงจะนับเป็น "งานมีการเปลี่ยนแปลง"
  const sameAsBefore =
    existing != null &&
    existing.meetAt.getTime() === meetAt.getTime() &&
    (existing.place ?? "") === (place ?? "") &&
    (existing.note ?? "") === (note ?? "");

  const saved = await prisma.bookingAssignment.upsert({
    where: key,
    create: { bookingId: booking.id, kind, adminUserId, meetAt, place, note },
    update: { meetAt, place, note },
  });

  const who = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
    select: { name: true },
  });

  await audit({
    action: "assignment.assign",
    summary: `${existing ? "แก้ไข" : "มอบหมาย"}งาน${HANDOFF_LABEL[kind]} ของการจอง ${booking.id
      .slice(0, 8)
      .toUpperCase()} ให้ ${who?.name ?? adminUserId}`,
    entity: "assignment",
    entityId: saved.id,
    detail: `นัด ${formatBangkokDateTime(meetAt)}${place ? ` · ${place}` : ""}`,
  });

  const mode = !existing ? "new" : sameAsBefore ? "resend" : "updated";
  const result = await notifyJob(saved.id, mode);
  await syncAssignment(saved.id);
  return result;
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

  const results = [delivered, picked].filter((r): r is NotifyResult => r !== null);

  if (results.length === 0) {
    redirect("/admin/bookings?error=nobody");
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/admin");

  // มีคนที่ยังไม่ผูก LINE — บันทึกงานให้แล้ว แต่ต้องบอกว่าแจ้งไม่ถึงตัว
  if (results.includes("no-line")) {
    redirect("/admin/bookings?ok=assigned_noline");
  }
  if (results.includes("error")) {
    redirect("/admin/bookings?ok=assigned_sendfail");
  }
  redirect("/admin/bookings?ok=assigned");
}

/** ถอนคนออกจากงาน */
export async function unassignAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = String(formData.get("assignmentId") ?? "");
  if (!id) redirect("/admin/bookings?error=assign");

  // อ่านก่อนลบ เพื่อบันทึกประวัติว่าถอนใครออกจากงานไหน
  const target = await prisma.bookingAssignment.findUnique({
    where: { id },
    include: { admin: { select: { name: true } } },
  });

  if (target) {
    await audit({
      action: "assignment.unassign",
      summary: `ถอน ${target.admin.name} ออกจากงาน${
        HANDOFF_LABEL[target.kind as HandoffKind]
      } ของการจอง ${target.bookingId.slice(0, 8).toUpperCase()}`,
      entity: "assignment",
      entityId: id,
      detail: `เคยนัด ${formatBangkokDateTime(target.meetAt)}`,
    });
  }

  // บอกคนรับงานก่อนว่าไม่ต้องไปแล้ว แล้วจึงลบ event ในปฏิทินและลบแถว
  await notifyJob(id, "cancelled");
  await removeAssignmentEvent(id);
  await prisma.bookingAssignment.delete({ where: { id } });

  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  redirect("/admin/bookings?ok=unassigned");
}

/**
 * ส่งการ์ดงานเข้าแชท LINE ซ้ำ โดยไม่แก้ข้อมูลงาน
 * ใช้ตอนคนรับงานเพิ่งผูก LINE เสร็จ หรือเผลอลบข้อความทิ้ง
 */
export async function resendAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = String(formData.get("assignmentId") ?? "");
  if (!id) redirect("/admin/bookings?error=assign");

  const result = await notifyJob(id, "resend");

  await audit({
    action: "assignment.resend",
    summary: "ส่งแจ้งเตือนงานรับ-ส่งรถซ้ำทาง LINE",
    entity: "assignment",
    entityId: id,
    detail: result === "sent" ? "ส่งสำเร็จ" : `ส่งไม่สำเร็จ (${result})`,
  });

  revalidatePath("/admin/bookings");

  if (result === "no-line") redirect("/admin/bookings?error=resend_noline");
  if (result !== "sent") redirect("/admin/bookings?error=resend_failed");
  redirect("/admin/bookings?ok=resent");
}

/** ลองซิงก์ปฏิทินใหม่ หลังจากครั้งก่อนพลาด */
export async function resyncAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = String(formData.get("assignmentId") ?? "");
  if (!id) redirect("/admin/bookings?error=assign");

  await syncAssignment(id);

  await audit({
    action: "assignment.resync",
    summary: "สั่งซิงก์งานรับ-ส่งรถลงปฏิทินใหม่",
    entity: "assignment",
    entityId: id,
  });

  revalidatePath("/admin/bookings");
  redirect("/admin/bookings?ok=resynced");
}
