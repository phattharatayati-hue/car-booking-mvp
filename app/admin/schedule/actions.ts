"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/roles";
import { audit } from "@/lib/audit";
import { HANDOFF_LABEL, type HandoffKind } from "@/lib/assignments";

/**
 * เปลี่ยนสถานะงานรับ-ส่งจากหน้าเว็บ
 *
 * เดิมสถานะเปลี่ยนได้ทางเดียวคือคนรับ-ส่งกดในแชท LINE
 * ถ้าเขาลืมกด หรือมือถือแบตหมด แอดมินก็ปิดงานให้ไม่ได้เลย
 *
 * คนรับ-ส่งรถ (DRIVER) แก้ได้เฉพาะงานของตัวเอง แอดมินแก้ได้ทุกงาน
 */
export async function markJobAction(formData: FormData) {
  const me = await currentAdmin();
  if (!me) redirect("/login");

  const assignmentId = String(formData.get("assignmentId") ?? "");
  const to = String(formData.get("to") ?? "");
  const back = String(formData.get("back") ?? "/admin/schedule");

  if (!assignmentId || !["acked", "done", "reset"].includes(to)) {
    redirect(`${back}${back.includes("?") ? "&" : "?"}error=mark`);
  }

  const job = await prisma.bookingAssignment.findUnique({
    where: { id: assignmentId },
    include: { booking: { include: { car: true } } },
  });
  if (!job) redirect(`${back}${back.includes("?") ? "&" : "?"}error=notfound`);

  if (me.role === "DRIVER" && job.adminUserId !== me.id) {
    redirect(`${back}${back.includes("?") ? "&" : "?"}error=forbidden`);
  }

  const now = new Date();
  const data =
    to === "acked"
      ? { ackedAt: job.ackedAt ?? now, doneAt: null }
      : to === "done"
        ? { ackedAt: job.ackedAt ?? now, doneAt: now }
        : { ackedAt: null, doneAt: null };

  await prisma.bookingAssignment.update({ where: { id: assignmentId }, data });

  const label = HANDOFF_LABEL[job.kind as HandoffKind] ?? job.kind;
  await audit({
    action: `job.mark_${to}`,
    summary: `${
      to === "done" ? "ปิดงาน" : to === "acked" ? "ทำเครื่องหมายรับทราบ" : "ย้อนสถานะ"
    } ${label} ของการจอง ${job.bookingId.slice(0, 8).toUpperCase()} จากหน้าตารางงาน`,
    entity: "booking",
    entityId: job.bookingId,
  });

  revalidatePath("/admin/schedule");
  redirect(`${back}${back.includes("?") ? "&" : "?"}ok=${to}`);
}
