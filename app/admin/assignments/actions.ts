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

/** มอบหมายงานให้แอดมินหนึ่งคน — เรียกซ้ำเพื่อเพิ่มคนที่สองได้ */
export async function assignAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const bookingId = String(formData.get("bookingId") ?? "");
  const kind = String(formData.get("kind") ?? "") as HandoffKind;
  const adminUserId = String(formData.get("adminUserId") ?? "");
  const meetDate = String(formData.get("meetDate") ?? "").trim();
  const meetTime = String(formData.get("meetTime") ?? "").trim();
  const place = String(formData.get("place") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!bookingId || !adminUserId || (kind !== "DELIVERY" && kind !== "PICKUP")) {
    redirect("/admin/bookings?error=assign");
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) redirect("/admin/bookings?error=notfound");

  // ถ้าแอดมินไม่ได้แก้เวลา ใช้เวลารับ/คืนรถของการจองนั้น
  const meetAt =
    meetDate && meetTime ? toBangkokDate(meetDate, meetTime) : defaultMeetAt(booking, kind);

  if (Number.isNaN(meetAt.getTime())) redirect("/admin/bookings?error=time");

  const created = await prisma.bookingAssignment.upsert({
    where: { bookingId_kind_adminUserId: { bookingId, kind, adminUserId } },
    create: {
      bookingId,
      kind,
      adminUserId,
      meetAt,
      place: place || defaultPlace(booking, kind),
      note: note || null,
    },
    update: {
      meetAt,
      place: place || defaultPlace(booking, kind),
      note: note || null,
    },
  });

  await notifyAssignee(created.id);
  await syncAssignment(created.id);

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
