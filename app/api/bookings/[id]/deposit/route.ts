import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmin, buildSlipUploadedMessage, siteUrl } from "@/lib/line";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { slipImageUrl, amount } = body;

  if (!slipImageUrl) {
    return NextResponse.json({ error: "ไม่พบไฟล์สลิป" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { deposit: true, car: true, customer: true },
  });
  if (!booking) {
    return NextResponse.json({ error: "ไม่พบรายการจอง" }, { status: 404 });
  }

  const deposit = await prisma.deposit.upsert({
    where: { bookingId: id },
    create: {
      bookingId: id,
      amount: Number(amount) || 0,
      slipImageUrl,
      status: "PENDING",
    },
    update: {
      slipImageUrl,
      amount: Number(amount) || 0,
      status: "PENDING",
    },
  });

  try {
    await notifyAdmin(
      buildSlipUploadedMessage({
        bookingId: booking.id,
        carLabel: `${booking.car.brand} ${booking.car.name}`,
        customerName: booking.customer.fullName,
        amount: deposit.amount,
        siteUrl: siteUrl(),
      })
    );
  } catch (err) {
    console.error("notifyAdmin failed:", err);
  }

  return NextResponse.json(deposit);
}
