import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmin, buildNewBookingMessage, siteUrl } from "@/lib/line";

/** สถานะที่ถือว่ารถถูกจองอยู่จริง (ยกเลิกแล้วไม่นับ) */
const ACTIVE_STATUSES = ["PENDING_DEPOSIT", "CONFIRMED"] as const;

export async function POST(request: Request) {
  const body = await request.json();
  const { carId, startDate, endDate, fullName, phone, email } = body;

  if (!carId || !startDate || !endDate || !fullName || !phone) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "รูปแบบวันที่ไม่ถูกต้อง" }, { status: 400 });
  }

  if (end <= start) {
    return NextResponse.json(
      { error: "วันคืนรถต้องหลังวันรับรถ" },
      { status: 400 }
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (start < today) {
    return NextResponse.json({ error: "เลือกวันรับรถย้อนหลังไม่ได้" }, { status: 400 });
  }

  const car = await prisma.car.findUnique({ where: { id: carId } });
  if (!car || car.status !== "AVAILABLE") {
    return NextResponse.json({ error: "รถคันนี้ไม่เปิดให้จอง" }, { status: 400 });
  }

  // กันจองซ้ำช่วงวันที่ทับกัน
  // ทับกันเมื่อ: การจองเดิมเริ่มก่อนที่เราคืน และคืนหลังที่เรารับ
  const overlapping = await prisma.booking.findFirst({
    where: {
      carId,
      status: { in: [...ACTIVE_STATUSES] },
      startDate: { lt: end },
      endDate: { gt: start },
    },
  });

  if (overlapping) {
    return NextResponse.json(
      { error: "รถคันนี้ถูกจองในช่วงวันที่เลือกแล้ว กรุณาเลือกวันอื่นหรือรถคันอื่น" },
      { status: 409 }
    );
  }

  const days = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );
  const totalPrice = days * car.pricePerDay;

  // ใช้ลูกค้าเดิมถ้าเบอร์ตรงกัน — เพื่อให้ blacklist และประวัติการจองใช้งานได้จริง
  const normalizedPhone = String(phone).replace(/[\s-]/g, "");
  let customer = await prisma.customer.findFirst({ where: { phone: normalizedPhone } });

  if (customer?.isBlacklisted) {
    return NextResponse.json(
      { error: "ไม่สามารถจองได้ กรุณาติดต่อแอดมิน" },
      { status: 403 }
    );
  }

  if (customer) {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: { fullName, email: email || customer.email },
    });
  } else {
    customer = await prisma.customer.create({
      data: { fullName, phone: normalizedPhone, email: email || null },
    });
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

  // แจ้งเตือนแอดมินทาง LINE — ถ้าส่งไม่สำเร็จก็ไม่ควรทำให้การจองล้มเหลว
  try {
    await notifyAdmin(
      buildNewBookingMessage({
        bookingId: booking.id,
        carLabel: `${car.brand} ${car.name}`,
        customerName: fullName,
        phone: normalizedPhone,
        startDate: start,
        endDate: end,
        totalPrice,
        siteUrl: siteUrl(),
      })
    );
  } catch (err) {
    console.error("notifyAdmin failed:", err);
  }

  return NextResponse.json({ bookingId: booking.id });
}
