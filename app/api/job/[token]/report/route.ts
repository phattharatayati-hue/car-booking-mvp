import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { auditAs } from "@/lib/audit";
import { jobViewOpen } from "@/lib/driver-jobs";
import { HANDOFF_LABEL, type HandoffKind } from "@/lib/assignments";

export const dynamic = "force-dynamic";

/**
 * รับรายงานหน้างานจากคนรับ-ส่งรถ ผ่านลิงก์ /job/<token>
 *
 * ทำไมต้องมี endpoint แยกแทนที่จะใช้ /api/upload:
 * กุญแจในลิงก์ผูกกับงานชิ้นเดียวตายตัว รูปจึงไปเข้างานที่ถูกต้องเสมอ
 * ต่างจากการส่งรูปเข้าแชทที่ระบบต้อง "เดา" ว่าเป็นของงานไหน แล้วเดาผิดได้
 * (เคยเกิดจริง — ปิดงาน ATIV-01 แต่รูปไปเข้า CROSS-01)
 *
 * สิทธิ์ทั้งหมดมาจากตัว token: ถอนงานเมื่อไหร่แถวหาย ลิงก์ตายทันที
 * และเปิดได้เฉพาะช่วงเวลาเดียวกับหน้าเอกสาร (ก่อนนัด ถึงพ้นนัด 1 วัน)
 */

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const job = await prisma.bookingAssignment.findUnique({
    where: { viewToken: token },
    include: {
      admin: { select: { id: true, name: true, role: true } },
      booking: { include: { car: true } },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "ลิงก์นี้ใช้ไม่ได้แล้ว" }, { status: 404 });
  }
  if (!jobViewOpen(job.meetAt)) {
    return NextResponse.json({ error: "ลิงก์นี้หมดอายุแล้ว" }, { status: 410 });
  }

  const actor = { id: job.admin.id, name: job.admin.name, role: job.admin.role };
  const code = job.bookingId.slice(0, 8).toUpperCase();
  const kindLabel = HANDOFF_LABEL[job.kind as HandoffKind] ?? job.kind;
  const form = await request.formData();
  const action = String(form.get("action") ?? "");

  /* ---------- ส่งรูปสภาพรถ ---------- */
  if (action === "photo") {
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "ไม่พบไฟล์รูป" }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: "รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP)" },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "ไฟล์ใหญ่เกินไป (สูงสุด 4MB) ลองถ่ายใหม่หรือย่อรูปก่อน" },
        { status: 400 }
      );
    }

    const ext = file.type.includes("png") ? "png" : "jpg";
    const blob = await put(`handoff/${job.id}-${Date.now()}.${ext}`, file, {
      access: "private",
      addRandomSuffix: true,
      contentType: file.type,
    });

    await prisma.handoffPhoto.create({
      data: {
        assignmentId: job.id,
        fileUrl: `/api/file?p=${encodeURIComponent(blob.pathname)}`,
      },
    });

    const count = await prisma.handoffPhoto.count({ where: { assignmentId: job.id } });
    return NextResponse.json({ ok: true, count });
  }

  /* ---------- เลขไมล์ / ระดับน้ำมัน ---------- */
  if (action === "reading") {
    const rawOdo = String(form.get("odometer") ?? "").replace(/[\s,]/g, "");
    const fuelLevel = String(form.get("fuelLevel") ?? "").trim();
    const odometer = rawOdo ? Number(rawOdo) : undefined;

    if (rawOdo && (!Number.isInteger(odometer) || odometer! < 0 || odometer! > 9_999_999)) {
      return NextResponse.json({ error: "เลขไมล์ไม่ถูกต้อง" }, { status: 400 });
    }
    if (odometer === undefined && !fuelLevel) {
      return NextResponse.json({ error: "ยังไม่ได้กรอกอะไรเลย" }, { status: 400 });
    }

    await prisma.bookingAssignment.update({
      where: { id: job.id },
      data: {
        ...(odometer !== undefined ? { odometer } : {}),
        ...(fuelLevel ? { fuelLevel: fuelLevel.slice(0, 40) } : {}),
      },
    });

    await auditAs(actor, {
      action: "assignment.reading_save",
      summary: `บันทึกสภาพรถของงาน${kindLabel} การจอง ${code} จากลิงก์งาน`,
      entity: "booking",
      entityId: job.bookingId,
      detail: [
        odometer !== undefined ? `เลขไมล์ ${odometer.toLocaleString()} กม.` : null,
        fuelLevel ? `น้ำมัน ${fuelLevel}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    });

    return NextResponse.json({ ok: true });
  }

  /* ---------- ปิดงาน ---------- */
  if (action === "done") {
    if (job.doneAt) {
      return NextResponse.json({ ok: true, alreadyDone: true });
    }

    const now = new Date();
    await prisma.bookingAssignment.update({
      where: { id: job.id },
      // ปิดงานได้แปลว่าเห็นงานแน่นอน ถ้ายังไม่เคยกดรับทราบก็ถือว่ารับทราบตอนนี้
      data: { doneAt: now, ackedAt: job.ackedAt ?? now },
    });

    // งานรับรถคืนเสร็จ = จบการเช่า ปิดสถานะการจองให้เลย
    if (job.kind === "PICKUP") {
      await prisma.booking.update({
        where: { id: job.bookingId },
        data: { status: "COMPLETED" },
      });
    }

    await auditAs(actor, {
      action: "assignment.done",
      summary: `ปิดงาน${kindLabel} ของการจอง ${code} จากลิงก์งาน`,
      entity: "booking",
      entityId: job.bookingId,
    });

    return NextResponse.json({ ok: true, bookingCompleted: job.kind === "PICKUP" });
  }

  return NextResponse.json({ error: "คำสั่งไม่ถูกต้อง" }, { status: 400 });
}
