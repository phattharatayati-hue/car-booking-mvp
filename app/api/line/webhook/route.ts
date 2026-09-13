import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyLineSignature,
  replyMessage,
  replyPlain,
  replyRaw,
  siteUrl,
} from "@/lib/line";
import {
  myJobsFlex,
  closeJob,
  ackJob,
  saveJobPhoto,
  saveJobReading,
  driverHelpText,
} from "@/lib/driver-jobs";
import { highlightFees, SECURITY_DEPOSIT } from "@/lib/fees";
import { consumeLinkCode } from "@/lib/line-link";
import { formatBangkokDateTime } from "@/lib/settings";
import { PHONES, OFFICE_HOURS } from "@/lib/contact";
import {
  flexBookingStatus,
  flexStatusEmpty,
  flexFees,
  flexContact,
} from "@/lib/line-flex";
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
  postback?: { data: string; params?: { date?: string; datetime?: string } };
};

const STATUS_TH: Record<string, string> = {
  PENDING_DEPOSIT: "รอตรวจสลิปค่าจอง",
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

/** คำที่คนรับ-ส่งรถใช้เรียกดูคิวงานของตัวเอง */
function isMyJobsKeyword(text: string, lower: string): boolean {
  return (
    text.includes("งานของฉัน") ||
    text.includes("งานของผม") ||
    text.includes("คิวงาน") ||
    lower === "myjobs" ||
    lower === "jobs"
  );
}

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

  // ปุ่มปิดงานของคนรับ-ส่งรถ
  if (event.type === "postback" && event.postback && userId) {
    const params = new URLSearchParams(event.postback.data);
    const jobAction = params.get("action");
    const jobId = params.get("id") ?? "";

    if (jobAction === "job_ack") {
      await replyMessage(replyToken, await ackJob(jobId, userId));
      return;
    }
    if (jobAction === "job_done") {
      await replyMessage(replyToken, await closeJob(jobId, userId));
      return;
    }
  }

  // ปุ่มต่างๆ ในแชท (เลือกรถ / เลือกวัน / ยืนยัน)
  if (event.type === "postback" && event.postback && userId) {
    await handlePostback(
      replyToken,
      userId,
      event.postback.data,
      event.postback.params?.datetime ?? event.postback.params?.date
    );
    return;
  }

  // เพิ่มเพื่อนใหม่
  if (event.type === "follow") {
    await replyMessage(replyToken, HELP_TEXT);
    return;
  }

  if (event.type !== "message" || !userId) return;

  // รูปจากคนรับ-ส่งรถ = รูปสภาพรถ ต้องเช็คก่อนรูปสลิปลูกค้า
  if (event.message?.type === "image" && event.message.id) {
    const handoff = await saveJobPhoto(userId, event.message.id);
    if (handoff) {
      await replyMessage(replyToken, handoff);
      return;
    }

    // ไม่ใช่พนักงาน — ถือเป็นสลิปค่าจองของลูกค้า
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
        `✅ ผูกบัญชีสำเร็จ\n\nสวัสดีคุณ ${result.name}\nจากนี้คุณจะได้รับแจ้งเตือนเมื่อมีการจองใหม่และเมื่อลูกค้าอัปโหลดสลิปค่าจอง`
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

  // คิวงานของคนรับ-ส่งรถ
  if (isMyJobsKeyword(text, lower)) {
    const jobs = await myJobsFlex(userId);
    if (jobs) {
      await replyRaw(replyToken, jobs);
      return;
    }
    // ไม่ใช่พนักงาน — ตอบตามปกติต่อไป
  }

  // คนรับ-ส่งรถพิมพ์เลขไมล์/ระดับน้ำมันเข้ามา
  const reading = await saveJobReading(userId, text);
  if (reading) {
    await replyMessage(replyToken, reading);
    return;
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

  // ค่าปรับและค่าบริการเพิ่มเติม — ให้ลูกค้าเปิดดูเองได้ ไม่ต้องรอแอดมิน
  if (
    text.includes("ค่าปรับ") ||
    text.includes("ค่าเสียหาย") ||
    text.includes("เงินประกัน") ||
    lower === "fees"
  ) {
    await replyRaw(replyToken, [
      flexFees({
        lines: highlightFees().map((f) => `${f.title} — ${f.amount}`),
        depositNote: `เงินประกันความเสียหาย ${SECURITY_DEPOSIT.amount.toLocaleString()} บาท คืนเต็มจำนวนถ้าคืนรถเรียบร้อย`,
        url: `${siteUrl()}/fees`,
      }),
    ]);
    return;
  }

  if (lower === "ไอดี" || lower === "id" || lower === "userid") {
    // ส่งเป็นข้อความจริง ไม่ใช่การ์ด — ต้องกดค้างคัดลอก ID ไปใส่ env ได้
    await replyPlain(replyToken, `LINE User ID ของคุณคือ:\n${userId}`);
    return;
  }

  // เช็คสถานะ
  if (text.includes("เช็คสถานะ") || text.includes("สถานะ")) {
    const customer = await prisma.customer.findUnique({ where: { lineUserId: userId } });

    if (customer) {
      const booking = await prisma.booking.findFirst({
        where: { customerId: customer.id },
        orderBy: { createdAt: "desc" },
        include: { car: true, deposit: true },
      });

      if (booking) {
        await replyRaw(replyToken, [bookingStatusFlex(booking, site)]);
        return;
      }
    }

    await replyRaw(replyToken, [flexStatusEmpty({ carsUrl: `${site}/cars` })]);
    return;
  }

  if (text.includes("ติดต่อ")) {
    await replyRaw(replyToken, [
      flexContact({
        phones: PHONES,
        hours: [`เวลาทำการ: ${OFFICE_HOURS[0]}`, OFFICE_HOURS[1]],
        url: `${site}/contact`,
      }),
    ]);
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

    await replyRaw(replyToken, [bookingStatusFlex(booking, site)]);
    return;
  }

  // คนรับ-ส่งรถได้คำแนะนำของพนักงาน ไม่ใช่เมนูลูกค้า
  const staffHelp = await driverHelpText(userId);
  if (staffHelp) {
    await replyMessage(replyToken, staffHelp);
    return;
  }

  /* ลูกค้าพิมพ์ข้อความทั่วไปที่ไม่ใช่คำสั่ง — ไม่ตอบอะไรเลย
     เพราะแอดมินเป็นคนคุยกับลูกค้าเองในแชทนี้ (Chat: On)
     ถ้าบอทเด้งเมนูช่วยเหลือทุกครั้งที่ลูกค้าพิมพ์ จะไปแทรกกลางบทสนทนาของคน
     เมนูแนะนำจึงส่งครั้งเดียวตอนแอดเพื่อน (follow event) ก็พอ */
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

/** การ์ดสถานะการจองสำหรับลูกค้า — แทนข้อความเปล่าเดิม กดเปิดหน้าการจองได้จากการ์ด */
function bookingStatusFlex(booking: BookingForDisplay, site: string) {
  let note: string;
  let tone: "green" | "ok" | "warn" | "danger";

  if (!booking.deposit) {
    note = "ยังไม่ได้ส่งสลิปค่าจอง — ส่งรูปสลิปเข้ามาในแชทนี้ได้เลยครับ";
    tone = "warn";
  } else if (booking.deposit.status === "PENDING") {
    note = "ได้รับสลิปแล้ว รอแอดมินตรวจสอบ";
    tone = "green";
  } else if (booking.deposit.status === "REJECTED") {
    note = "สลิปไม่ผ่านการตรวจสอบ กรุณาติดต่อแอดมิน";
    tone = "danger";
  } else {
    note = "ยืนยันค่าจองเรียบร้อยแล้ว";
    tone = "ok";
  }

  return flexBookingStatus({
    code: booking.id.slice(0, 8).toUpperCase(),
    carLabel: `${booking.car.brand} ${booking.car.name}`,
    pickupText: formatBangkokDateTime(booking.startDate),
    returnText: formatBangkokDateTime(booking.endDate),
    total: booking.totalPrice,
    statusLabel: STATUS_TH[booking.status] ?? booking.status,
    note,
    tone,
    url: `${site}/booking/${booking.id}`,
  });
}
