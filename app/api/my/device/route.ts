import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { STATUS_LABEL } from "@/lib/booking-status";

export const dynamic = "force-dynamic";

/** ขอสรุปการจองจากรหัสที่เครื่องผู้ใช้จำไว้ (ดู lib/device-bookings.ts) */
const MAX_IDS = 20;

/**
 * คืนสรุปสั้นๆ ของการจองตามรหัสที่ส่งมา
 *
 * เรื่องความปลอดภัย — ผู้ขอต้อง "รู้รหัสการจอง" อยู่แล้วถึงจะถามได้
 * ซึ่งเป็น cuid ที่เดาไม่ได้ เท่ากับการถือลิงก์ `/booking/<id>` อยู่ในมือ
 * จึงไม่ได้เปิดอะไรเพิ่มจากที่เปิดอยู่แล้ว และคืนเฉพาะข้อมูลย่อ
 * ไม่มีชื่อ เบอร์ เอกสาร หรือสลิป
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const ids: unknown = body?.ids;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ bookings: [] });
  }

  const clean = ids
    .filter((v): v is string => typeof v === "string" && v.length > 0 && v.length < 60)
    .slice(0, MAX_IDS);

  if (clean.length === 0) return NextResponse.json({ bookings: [] });

  const rows = await prisma.booking.findMany({
    where: { id: { in: clean } },
    include: { car: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    bookings: rows.map((b) => ({
      id: b.id,
      code: b.id.slice(0, 8).toUpperCase(),
      carLabel: `${b.car.brand} ${b.car.name}`,
      startDate: b.startDate,
      endDate: b.endDate,
      totalPrice: b.totalPrice,
      status: b.status,
      statusLabel: STATUS_LABEL[b.status] ?? b.status,
    })),
  });
}
