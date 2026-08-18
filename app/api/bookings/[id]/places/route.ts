import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePlace } from "@/lib/pickup-points";
import { getPickupPoints } from "@/lib/pickup-points-server";

export const dynamic = "force-dynamic";

/**
 * ลูกค้าเลือกหรือแก้จุดรับ-ส่งรถหลังจองแล้ว
 * ใช้กับการจองที่มาจากแชท LINE ซึ่งยังไม่ได้เลือกจุดตอนจอง
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      return NextResponse.json({ error: "ไม่พบการจองนี้" }, { status: 404 });
    }
    if (["CANCELLED", "REJECTED", "COMPLETED"].includes(booking.status)) {
      return NextResponse.json(
        { error: "การจองนี้ปิดแล้ว ไม่สามารถแก้ไขได้" },
        { status: 400 }
      );
    }

    const points = await getPickupPoints();
    const pickupPlace = normalizePlace(body?.pickupPlace, points);
    const returnPlace = normalizePlace(body?.returnPlace, points);

    if (!pickupPlace || !returnPlace) {
      return NextResponse.json({ error: "กรุณาเลือกจุดรับและจุดคืนรถ" }, { status: 400 });
    }

    await prisma.booking.update({
      where: { id },
      data: { pickupPlace, returnPlace },
    });

    return NextResponse.json({ ok: true, pickupPlace, returnPlace });
  } catch (err) {
    console.error("update places failed:", err);
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  }
}
