import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pushMessage, notifyAdmin, siteUrl } from "@/lib/line";
import {
  getSettings,
  formatBangkokDateTime,
  formatMinutesBefore,
} from "@/lib/settings";
import { ACTIVE_BOOKING_STATUSES } from "@/lib/booking-status";
import { HANDOFF_LABEL, type HandoffKind } from "@/lib/assignments";

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
/**
 * ทวงงานรับ-ส่งรถที่ยังไม่มีแอดมินรับ
 * เกณฑ์: เหลือไม่เกิน 24 ชั่วโมงก่อนเวลานัด และยังไม่มีใครรับงานนั้น
 * ส่งเข้าแอดมินทุกคนที่ผูก LINE ไว้ (notifyAdmin)
 */
async function nudgeUnassigned(): Promise<{ found: number; notified: boolean }> {
  const now = new Date();
  const until = new Date(now.getTime() + 24 * 3600000);

  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
      OR: [
        { startDate: { gte: now, lte: until } },
        { endDate: { gte: now, lte: until } },
      ],
    },
    include: { car: true, customer: true, assignments: true },
    orderBy: { startDate: "asc" },
  });

  const missing: { at: Date; kind: HandoffKind; label: string }[] = [];

  for (const b of bookings) {
    const carLabel = `${b.car.brand} ${b.car.name} (${b.car.licensePlate})`;
    const checks: { kind: HandoffKind; at: Date }[] = [
      { kind: "DELIVERY", at: b.startDate },
      { kind: "PICKUP", at: b.endDate },
    ];
    for (const c of checks) {
      if (c.at < now || c.at > until) continue;
      if (b.assignments.some((a) => a.kind === c.kind)) continue;
      missing.push({
        at: c.at,
        kind: c.kind,
        label: `${HANDOFF_LABEL[c.kind]} · ${formatBangkokDateTime(c.at)}\n   ${carLabel} · ${b.customer.fullName}`,
      });
    }
  }

  if (missing.length === 0) return { found: 0, notified: false };

  missing.sort((a, b) => a.at.getTime() - b.at.getTime());

  const text = [
    "⚠️ มีงานรับ-ส่งรถที่ยังไม่มีคนรับ",
    "",
    `ภายใน 24 ชั่วโมงข้างหน้า ${missing.length} งาน`,
    "",
    ...missing.slice(0, 10).map((m, i) => `${i + 1}. ${m.label}`),
    ...(missing.length > 10 ? ["", `และอีก ${missing.length - 10} งาน`] : []),
    "",
    "มอบหมายได้ที่หน้ารายการจอง",
    `${siteUrl()}/admin/bookings`,
  ].join("\n");

  try {
    await notifyAdmin(text);
    return { found: missing.length, notified: true };
  } catch (err) {
    console.error("nudgeUnassigned failed:", err);
    return { found: missing.length, notified: false };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "1";

  // ตรวจสิทธิ์ — Vercel Cron ส่ง Authorization: Bearer <CRON_SECRET> มาให้
  // ถ้าไม่ได้ตั้ง CRON_SECRET ให้ปฏิเสธไปเลย (fail closed)
  // ไม่งั้น endpoint นี้จะเปิดสาธารณะ ใครยิงก็ส่ง LINE ถึงลูกค้าและกันเตือนซ้ำได้
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET ยังไม่ได้ตั้ง — ปฏิเสธ request");
    return NextResponse.json({ error: "cron ยังไม่ได้ตั้งค่า" }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ทวงงานที่ยังไม่มีคนรับ — ไม่ขึ้นกับสวิตช์เตือนคืนรถ
  const nudge = await nudgeUnassigned();

  const settings = await getSettings();

  if (!settings.returnReminderOn) {
    return NextResponse.json({ ok: true, nudge, skipped: "ปิดการแจ้งเตือนคืนรถไว้" });
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
    nudge,
    leadMinutes,
    window: { from: now.toISOString(), to: until.toISOString() },
    found: bookings.length,
    sent,
    skipped,
  });
}
