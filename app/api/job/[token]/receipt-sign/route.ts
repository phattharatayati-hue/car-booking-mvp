import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jobViewOpen } from "@/lib/driver-jobs";
import { auditAs } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ลูกค้าเซ็นรับใบเสร็จ ผ่านมือถือของคนไปส่ง/รับรถ
 *
 * คนเซ็นไม่ได้ล็อกอิน จึงใช้กุญแจงานเป็นสิทธิ์ แต่ต้องตรวจให้ครบสามชั้น
 *   1. กุญแจถูกและยังอยู่ในช่วงเวลาทำงาน
 *   2. ใบเสร็จใบนั้นเป็นของการจองเดียวกับงานชิ้นนี้ (ไม่ใช่ใบของลูกค้าคนอื่น)
 *   3. ยังไม่เคยเซ็น — ลายเซ็นที่เซ็นแล้วทับไม่ได้ ต้องให้แอดมินยกเลิกใบแล้วออกใหม่
 *
 * อัปไฟล์ในนี้เองแทนที่จะให้ฝั่งหน้าเว็บเรียก /api/upload
 * เพราะ /api/upload ต้องเป็นแอดมิน ถ้าเปิดให้ยิงด้วยกุญแจงานจะกลายเป็นช่องอัปไฟล์อะไรก็ได้
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const job = await prisma.bookingAssignment.findUnique({
    where: { viewToken: token },
    include: { admin: { select: { id: true, name: true, role: true } } },
  });
  if (!job) {
    return NextResponse.json({ error: "ลิงก์นี้ใช้ไม่ได้แล้ว" }, { status: 404 });
  }
  if (!jobViewOpen(job.meetAt)) {
    return NextResponse.json({ error: "เลยช่วงเวลาของงานนี้แล้ว" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file") as File | null;
  const receiptId = String(form.get("receiptId") ?? "");

  if (!file || !receiptId) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
  }
  if (file.type !== "image/png") {
    return NextResponse.json({ error: "ลายเซ็นต้องเป็นไฟล์ PNG" }, { status: 400 });
  }
  // ลายเซ็นจากผืนผ้าใบมีขนาดไม่กี่สิบ KB ถ้าใหญ่กว่านี้แปลว่าไม่ใช่ลายเซ็น
  if (file.size > 1_500_000) {
    return NextResponse.json({ error: "ไฟล์ใหญ่ผิดปกติ" }, { status: 400 });
  }

  const receipt = await prisma.receipt.findUnique({ where: { id: receiptId } });
  if (!receipt || receipt.bookingId !== job.bookingId) {
    return NextResponse.json({ error: "ไม่พบใบเสร็จของงานนี้" }, { status: 404 });
  }
  if (receipt.voidedAt) {
    return NextResponse.json({ error: "ใบเสร็จนี้ถูกยกเลิกแล้ว" }, { status: 409 });
  }
  if (receipt.customerSignatureUrl) {
    return NextResponse.json(
      { error: "ใบนี้ลูกค้าเซ็นไปแล้ว ถ้าต้องแก้ให้แอดมินยกเลิกใบนี้แล้วออกใหม่" },
      { status: 409 }
    );
  }

  const blob = await put(`signatures/receipt-${receipt.number}.png`, file, {
    access: "private",
    addRandomSuffix: true,
  });

  await prisma.receipt.update({
    where: { id: receipt.id },
    data: {
      customerSignatureUrl: `/api/file?p=${encodeURIComponent(blob.pathname)}`,
      customerSignedAt: new Date(),
    },
  });

  await auditAs(
    { id: job.admin.id, name: job.admin.name, role: job.admin.role },
    {
      action: "receipt.customer_sign",
      summary: `ลูกค้าเซ็นรับใบเสร็จ ${receipt.number} จากลิงก์งาน`,
      entity: "booking",
      entityId: receipt.bookingId,
    }
  );

  return NextResponse.json({ ok: true });
}
