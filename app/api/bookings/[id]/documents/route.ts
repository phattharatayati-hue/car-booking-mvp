import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDocumentKind, missingDocuments, DOCUMENT_LABEL } from "@/lib/documents";
import { notifyAdmin, siteUrl } from "@/lib/line";

export const dynamic = "force-dynamic";

/** ลูกค้าอัปโหลดเอกสารหนึ่งชนิด — อัปใหม่ทับของเดิมได้ */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { kind, fileUrl } = await request.json();

    if (!isDocumentKind(kind)) {
      return NextResponse.json({ error: "ชนิดเอกสารไม่ถูกต้อง" }, { status: 400 });
    }
    // รับเฉพาะ path ที่ออกจาก /api/upload ของเราเอง กัน URL ภายนอก
    if (typeof fileUrl !== "string" || !fileUrl.startsWith("/api/file?p=")) {
      return NextResponse.json({ error: "ไฟล์ไม่ถูกต้อง" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { car: true, customer: true },
    });
    if (!booking) {
      return NextResponse.json({ error: "ไม่พบการจองนี้" }, { status: 404 });
    }
    if (["CANCELLED", "REJECTED", "COMPLETED"].includes(booking.status)) {
      return NextResponse.json(
        { error: "การจองนี้ปิดแล้ว ไม่สามารถส่งเอกสารได้" },
        { status: 400 }
      );
    }

    await prisma.bookingDocument.upsert({
      where: { bookingId_kind: { bookingId: id, kind } },
      create: { bookingId: id, kind, fileUrl },
      // ส่งใหม่ = กลับไปรอตรวจ และล้างเหตุผลที่เคยไม่ผ่านทิ้ง
      update: {
        fileUrl,
        status: "PENDING",
        rejectReason: null,
        reviewedBy: null,
        reviewedAt: null,
      },
    });

    const all = await prisma.bookingDocument.findMany({
      where: { bookingId: id },
      select: { kind: true },
    });
    const missing = missingDocuments(all);

    // แจ้งแอดมินครั้งเดียวตอนเอกสารครบ ไม่ใช่ทุกไฟล์ที่อัป
    if (missing.length === 0) {
      try {
        await notifyAdmin(
          [
            "📄 ลูกค้าส่งเอกสารครบแล้ว",
            "",
            `ลูกค้า: ${booking.customer.fullName}`,
            `เบอร์: ${booking.customer.phone}`,
            `รถ: ${booking.car.brand} ${booking.car.name}`,
            `รหัสจอง: ${booking.id.slice(0, 8).toUpperCase()}`,
            "",
            "กรุณาตรวจสอบเอกสารในหลังบ้าน",
            `${siteUrl()}/admin/bookings`,
          ].join("\n")
        );
      } catch (err) {
        console.error("notifyAdmin (documents) failed:", err);
      }
    }

    return NextResponse.json({
      ok: true,
      missing,
      missingLabels: missing.map((k) => DOCUMENT_LABEL[k]),
    });
  } catch (err) {
    console.error("upload document failed:", err);
    return NextResponse.json({ error: "บันทึกเอกสารไม่สำเร็จ" }, { status: 500 });
  }
}
