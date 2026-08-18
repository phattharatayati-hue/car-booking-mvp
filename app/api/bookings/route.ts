import { NextResponse } from "next/server";
import { createBooking } from "@/lib/create-booking";

export async function POST(request: Request) {
  const body = await request.json();

  const result = await createBooking({
    carId: body.carId,
    startDate: body.startDate,
    endDate: body.endDate,
    startTime: body.startTime,
    endTime: body.endTime,
    fullName: body.fullName,
    phone: body.phone,
    email: body.email,
    pickupPlace: body.pickupPlace,
    returnPlace: body.returnPlace,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    bookingId: result.bookingId,
    isRequest: result.isRequest,
  });
}
