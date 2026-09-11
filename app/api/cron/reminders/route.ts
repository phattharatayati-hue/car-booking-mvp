import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmin, notifyAdminRaw, pushRaw, siteUrl } from "@/lib/line";
import { flexReturnReminder, flexUnassignedAdmin } from "@/lib/line-flex";
import { SECURITY_DEPOSIT } from "@/lib/fees";
import {
  getSettings,
  formatBangkokDateTime,
  formatMinutesBefore,
} from "@/lib/settings";
import { ACTIVE_BOOKING_STATUSES } from "@/lib/booking-status";
import { HANDOFF_LABEL, type HandoffKind } from "@/lib/assignments";
import { sweepUnpaidHolds } from "@/lib/unpaid-hold";

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

  try {
    await notifyAdminRaw(
      flexUnassignedAdmin({
        count: missing.length,
        jobs: missing.slice(0, 8).map((m) => m.label),
        more: Math.max(0, missing.length - 8),
        adminUrl: `${siteUrl()}/admin/bookings`,
      })
    );
    return { found: missing.length, notified: true };
  } catch (err) {
    console.error("nudgeUnassigned failed:", err);
    return { found: missing.length, notified: false };
  }
}

/**
 * สรุปใบจองที่กดจองมาแล้วยังไม่โอน — ข้อความเดียวต่อวัน
 *
 * ตอนกดจองระบบไม่ยิง LINE แล้ว (กันคนจองเล่นกินโควตา) แต่แอดมินยังอยากรู้ภาพรวม
 * จึงรวบยอดมาส่งรอบเดียวตอน cron ทำงาน แทนที่จะยิงทีละใบ
 * ไม่มีใบค้างก็ไม่ส่งเลย จะได้ไม่มีข้อความเปล่า ๆ ทุกวัน
 */
async function digestUnpaid(holdMinutes: number): Promise<{
  swept: number;
  waiting: number;
  notified: boolean;
}> {
  try {
    const swept = await sweepUnpaidHolds(holdMinutes);

    const since = new Date(Date.now() - 24 * 3600000);
    const [waiting, cancelledToday] = await Promise.all([
      prisma.booking.count({
        where: { status: "PENDING_DEPOSIT", deposit: { is: null } },
      }),
      prisma.booking.count({
        where: {
          status: "CANCELLED",
          updatedAt: { gte: since },
          cancelReason: { not: null },
        },
      }),
    ]);

    if (waiting === 0 && cancelledToday === 0) {
      return { swept, waiting, notified: false };
    }

    await notifyAdmin(
      [
        "🧾 สรุปใบจองที่ยังไม่โอน (24 ชม.ล่าสุด)",
        "",
        `กำลังรอสลิป: ${waiting} ใบ`,
        `ยกเลิกอัตโนมัติเพราะไม่โอน: ${cancelledToday} ใบ`,
        "",
        `${siteUrl()}/admin/bookings?status=awaiting`,
      ].join("\n")
    );

    return { swept, waiting, notified: true };
  } catch (err) {
    console.error("digestUnpaid failed:", err);
    return { swept: 0, waiting: 0, notified: false };
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

  // กวาดใบจองที่ไม่โอน แล้วสรุปให้แอดมิน — ไม่ขึ้นกับสวิตช์เตือนคืนรถเช่นกัน
  const unpaid = settings.unpaidDigestOn
    ? await digestUnpaid(settings.holdMinutes)
    : { swept: await sweepUnpaidHolds(settings.holdMinutes), waiting: 0, notified: false };

  if (!settings.returnReminderOn) {
    return NextResponse.json({
      ok: true,
      nudge,
      unpaid,
      skipped: "ปิดการแจ้งเตือนคืนรถไว้",
    });
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

    try {
      await pushRaw(b.customer.lineUserId, [
        flexReturnReminder({
          bookingId: b.id,
          carLabel: `${b.car.brand} ${b.car.name}`,
          plate: b.car.licensePlate,
          end: b.endDate,
          headline,
          securityDeposit: SECURITY_DEPOSIT.amount,
          feesUrl: `${siteUrl()}/fees`,
          bookingUrl: `${siteUrl()}/booking/${b.id}`,
        }),
      ]);
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
    unpaid,
    leadMinutes,
    window: { from: now.toISOString(), to: until.toISOString() },
    found: bookings.length,
    sent,
    skipped,
  });
}
