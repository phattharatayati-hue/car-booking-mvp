import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pushMessage, siteUrl } from "@/lib/line";
import {
  getSettings,
  bangkokHour,
  bangkokDateStr,
  bangkokDayRange,
  formatBangkokDateTime,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

type DueBooking = {
  id: string;
  endDate: Date;
  totalPrice: number;
  car: { brand: string; name: string; licensePlate: string };
  customer: { fullName: string; lineUserId: string | null };
};

/**
 * ส่งแจ้งเตือนก่อนคืนรถ
 *
 * เรียกโดย Vercel Cron (หรือ cron ภายนอก) — ป้องกันด้วย CRON_SECRET
 * ใส่ ?force=1 เพื่อข้ามการเช็คชั่วโมง (ใช้ตอนกดทดสอบจากหลังบ้าน)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "1";

  // ตรวจสิทธิ์ — Vercel Cron ส่ง Authorization: Bearer <CRON_SECRET> มาให้
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const settings = await getSettings();

  if (!settings.returnReminderOn) {
    return NextResponse.json({ ok: true, skipped: "ปิดการแจ้งเตือนไว้" });
  }

  const now = new Date();
  const hour = bangkokHour(now);

  // cron อาจรันหลายรอบต่อวัน — ส่งเฉพาะชั่วโมงที่ตั้งไว้
  if (!force && hour !== settings.returnReminderHour) {
    return NextResponse.json({
      ok: true,
      skipped: `ยังไม่ถึงเวลาส่ง (ตอนนี้ ${hour}:00 ตั้งไว้ ${settings.returnReminderHour}:00)`,
    });
  }

  // หาวันคืนรถเป้าหมาย = วันนี้ + จำนวนวันที่ตั้งไว้
  const targetDate = new Date(now.getTime() + settings.returnReminderDays * 86400000);
  const targetStr = bangkokDateStr(targetDate);
  const { start, end } = bangkokDayRange(targetStr);

  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      returnReminderSentAt: null,
      endDate: { gte: start, lt: end },
    },
    include: { car: true, customer: true },
  });

  let sent = 0;
  let skipped = 0;

  for (const b of bookings as DueBooking[]) {
    if (!b.customer.lineUserId) {
      skipped++;
      continue;
    }

    const dayWord =
      settings.returnReminderDays === 0
        ? "วันนี้"
        : settings.returnReminderDays === 1
        ? "พรุ่งนี้"
        : `อีก ${settings.returnReminderDays} วัน`;

    const text = [
      "🔔 แจ้งเตือนคืนรถ",
      "",
      `ถึงกำหนดคืนรถ${dayWord}แล้วครับ`,
      "",
      `รถ: ${b.car.brand} ${b.car.name}`,
      `ทะเบียน: ${b.car.licensePlate}`,
      `กำหนดคืนรถ: ${formatBangkokDateTime(b.endDate)}`,
      `รหัสจอง: ${b.id.slice(0, 8).toUpperCase()}`,
      "",
      "กรุณาเติมน้ำมันให้เท่าตอนรับรถ",
      "หากต้องการต่อระยะเวลาเช่า ติดต่อเราได้เลยครับ",
      "",
      `${siteUrl()}/booking/${b.id}`,
    ].join("\n");

    try {
      await pushMessage(b.customer.lineUserId, text);
      await prisma.booking.update({
        where: { id: b.id },
        data: { returnReminderSentAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error(`reminder failed for ${b.id}:`, err);
      skipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    targetDate: targetStr,
    found: bookings.length,
    sent,
    skipped,
  });
}
