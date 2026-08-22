import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pushMessage, siteUrl } from "@/lib/line";
import {
  getSettings,
  formatBangkokDateTime,
  formatMinutesBefore,
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
 * ส่งแจ้งเตือนก่อนถึงเวลานัดคืนรถ
 *
 * ตรรกะ: ดูเวลานัดคืนรถ (endDate) ของแต่ละการจอง แล้วส่งเมื่อเหลือเวลาไม่เกิน
 * ค่าที่ตั้งไว้ใน /admin/settings (returnReminderMinutesBefore เช่น 120 = 2 ชม.)
 * ส่งครั้งเดียวต่อการจอง กันซ้ำด้วย returnReminderSentAt
 *
 * ควรให้ cron ยิงเข้ามาทุก ~15 นาที เพื่อให้เวลาเตือนแม่น
 * (Vercel Hobby รันได้วันละครั้ง — ต้องใช้ cron ภายนอกหรืออัปเป็น Pro)
 *
 * เรียกโดย Vercel Cron หรือ cron ภายนอก — ป้องกันด้วย CRON_SECRET
 * ใส่ ?force=1 เพื่อส่งให้การจองที่เลยเวลานัดคืนไปแล้วด้วย (ใช้ตอนทดสอบ/ตามเก็บ)
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
  const leadMinutes = settings.returnReminderMinutesBefore;

  // ขอบบน = การจองที่เข้าระยะเตือนแล้ว (เหลือถึงกำหนดคืนไม่เกิน leadMinutes)
  const until = new Date(now.getTime() + leadMinutes * 60000);

  // ปกติไม่ส่งย้อนหลังให้คันที่เลยเวลานัดคืนไปแล้ว — ใส่ ?force=1 ถ้าต้องการตามเก็บ
  const endDateFilter = force
    ? { lte: until }
    : { lte: until, gte: now };

  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      returnReminderSentAt: null,
      endDate: endDateFilter,
    },
    include: { car: true, customer: true },
    orderBy: { endDate: "asc" },
  });

  let sent = 0;
  let skipped = 0;

  for (const b of bookings as DueBooking[]) {
    if (!b.customer.lineUserId) {
      skipped++;
      continue;
    }

    // เหลือเวลาจริงถึงกำหนดคืน ณ ตอนส่ง (ปัดเป็นนาที)
    const minutesLeft = Math.round((b.endDate.getTime() - now.getTime()) / 60000);
    const headline =
      minutesLeft <= 0
        ? "ถึงกำหนดคืนรถแล้วครับ"
        : `อีกประมาณ ${formatMinutesBefore(minutesLeft)} ถึงกำหนดคืนรถครับ`;

    const text = [
      "🔔 แจ้งเตือนคืนรถ",
      "",
      headline,
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
    leadMinutes,
    window: { from: now.toISOString(), to: until.toISOString() },
    found: bookings.length,
    sent,
    skipped,
  });
}
