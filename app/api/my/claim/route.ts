import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionCustomer } from "@/lib/customer-session";

export const dynamic = "force-dynamic";

/**
 * ย้ายการจองที่ทำไว้ตอน "ไม่ได้เข้าสู่ระบบ" มาเข้าบัญชี LINE ของตัวเอง
 *
 * หลักฐานที่ยอมรับคือ "ถือรหัสการจองอยู่" — รหัสเป็น cuid ที่เดาไม่ได้
 * และรู้ได้เฉพาะคนที่จองเอง (หรือคนที่เจ้าตัวส่งลิงก์ให้)
 *
 * ย้ายได้เฉพาะการจองที่เจ้าของยังไม่ผูก LINE เท่านั้น
 * ถ้าการจองเป็นของบัญชีที่ยืนยันตัวตนแล้ว จะไม่ยอมย้ายให้ไม่ว่ากรณีใด
 */
export async function POST(request: Request) {
  const me = await getSessionCustomer();
  if (!me) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบด้วย LINE ก่อน" }, { status: 401 });
  }

  const { bookingId } = await request.json();
  if (!bookingId || typeof bookingId !== "string") {
    return NextResponse.json({ error: "ไม่พบรายการจอง" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "ไม่พบรายการจอง" }, { status: 404 });
  }
  if (booking.customerId === me.id) {
    return NextResponse.json({ ok: true, already: true });
  }
  if (booking.customer.lineUserId) {
    return NextResponse.json(
      { error: "การจองนี้อยู่ในบัญชีอื่นแล้ว กรุณาติดต่อแอดมิน" },
      { status: 403 }
    );
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { customerId: me.id },
  });

  // บัญชีที่เพิ่งสร้างจาก LINE ยังไม่มีเบอร์/ชื่อจริง — ยกจากใบจองมาเติมให้
  await prisma.customer.update({
    where: { id: me.id },
    data: {
      phone: me.phone || booking.customer.phone,
      fullName:
        me.fullName && me.fullName !== "ลูกค้า LINE"
          ? me.fullName
          : booking.customer.fullName,
      email: me.email ?? booking.customer.email,
    },
  });

  return NextResponse.json({ ok: true });
}
