import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmin, notifyAdminRaw, siteUrl } from "@/lib/line";
import { flexUnassignedAdmin } from "@/lib/line-flex";
import { getSettings, formatBangkokDateTime } from "@/lib/settings";
import { sendPickupReminders, sendReturnReminders } from "@/lib/customer-reminders";
import { ACTIVE_BOOKING_STATUSES } from "@/lib/booking-status";
import { HANDOFF_LABEL, type HandoffKind } from "@/lib/assignments";
import { sweepUnpaidHolds } from "@/lib/unpaid-hold";

export const dynamic = "force-dynamic";

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

  /* เตือนลูกค้า (ก่อนรับรถ / ก่อนคืนรถ) — ตัวหลักอยู่ที่ /api/cron/customer-reminders
     ที่ควรยิงทุก 15 นาที แต่เรียกซ้ำตรงนี้ด้วย เผื่อยังไม่ได้ตั้ง cron ภายนอก
     จะได้อย่างน้อยวันละรอบ (ส่งครั้งเดียวต่อใบ ไม่ซ้ำ) */
  const pickup = await sendPickupReminders(settings);
  const ret = await sendReturnReminders(settings, force);

  return NextResponse.json({ ok: true, nudge, unpaid, pickup, return: ret });
}
