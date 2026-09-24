/**
 * ข้อความเตือนลูกค้าทาง LINE ตามเวลานัด
 *
 *   1. ก่อนรับรถ (ค่าเริ่มต้น 24 ชม.) — ขอให้กดยืนยันว่าจะมารับตามนัด
 *   2. ก่อนคืนรถ (ค่าเริ่มต้น 2 ชม.) — ให้คืนตามเวลาและสถานที่ที่นัด
 *
 * ทั้งสองอย่างส่งครั้งเดียวต่อการจอง (กันซ้ำด้วย *SentAt) และส่งเฉพาะใบที่ยืนยันแล้ว
 * ลูกค้าที่ไม่ผูก LINE ส่งไม่ได้ — นับเป็น skipped ให้แอดมินรู้
 *
 * เรียกจาก cron — ยิงถี่เท่าไหร่ เวลาเตือนก็แม่นเท่านั้น (แนะนำทุก 15 นาที)
 */
import { prisma } from "@/lib/prisma";
import { pushRaw, siteUrl } from "@/lib/line";
import { flexPickupReminder, flexReturnReminder } from "@/lib/line-flex";
import { securityDepositOf } from "@/lib/car-money";
import { formatMinutesBefore, type AppSettings } from "@/lib/settings";

type Result = { found: number; sent: number; skipped: number };

type ReminderBooking = {
  id: string;
  startDate: Date;
  endDate: Date;
  pickupPlace: string | null;
  returnPlace: string | null;
  car: {
    brand: string;
    name: string;
    licensePlate: string;
    bookingFee: number | null;
    securityDeposit: number | null;
  };
  customer: { lineUserId: string | null };
};

/** เตือนก่อนรับรถ — ขอให้ลูกค้ากดยืนยัน */
export async function sendPickupReminders(settings: AppSettings): Promise<Result> {
  if (!settings.pickupReminderOn) return { found: 0, sent: 0, skipped: 0 };

  const now = new Date();
  const until = new Date(now.getTime() + settings.pickupReminderHoursBefore * 3600000);

  const bookings = (await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      pickupReminderSentAt: null,
      pickupConfirmedAt: null,
      startDate: { gt: now, lte: until },
    },
    include: { car: true, customer: true },
    orderBy: { startDate: "asc" },
  })) as unknown as ReminderBooking[];

  let sent = 0;
  let skipped = 0;
  for (const b of bookings) {
    if (!b.customer.lineUserId) {
      skipped++;
      continue;
    }
    try {
      await pushRaw(b.customer.lineUserId, [
        flexPickupReminder({
          bookingId: b.id,
          carLabel: `${b.car.brand} ${b.car.name}`,
          start: b.startDate,
          pickupPlace: b.pickupPlace,
          bookingUrl: `${siteUrl()}/booking/${b.id}`,
        }),
      ]);
      await prisma.booking.update({
        where: { id: b.id },
        data: { pickupReminderSentAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error(`pickup reminder failed for ${b.id}:`, err);
      skipped++;
    }
  }
  return { found: bookings.length, sent, skipped };
}

/** เตือนก่อนคืนรถ — ให้คืนตามเวลาและสถานที่ที่นัด */
export async function sendReturnReminders(
  settings: AppSettings,
  force = false
): Promise<Result & { leadMinutes: number }> {
  const leadMinutes = settings.returnReminderMinutesBefore;
  if (!settings.returnReminderOn) return { found: 0, sent: 0, skipped: 0, leadMinutes };

  const now = new Date();
  const until = new Date(now.getTime() + leadMinutes * 60000);
  // ปกติไม่ส่งย้อนหลังให้คันที่เลยเวลานัดคืนไปแล้ว — ?force=1 เพื่อตามเก็บ
  const endDateFilter = force ? { lte: until } : { lte: until, gte: now };

  const bookings = (await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      returnReminderSentAt: null,
      endDate: endDateFilter,
    },
    include: { car: true, customer: true },
    orderBy: { endDate: "asc" },
  })) as unknown as ReminderBooking[];

  let sent = 0;
  let skipped = 0;
  for (const b of bookings) {
    if (!b.customer.lineUserId) {
      skipped++;
      continue;
    }
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
          returnPlace: b.returnPlace,
          headline,
          securityDeposit: securityDepositOf(b.car, settings),
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
      console.error(`return reminder failed for ${b.id}:`, err);
      skipped++;
    }
  }
  return { found: bookings.length, sent, skipped, leadMinutes };
}

/** ตรวจ CRON_SECRET — คืน error message ถ้าไม่ผ่าน */
export function cronAuthError(request: Request): { status: number; error: string } | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return { status: 503, error: "cron ยังไม่ได้ตั้งค่า" };
  const header = request.headers.get("authorization");
  const url = new URL(request.url);
  // cron ภายนอกบางเจ้าตั้ง header ไม่ได้ — รับ ?key= แทนได้
  if (header === `Bearer ${secret}` || url.searchParams.get("key") === secret) return null;
  return { status: 401, error: "unauthorized" };
}
