import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyLineSignature, replyMessage } from "@/lib/line";
import { consumeLinkCode } from "@/lib/line-link";
import {
  startBooking,
  handlePostback,
  handlePhoneInput,
  handleSlipImage,
  cancelDraft,
} from "@/lib/line-booking";

export const dynamic = "force-dynamic";

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { userId?: string; type?: string };
  message?: { type: string; text?: string; id?: string };
  postback?: { data: string; params?: { date?: string } };
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
  "• จองรถ — เลือกรถและจองในแชทนี้",
  "• เช็คสถานะ — ติดตามการจอง",
  "• ติดต่อ — เบอร์โทรและเวลาทำการ",
  "",
  "หรือกดปุ่มจากเมนูด้านล่างได้เลยครับ",
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

  // LINE จะ retry ถ้าเราไม่ตอบ 200 — จึงกันไม่ให้ event เดียวพังทั้งชุด
  await Promise.all(
    events.map((e) => handleEvent(e).catch((err) => console.error("line event error:", err)))
  );

  return NextResponse.json({ ok: true });
}

async function handleEvent(event: LineEvent) {
  const replyToken = event.replyToken;
  const userId = event.source?.userId;
  if (!replyToken) return;

  // ปุ่มต่างๆ ในแชท (เลือกรถ / เลือกวัน / ยืนยัน)
  if (event.type === "postback" && event.postback && userId) {
    await handlePostback(
      replyToken,
      userId,
      event.postback.data,
      event.postback.params?.date
    );
    return;
  }

  // เพิ่มเพื่อนใหม่
  if (event.type === "follow") {
    await replyMessage(replyToken, HELP_TEXT);
    return;
  }

  if (event.type !== "message" || !userId) return;

  // ลูกค้าส่งรูปสลิปเข้ามา
  if (event.message?.type === "image" && event.message.id) {
    await handleSlipImage(replyToken, userId, event.message.id);
    return;
  }

  if (event.message?.type !== "text") return;

  const text = (event.message.text ?? "").trim();
  const lower = text.toLowerCase();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://car-booking-mvp.vercel.app";

  // รหัสผูกบัญชีแอดมิน 6 หลัก
  if (/^\d{6}$/.test(text)) {
    const result = await consumeLinkCode(text, userId);

    if (result.ok) {
      await replyMessage(
        replyToken,
        `✅ ผูกบัญชีสำเร็จ\n\nสวัสดีคุณ ${result.name}\nจากนี้คุณจะได้รับแจ้งเตือนเมื่อมีการจองใหม่และเมื่อลูกค้าอัปโหลดสลิปมัดจำ`
      );
      return;
    }
    if (result.reason === "expired") {
      await replyMessage(
        replyToken,
        "⌛ รหัสหมดอายุแล้ว (รหัสมีอายุ 10 นาที)\nกรุณากดสร้างรหัสใหม่ในหน้าจัดการแอดมิน"
      );
      return;
    }
    if (result.reason === "already_linked") {
      await replyMessage(
        replyToken,
        "⚠️ LINE นี้ถูกผูกกับบัญชีแอดมินอื่นอยู่แล้ว"
      );
      return;
    }
    // ไม่ใช่รหัสผูก — อาจเป็นเบอร์โทรหรืออย่างอื่น ปล่อยให้ตรวจต่อด้านล่าง
  }

  // ยกเลิกการจองที่ทำค้างไว้
  if (lower === "ยกเลิก" || lower === "cancel") {
    await cancelDraft(replyToken, userId);
    return;
  }

  // อยู่ระหว่างรอเบอร์โทร
  if (await handlePhoneInput(replyToken, userId, text)) return;

  // เริ่มจองรถในแชท
  if (text.includes("จองรถ") || lower === "book") {
    await startBooking(replyToken, userId);
    return;
  }

  if (lower === "ไอดี" || lower === "id" || lower === "userid") {
    await replyMessage(replyToken, `LINE User ID ของคุณคือ:\n${userId}`);
    return;
  }

  // เช็คสถานะ
  if (text.includes("เช็คสถานะ") || text.includes("สถานะ")) {
    const customer = await prisma.customer.findFirst({ where: { lineUserId: userId } });

    if (customer) {
      const booking = await prisma.booking.findFirst({
        where: { customerId: customer.id },
        orderBy: { createdAt: "desc" },
        include: { car: true, deposit: true },
      });

      if (booking) {
        await replyMessage(replyToken, formatBooking(booking));
        return;
      }
    }

    await replyMessage(
      replyToken,
      [
        "📋 เช็คสถานะการจอง",
        "",
        "ยังไม่พบการจองของคุณครับ",
        "",
        'ถ้ามีรหัสจองอยู่แล้ว พิมพ์รหัส 8 หลักได้เลย',
        'หรือพิมพ์ "จองรถ" เพื่อเริ่มจองใหม่',
      ].join("\n")
    );
    return;
  }

  if (text.includes("ติดต่อ")) {
    await replyMessage(
      replyToken,
      [
        "📞 ติดต่อเรา",
        "",
        "โทร: 053-000-000",
        "เวลาทำการ: จันทร์-ศุกร์ 08:00-20:00 น.",
        "เสาร์-อาทิตย์ 09:00-18:00 น.",
        "",
        "หรือพิมพ์คำถามทิ้งไว้ แอดมินจะติดต่อกลับครับ",
        `${site}/contact`,
      ].join("\n")
    );
    return;
  }

  // รหัสจอง 8 หลัก
  if (/^[a-z0-9]{8}$/i.test(text)) {
    const booking = await prisma.booking.findFirst({
      where: { id: { startsWith: text.toLowerCase() } },
      include: { car: true, customer: true, deposit: true },
    });

    if (!booking) {
      await replyMessage(
        replyToken,
        `ไม่พบการจองรหัส ${text.toUpperCase()} ครับ\nกรุณาตรวจสอบรหัสอีกครั้ง`
      );
      return;
    }

    await replyMessage(replyToken, formatBooking(booking));
    return;
  }

  await replyMessage(replyToken, HELP_TEXT);
}

type BookingForDisplay = {
  id: string;
  status: string;
  totalPrice: number;
  startDate: Date;
  endDate: Date;
  car: { brand: string; name: string };
  deposit: { status: string } | null;
};

function formatBooking(booking: BookingForDisplay) {
  const lines = [
    `📋 การจอง ${booking.id.slice(0, 8).toUpperCase()}`,
    "",
    `รถ: ${booking.car.brand} ${booking.car.name}`,
    `วันที่: ${new Date(booking.startDate).toLocaleDateString("th-TH")} - ${new Date(
      booking.endDate
    ).toLocaleDateString("th-TH")}`,
    `ยอดรวม: ${booking.totalPrice.toLocaleString()} บาท`,
    `สถานะ: ${STATUS_TH[booking.status] ?? booking.status}`,
  ];

  if (!booking.deposit) {
    lines.push("", "⚠️ ยังไม่ได้ส่งสลิปมัดจำ", "ส่งรูปสลิปเข้ามาในแชทนี้ได้เลยครับ");
  } else if (booking.deposit.status === "PENDING") {
    lines.push("", "⏳ ได้รับสลิปแล้ว รอแอดมินตรวจสอบ");
  } else if (booking.deposit.status === "REJECTED") {
    lines.push("", "❌ สลิปไม่ผ่านการตรวจสอบ กรุณาติดต่อแอดมิน");
  } else {
    lines.push("", "✅ ยืนยันมัดจำเรียบร้อยแล้ว");
  }

  return lines.join("\n");
}
