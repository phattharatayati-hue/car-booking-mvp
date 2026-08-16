import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const car = await prisma.car.update({
    where: { id },
    data: {
      name: body.name,
      brand: body.brand,
      licensePlate: body.licensePlate,
      pricePerDay: body.pricePerDay !== undefined ? Number(body.pricePerDay) : undefined,
      photoUrl: body.photoUrl,
      status: body.status,
      costPerDay:
        body.costPerDay === undefined
          ? undefined
          : body.costPerDay === null || body.costPerDay === ""
          ? null
          : Number(body.costPerDay),
      partnerId: body.partnerId === undefined ? undefined : body.partnerId || null,
      // ผูกเจ้าของรถ = รถพาร์ทเนอร์เสมอ กันข้อมูลขัดกัน
      source:
        body.partnerId !== undefined
          ? body.partnerId
            ? "PARTNER"
            : "OWN"
          : body.source,
    },
  });

  return NextResponse.json(car);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // ลบรถที่มีประวัติการจองไม่ได้ ไม่งั้นข้อมูลการจองจะเสียหาย
  const bookingCount = await prisma.booking.count({ where: { carId: id } });
  if (bookingCount > 0) {
    return NextResponse.json(
      {
        error: `ลบไม่ได้ เพราะรถคันนี้มีประวัติการจอง ${bookingCount} รายการ — แนะนำให้ "ปิดใช้งาน" แทน`,
      },
      { status: 409 }
    );
  }

  await prisma.car.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
