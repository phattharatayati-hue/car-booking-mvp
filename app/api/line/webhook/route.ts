import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyLineSignature, replyMessage } from "@/lib/line";

export const dynamic = "force-dynamic";

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { userId?: string; type?: string };
  message?: { type: string; text?: string };
};

const STATUS_TH: Record<string, string> = {
  PENDING_DEPOSIT: "รอตรวจสลิปมัดจำ",
  CONFIRMED: "ยืนยันแล้ว",
  CANCELLED: "ยกเลิกแล้ว",
  COMPLETED: "เสร็จสิ้น",
};

const HELP_TEXT = [
  "สวัสดีครับ 🚗 ระบบจองรถเช่า",
  "",
  "พิมพ์คำสั่งเหล่านี้ได้เลย:",
  "• รหัสจอง (เช่น A1B2C3D4) — เช็คสถานะการจอง",
  "• จองรถ — รับลิงก์หน้าจองรถ",
  "• ไอดี — ดู LINE User ID ของคุณ",
].join("\n");

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!verifyLineSignature(raw, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: { events?: LineEvent[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const events = body.events ?? [];

  // ตอบทีละ event — ถ้า event ไหนพัง ต้องไม่ทำให้ทั้ง request พัง
  // (LINE จะ retry ถ้าเราตอบไม่ใช่ 200)
  await Promise.all(events.map((e) => handleEvent(e).catch((err) => console.error("line event error:", err))));

  return NextResponse.json({ ok: true });
}

async function handleEvent(event: LineEvent) {
  const replyToken = event.replyToken;
  if (!replyToken) return;

  // เพิ่มเพื่อนใหม่
  if (event.type === "follow") {
    const userId = event.source?.userId ?? "-";
    await replyMessage(
      replyToken,
      `${HELP_TEXT}\n\n(LINE User ID ของคุณ: ${userId})`
    );
    return;
  }

  if (event.type !== "message" || event.message?.type !== "text") return;

  const text = (event.message.text ?? "").trim();
  const lower = text.toLowerCase();

  // ขอดู user id — ใช้ตอนตั้งค่า LINE_ADMIN_USER_ID
  if (lower === "ไอดี" || lower === "id" || lower === "userid") {
    await replyMessage(replyToken, `LINE User ID ของคุณคือ:\n${event.source?.userId ?? "-"}`);
    return;
  }

  if (lower.includes("จองรถ") || lower === "book") {
    const url = process.env.NEXT_PUBLIC_SITE_URL ?? "https://car-booking-mvp.vercel.app";
    await replyMessage(replyToken, `จองรถได้ที่นี่เลยครับ 🚗\n${url}/cars`);
    return;
  }

  // ดูเหมือนรหัสจอง (8 ตัวอักษร/ตัวเลข)
  if (/^[a-z0-9]{8}$/i.test(text)) {
    const booking = await prisma.booking.findFirst({
      where: { id: { startsWith: text.toLowerCase() } },
      include: { car: true, customer: true, deposit: true },
    });

    if (!booking) {
      await replyMessage(replyToken, `ไม่พบการจองรหัส ${text.toUpperCase()} ครับ\nกรุณาตรวจสอบรหัสอีกครั้ง`);
      return;
    }

    const lines = [
      `📋 การจอง ${booking.id.slice(0, 8).toUpperCase()}`,
      "",
      `รถ: ${booking.car.brand} ${booking.car.name}`,
      `ผู้เช่า: ${booking.customer.fullName}`,
      `วันที่: ${new Date(booking.startDate).toLocaleDateString("th-TH")} - ${new Date(
        booking.endDate
      ).toLocaleDateString("th-TH")}`,
      `ยอดรวม: ${booking.totalPrice.toLocaleString()} บาท`,
      `สถานะ: ${STATUS_TH[booking.status] ?? booking.status}`,
    ];

    if (!booking.deposit) {
      lines.push("", "⚠️ ยังไม่ได้อัปโหลดสลิปมัดจำ");
    } else if (booking.deposit.status === "PENDING") {
      lines.push("", "⏳ อัปโหลดสลิปแล้ว รอแอดมินตรวจสอบ");
    } else if (booking.deposit.status === "REJECTED") {
      lines.push("", "❌ สลิปไม่ผ่านการตรวจสอบ กรุณาติดต่อแอดมิน");
    }

    await replyMessage(replyToken, lines.join("\n"));
    return;
  }

  await replyMessage(replyToken, HELP_TEXT);
}
