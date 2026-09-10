import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createBooking } from "@/lib/create-booking";
import { getProfileName } from "@/lib/line";
import { toBangkokDate, getSettings } from "@/lib/settings";
import { ACTIVE_BOOKING_STATUSES } from "@/lib/booking-status";

export const dynamic = "force-dynamic";

/** ยืนยัน idToken กับเซิร์ฟเวอร์ LINE — ห้ามเชื่อ userId ที่ client ส่งมา */
async function verifyIdToken(idToken: string): Promise<string | null> {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!channelId) {
    console.error("LINE_LOGIN_CHANNEL_ID is not set");
    return null;
  }

  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
  });

  if (!res.ok) {
    console.error("verify id_token failed:", res.status, await res.text());
    return null;
  }

  const payload = (await res.json()) as { sub?: string };
  return payload.sub ?? null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken, carId, startDate, endDate, startTime, endTime, phone, pickupPlace, returnPlace } =
      body;

    if (!idToken) {
      return NextResponse.json({ error: "ไม่พบข้อมูลยืนยันตัวตน" }, { status: 401 });
    }

    const lineUserId = await verifyIdToken(idToken);
    if (!lineUserId) {
      return NextResponse.json({ error: "ยืนยันตัวตนกับ LINE ไม่สำเร็จ" }, { status: 401 });
    }

    // ลูกค้าเก่าใช้เบอร์เดิมได้เลย ไม่ต้องกรอกซ้ำ
    const existing = await prisma.customer.findUnique({ where: { lineUserId } });
    const finalPhone = String(phone ?? "").replace(/[\s-]/g, "") || existing?.phone;

    if (!finalPhone) {
      return NextResponse.json({ error: "กรุณากรอกเบอร์โทร", needPhone: true }, { status: 400 });
    }
    if (!/^0\d{8,9}$/.test(finalPhone)) {
      return NextResponse.json({ error: "เบอร์โทรไม่ถูกต้อง" }, { status: 400 });
    }

    const name =
      existing?.fullName || (await getProfileName(lineUserId)) || "ลูกค้า LINE";

    // กันกดจองซ้ำเป็นสองรายการ — เน็ตช้าแล้วลูกค้ากดย้ำ หรือ LIFF ส่งซ้ำเอง
    // ถ้าคนเดิม รถคันเดิม ช่วงเวลาเดิม เพิ่งจองไปไม่เกิน 15 นาที ให้คืนรายการเดิมไปเลย
    if (existing) {
      const start = toBangkokDate(String(startDate), startTime);
      const end = toBangkokDate(String(endDate), endTime);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        const dupe = await prisma.booking.findFirst({
          where: {
            carId,
            customerId: existing.id,
            startDate: start,
            endDate: end,
            status: { in: [...ACTIVE_BOOKING_STATUSES] },
            createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
          },
          orderBy: { createdAt: "desc" },
        });
        if (dupe) {
          console.log("line book: duplicate suppressed", { requestId: body.requestId, bookingId: dupe.id });
          return NextResponse.json({
            bookingId: dupe.id,
            isRequest: dupe.status === "REQUESTED",
            totalPrice: dupe.totalPrice,
            deposit: (await getSettings()).bookingFee,
            duplicate: true,
          });
        }
      }
    }

    const result = await createBooking({
      carId,
      startDate,
      endDate,
      startTime,
      endTime,
      fullName: name,
      phone: finalPhone,
      lineUserId,
      pickupPlace,
      returnPlace,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      bookingId: result.bookingId,
      isRequest: result.isRequest,
      totalPrice: result.totalPrice,
      deposit: result.deposit,
    });
  } catch (err) {
    console.error("line book failed:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่" }, { status: 500 });
  }
}
