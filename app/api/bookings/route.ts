import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const { carId, startDate, endDate, fullName, phone, email } = body;

  if (!carId || !startDate || !endDate || !fullName || !phone) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
  }

  const car = await prisma.car.findUnique({ where: { id: carId } });
  if (!car || car.status !== "AVAILABLE") {
    return NextResponse.json({ error: "รถคันนี้ไม่ว่างแล้ว" }, { status: 400 });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const totalPrice = days * car.pricePerDay;

  const customer = await prisma.customer.create({
    data: { fullName, phone, email: email || null },
  });

  if (customer.isBlacklisted) {
    return NextResponse.json({ error: "ไม่สามารถจองได้ กรุณาติดต่อแอดมิน" }, { status: 403 });
  }

  const booking = await prisma.booking.create({
    data: {
      carId,
      customerId: customer.id,
      startDate: start,
      endDate: end,
      totalPrice,
    },
  });

  return NextResponse.json({ bookingId: booking.id });
}
