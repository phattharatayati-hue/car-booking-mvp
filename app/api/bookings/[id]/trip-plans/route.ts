import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTripPlaces, getTripAreaRates } from "@/lib/trip-plans-server";
import { resolveTripPlans, type TripPlanInput } from "@/lib/trip-plans";

export const dynamic = "force-dynamic";

/**
 * ลูกค้าแก้แผนเดินทางจากหน้าติดตามการจอง — แก้ได้จนถึงเวลารับรถ
 *
 * ยอดรวมไม่เปลี่ยนตามอัตโนมัติ เพราะใบที่จ่ายค่าจองแล้วไม่ควรมียอดขยับเงียบ ๆ
 * ถ้าเรทของแผนใหม่ต่างจากเดิม แอดมินเห็นในหลังบ้านและตกลงกับลูกค้าเอง
 * (ลิงก์หน้าการจองเป็นกุญแจอยู่แล้ว — รหัสเดาไม่ได้ เหมือน API สลิปและเอกสาร)
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const inputs: TripPlanInput[] = Array.isArray(body?.tripPlans) ? body.tripPlans : [];

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { id: true, status: true, startDate: true },
    });
    if (!booking) {
      return NextResponse.json({ error: "ไม่พบการจองนี้" }, { status: 404 });
    }
    if (["CANCELLED", "REJECTED", "COMPLETED"].includes(booking.status)) {
      return NextResponse.json({ error: "การจองนี้ปิดแล้ว แก้แผนเดินทางไม่ได้" }, { status: 400 });
    }
    if (booking.startDate.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "เลยเวลารับรถแล้ว หากต้องการเปลี่ยนแผน กรุณาแจ้งแอดมิน" },
        { status: 400 }
      );
    }

    const [places, areaRates] = await Promise.all([getTripPlaces(), getTripAreaRates()]);
    const resolved = resolveTripPlans(inputs, places, areaRates);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.bookingTripPlan.deleteMany({ where: { bookingId: id } }),
      prisma.bookingTripPlan.createMany({
        data: resolved.plans.map((p, i) => ({ ...p, bookingId: id, sortOrder: i })),
      }),
      prisma.booking.update({
        where: { id },
        data: { tripOutsideArea: resolved.plans.some((p) => p.outsideArea) },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("save trip plans failed:", err);
    return NextResponse.json({ error: "บันทึกแผนเดินทางไม่สำเร็จ" }, { status: 500 });
  }
}
