import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDocumentKind, missingDocuments, DOCUMENT_LABEL } from "@/lib/documents";
import { notifyAdmin, siteUrl } from "@/lib/line";

export const dynamic = "force-dynamic";

const MAX_IMAGES = 10;

const isOurFile = (u: unknown): u is string =>
  typeof u === "string" && u.startsWith("/api/file?p=");

/** ใบจองที่ลูกค้ายังส่ง/แก้เอกสารได้ — คืน error response ถ้าไม่ได้ */
async function loadOpenBooking(id: string) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { car: true, customer: true, deposit: true },
  });
  if (!booking) {
    return { error: NextResponse.json({ error: "ไม่พบการจองนี้" }, { status: 404 }) };
  }
  if (["CANCELLED", "REJECTED", "COMPLETED"].includes(booking.status)) {
    return {
      error: NextResponse.json(
        { error: "การจองนี้ปิดแล้ว ไม่สามารถส่งเอกสารได้" },
        { status: 400 }
      ),
    };
  }
  /* ต้องมีสลิปค่าจองก่อนถึงจะส่งเอกสารได้
     เคยมีคนส่งรูปบัตรประชาชนกับใบขับขี่เข้ามาแล้วไม่เช่าจริง
     เก็บเอกสารของคนที่ไม่ได้เป็นลูกค้าไว้เป็นภาระและเสี่ยง PDPA เปล่า ๆ
     ด่านนี้อยู่ฝั่งเซิร์ฟเวอร์ เพราะซ่อนปุ่มอย่างเดียวกันคนยิง API ตรงไม่ได้ */
  if (!booking.deposit) {
    return {
      error: NextResponse.json(
        { error: "กรุณาโอนค่าจองและอัปสลิปก่อน แล้วช่องส่งเอกสารจะเปิดให้อัตโนมัติ" },
        { status: 409 }
      ),
    };
  }
  return { booking };
}

/** ลูกค้าแก้เอกสาร = กลับไปรอตรวจ และล้างเหตุผลที่เคยไม่ผ่านทิ้ง */
const backToPending = {
  status: "PENDING" as const,
  rejectReason: null,
  reviewedBy: null,
  reviewedAt: null,
};

/**
 * ลูกค้าอัปรูปเอกสารหนึ่งชนิด — ได้หลายรูปต่อชนิด
 *
 * body: { kind, fileUrls: string[], mode?: "add" | "replace" | "replaceAll", index? }
 *   add        — ต่อท้ายรูปเดิม
 *   replace    — แทนรูปที่ index
 *   replaceAll — ล้างของเดิมทั้งชุด (ใช้ตอนเอกสารไม่ผ่านแล้วส่งใหม่)
 * ยังรับ { fileUrl } แบบเดิมได้ = replaceAll รูปเดียว
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { kind } = body;
    const rawUrls: unknown[] = Array.isArray(body.fileUrls)
      ? body.fileUrls
      : body.fileUrl
        ? [body.fileUrl]
        : [];
    const mode: string = body.fileUrls ? body.mode ?? "add" : "replaceAll";
    const index = Number(body.index ?? -1);

    if (!isDocumentKind(kind)) {
      return NextResponse.json({ error: "ชนิดเอกสารไม่ถูกต้อง" }, { status: 400 });
    }
    // รับเฉพาะ path ที่ออกจาก /api/upload ของเราเอง กัน URL ภายนอก
    if (rawUrls.length === 0 || !rawUrls.every(isOurFile)) {
      return NextResponse.json({ error: "ไฟล์ไม่ถูกต้อง" }, { status: 400 });
    }
    const urls = rawUrls as string[];

    const loaded = await loadOpenBooking(id);
    if (loaded.error) return loaded.error;
    const booking = loaded.booking;

    const existing = await prisma.bookingDocument.findUnique({
      where: { bookingId_kind: { bookingId: id, kind } },
    });
    const current = existing ? [existing.fileUrl, ...(existing.extraUrls ?? [])] : [];

    let next: string[];
    if (mode === "replace") {
      if (index < 0 || index >= current.length) {
        return NextResponse.json({ error: "ไม่พบรูปที่จะเปลี่ยน" }, { status: 400 });
      }
      next = current.map((u, i) => (i === index ? urls[0] : u));
    } else if (mode === "replaceAll") {
      next = urls;
    } else {
      next = [...current, ...urls];
    }
    if (next.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: `เอกสารแต่ละชนิดใส่ได้ไม่เกิน ${MAX_IMAGES} รูป` },
        { status: 400 }
      );
    }

    await prisma.bookingDocument.upsert({
      where: { bookingId_kind: { bookingId: id, kind } },
      create: { bookingId: id, kind, fileUrl: next[0], extraUrls: next.slice(1) },
      update: { fileUrl: next[0], extraUrls: next.slice(1), ...backToPending },
    });

    const all = await prisma.bookingDocument.findMany({
      where: { bookingId: id },
      select: { kind: true },
    });
    const missing = missingDocuments(all);

    // แจ้งแอดมินครั้งเดียวตอนเอกสารเพิ่งครบ ไม่ใช่ทุกรูปที่เพิ่มทีหลัง
    if (missing.length === 0 && !existing) {
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

/**
 * ลูกค้าลบรูปเอกสารทีละรูป — body: { kind, index }
 * ลบรูปสุดท้ายแล้วเอกสารชนิดนั้นกลับเป็น "ยังไม่ส่ง"
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { kind, index } = await request.json();
    if (!isDocumentKind(kind)) {
      return NextResponse.json({ error: "ชนิดเอกสารไม่ถูกต้อง" }, { status: 400 });
    }

    const loaded = await loadOpenBooking(id);
    if (loaded.error) return loaded.error;

    const doc = await prisma.bookingDocument.findUnique({
      where: { bookingId_kind: { bookingId: id, kind } },
    });
    const current = doc ? [doc.fileUrl, ...(doc.extraUrls ?? [])] : [];
    const i = Number(index);
    if (!doc || !(i >= 0 && i < current.length)) {
      return NextResponse.json({ error: "ไม่พบรูปที่จะลบ" }, { status: 404 });
    }

    const next = current.filter((_, j) => j !== i);
    if (next.length === 0) {
      await prisma.bookingDocument.delete({ where: { id: doc.id } });
    } else {
      await prisma.bookingDocument.update({
        where: { id: doc.id },
        data: { fileUrl: next[0], extraUrls: next.slice(1), ...backToPending },
      });
    }

    return NextResponse.json({ ok: true, remaining: next.length });
  } catch (err) {
    console.error("delete document image failed:", err);
    return NextResponse.json({ error: "ลบรูปไม่สำเร็จ" }, { status: 500 });
  }
}
