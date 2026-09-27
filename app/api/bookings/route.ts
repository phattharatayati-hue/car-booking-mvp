import { NextResponse } from "next/server";
import { createBooking } from "@/lib/create-booking";
import { getSessionCustomerId } from "@/lib/customer-session";
import { prisma } from "@/lib/prisma";
import { isLineFriend, NEED_LINE_MSG, NEED_FRIEND_MSG } from "@/lib/line-friend";

export async function POST(request: Request) {
  const body = await request.json();

  // ถ้าเข้าสู่ระบบด้วย LINE อยู่ ให้การจองไปเข้าบัญชีนั้นเสมอ
  // ไม่ต้องเชื่อชื่อ/เบอร์ในฟอร์มว่าเป็นตัวบ่งชี้ตัวตน — สองอย่างนั้นเป็นข้อมูลติดต่อ
  const customerId = await getSessionCustomerId();

  /* บริษัทกำหนด: จองได้เฉพาะลูกค้าที่เข้าสู่ระบบด้วย LINE และแอดเพื่อน OA แล้วเท่านั้น */
  const me = customerId
    ? await prisma.customer.findUnique({ where: { id: customerId }, select: { lineUserId: true } })
    : null;
  if (!me?.lineUserId) {
    return NextResponse.json({ error: NEED_LINE_MSG, needLine: true }, { status: 401 });
  }
  if ((await isLineFriend(me.lineUserId)) === false) {
    return NextResponse.json({ error: NEED_FRIEND_MSG, needFriend: true }, { status: 403 });
  }

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
    channel: "WEB",
    tripPlans: Array.isArray(body.tripPlans) ? body.tripPlans : [],
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    bookingId: result.bookingId,
    isRequest: result.isRequest,
  });
}
