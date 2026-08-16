import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * ผูก LINE ของลูกค้าเข้ากับการจอง
 *
 * รับ idToken จาก LIFF/LINE Login แล้ว **ตรวจสอบกับเซิร์ฟเวอร์ LINE ก่อนเสมอ**
 * ห้ามเชื่อ userId ที่ส่งมาจากฝั่ง client ตรงๆ เพราะปลอมได้
 */
export async function POST(request: Request) {
  try {
    const { idToken, bookingId } = await request.json();

    if (!idToken || !bookingId) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
    }

    const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
    if (!channelId) {
      console.error("LINE_LOGIN_CHANNEL_ID is not set");
      return NextResponse.json({ error: "ระบบยังไม่ได้ตั้งค่า LINE Login" }, { status: 500 });
    }

    // ตรวจสอบ idToken กับ LINE — ได้ userId ที่เชื่อถือได้กลับมา
    const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
    });

    if (!verifyRes.ok) {
      console.error("verify id_token failed:", verifyRes.status, await verifyRes.text());
      return NextResponse.json({ error: "ยืนยันตัวตนกับ LINE ไม่สำเร็จ" }, { status: 401 });
    }

    const payload = (await verifyRes.json()) as { sub?: string; name?: string };
    const lineUserId = payload.sub;

    if (!lineUserId) {
      return NextResponse.json({ error: "ไม่พบข้อมูลผู้ใช้จาก LINE" }, { status: 401 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "ไม่พบรายการจอง" }, { status: 404 });
    }

    await prisma.customer.update({
      where: { id: booking.customerId },
      data: { lineUserId },
    });

    return NextResponse.json({ ok: true, name: booking.customer.fullName });
  } catch (err) {
    console.error("link-customer failed:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่" }, { status: 500 });
  }
}
