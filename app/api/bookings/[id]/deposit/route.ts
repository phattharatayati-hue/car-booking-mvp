import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdminRaw, pushRaw, siteUrl } from "@/lib/line";
import { flexSlipReceived, flexSlipUploadedAdmin } from "@/lib/line-flex";
import { DOCUMENT_LABEL, unresolvedDocuments } from "@/lib/documents";
import { getSettings } from "@/lib/settings";
import { tripPlanLabel } from "@/lib/trip-plans";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  /* amount คือ "ยอดที่ลูกค้าแจ้งว่าโอน" ไม่ใช่ยอดที่ระบบเรียกเก็บ
     เก็บไว้เพื่อให้แอดมินเทียบกับสลิปได้ว่าโอนมาตรงกับค่าจองไหม
     จึงต้องรับค่าจากลูกค้า แต่ต้องตรวจให้อยู่ในช่วงที่สมเหตุสมผลก่อน */
  const { slipImageUrl, amount } = body;

  if (!slipImageUrl) {
    return NextResponse.json({ error: "ไม่พบไฟล์สลิป" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      deposit: true,
      car: true,
      customer: true,
      documents: true,
      tripPlans: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!booking) {
    return NextResponse.json({ error: "ไม่พบรายการจอง" }, { status: 404 });
  }

  /* ใบที่ปิดไปแล้วห้ามรับสลิป — สำคัญตั้งแต่มีการยกเลิกอัตโนมัติเมื่อไม่โอนตามเวลา
     ลูกค้าที่เปิดหน้าค้างไว้แล้วเพิ่งกดอัปอาจยิงเข้ามาหลังใบถูกยกเลิกไปแล้ว
     ถ้ารับไว้เงียบ ๆ จะกลายเป็นเงินที่โอนมาโดยไม่มีคิวรถรองรับ */
  if (["CANCELLED", "REJECTED", "COMPLETED"].includes(booking.status)) {
    return NextResponse.json(
      {
        error:
          "การจองนี้ถูกปิดไปแล้ว — หากเพิ่งโอนเงินมา กรุณาติดต่อแอดมินเพื่อคืนเงินหรือเปิดใบจองใหม่",
      },
      { status: 409 }
    );
  }

  /* สลิปที่แอดมินยืนยันไปแล้วห้ามถูกทับ
     ไม่งั้นลูกค้าอัปใหม่ทีหลังแล้วสถานะจะถอยกลับเป็น "รอตรวจ" เงียบ ๆ
     ทั้งที่แอดมินตรวจและรับเงินไปแล้ว */
  if (booking.deposit?.status === "CONFIRMED") {
    return NextResponse.json(
      { error: "สลิปนี้ได้รับการยืนยันแล้ว หากต้องการแก้ไข กรุณาติดต่อแอดมิน" },
      { status: 409 }
    );
  }

  const declared = Math.floor(Number(amount));
  if (!Number.isFinite(declared) || declared < 1 || declared > 1_000_000) {
    return NextResponse.json(
      { error: "ยอดที่โอนไม่ถูกต้อง กรุณากรอกเป็นตัวเลขบาท" },
      { status: 400 }
    );
  }

  // มีสลิปแล้ว คิวรถถือว่าถูกยึดไว้ให้ถาวร ไม่ต้องนับถอยหลังอีก
  await prisma.booking.update({ where: { id }, data: { holdUntil: null } });

  const deposit = await prisma.deposit.upsert({
    where: { bookingId: id },
    create: {
      bookingId: id,
      amount: declared,
      slipImageUrl,
      status: "PENDING",
    },
    update: {
      slipImageUrl,
      amount: declared,
      status: "PENDING",
    },
  });

  try {
    await notifyAdminRaw(
      flexSlipUploadedAdmin({
        bookingId: booking.id,
        carLabel: `${booking.car.brand} ${booking.car.name}`,
        customerName: booking.customer.fullName,
        amount: deposit.amount,
        adminUrl: `${siteUrl()}/admin/bookings`,
      })
    );
  } catch (err) {
    console.error("notifyAdmin failed:", err);
  }

  /* ส่งต่อให้ลูกค้าอัปโหลดเอกสารทันที ไม่ต้องรอแอดมินตรวจสลิป
     ลูกค้าที่จองโดยไม่ผูก LINE จะไม่ได้ข้อความนี้ แต่หน้าเว็บเปิดช่องเอกสารให้ต่ออยู่แล้ว */
  if (booking.customer.lineUserId) {
    try {
      const defaultDeposit = (await getSettings()).securityDeposit;
      const carDeposit = booking.car.securityDeposit;
      await pushRaw(booking.customer.lineUserId, [
        flexSlipReceived({
          tripPlans: booking.tripPlans.map((t) => tripPlanLabel(t)),
          specialDeposit:
            carDeposit != null && carDeposit !== defaultDeposit ? carDeposit : null,
          bookingId: booking.id,
          carLabel: `${booking.car.brand} ${booking.car.name}`,
          missing: unresolvedDocuments(booking.documents).map((k) => DOCUMENT_LABEL[k]),
          bookingUrl: `${siteUrl()}/booking/${booking.id}`,
        }),
      ]);
    } catch (err) {
      console.error("push slip received failed:", err);
    }
  }

  return NextResponse.json(deposit);
}
