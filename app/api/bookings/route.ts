import { NextResponse } from "next/server";
import { createBooking } from "@/lib/create-booking";
import { getSessionCustomerId } from "@/lib/customer-session";

export async function POST(request: Request) {
  const body = await request.json();

  // ถ้าเข้าสู่ระบบด้วย LINE อยู่ ให้การจองไปเข้าบัญชีนั้นเสมอ
  // ไม่ต้องเชื่อชื่อ/เบอร์ในฟอร์มว่าเป็นตัวบ่งชี้ตัวตน — สองอย่างนั้นเป็นข้อมูลติดต่อ
  const customerId = await getSessionCustomerId();

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
    customerId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    bookingId: result.bookingId,
    isRequest: result.isRequest,
  });
}
