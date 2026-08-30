import { prisma } from "@/lib/prisma";
import { ACTIVE_BOOKING_STATUSES } from "@/lib/booking-status";
import { bangkokDateStr, bangkokDayRange, formatBangkokDateTime } from "@/lib/settings";

const DAY_MS = 86400000;

export type DayStatus = "free" | "partial" | "full";

/** วันที่ไม่ว่าง: full = ติดทั้งวัน, partial = ติดบางช่วง (วันรับหรือวันคืน) */
export type Availability = Record<string, DayStatus>;

export type BusyRange = { start: Date; end: Date };

function dateList(fromStr: string, days: number): string[] {
  const { start } = bangkokDayRange(fromStr);
  return Array.from({ length: days }, (_, i) =>
    bangkokDateStr(new Date(start.getTime() + i * DAY_MS))
  );
}

/**
 * คำนวณสถานะแต่ละวันของรถหลายคันพร้อมกัน
 * คืนค่าเป็น Map: carId -> { "2026-08-20": "full", ... }
 */
export async function getAvailability(
  carIds: string[],
  fromStr: string,
  days: number
): Promise<Map<string, Availability>> {
  const result = new Map<string, Availability>();
  if (carIds.length === 0) return result;

  const { start: rangeStart } = bangkokDayRange(fromStr);
  const rangeEnd = new Date(rangeStart.getTime() + days * DAY_MS);

  const bookings = await prisma.booking.findMany({
    where: {
      carId: { in: carIds },
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
      startDate: { lt: rangeEnd },
      endDate: { gt: rangeStart },
    },
    select: { carId: true, startDate: true, endDate: true },
  });

  const dates = dateList(fromStr, days);

  type Row = { carId: string; startDate: Date; endDate: Date };
  const rows = bookings as Row[];

  for (const carId of carIds) {
    const mine = rows.filter((b) => b.carId === carId);
    const map: Availability = {};

    for (const dateStr of dates) {
      const { start: dayStart, end: dayEnd } = bangkokDayRange(dateStr);

      for (const b of mine) {
        const bs = new Date(b.startDate);
        const be = new Date(b.endDate);

        // ไม่ทับกันเลย
        if (be <= dayStart || bs >= dayEnd) continue;

        // ติดทั้งวัน
        if (bs <= dayStart && be >= dayEnd) {
          map[dateStr] = "full";
          break;
        }

        // ติดบางช่วง — ยังจองต่อได้ถ้าเวลาไม่ชน
        if (map[dateStr] !== "full") map[dateStr] = "partial";
      }
    }

    result.set(carId, map);
  }

  return result;
}

/** ช่วงที่ไม่ว่างของรถคันเดียว ใช้แสดงเป็นข้อความใน LINE */
export async function getBusyRanges(
  carId: string,
  days = 60
): Promise<BusyRange[]> {
  const now = new Date();
  const rangeEnd = new Date(now.getTime() + days * DAY_MS);

  const bookings = await prisma.booking.findMany({
    where: {
      carId,
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
      endDate: { gt: now },
      startDate: { lt: rangeEnd },
    },
    orderBy: { startDate: "asc" },
    select: { startDate: true, endDate: true },
  });

  return (bookings as { startDate: Date; endDate: Date }[]).map((b) => ({
    start: b.startDate,
    end: b.endDate,
  }));
}

/**
 * ข้อความสรุปช่วงไม่ว่าง สำหรับส่งในแชท
 * เขียนแบบ "วันที่ เวลา ถึง วันที่ เวลา" และบอกด้วยว่าหลังจากนั้นว่าง
 */
export function formatBusyRanges(ranges: BusyRange[], max = 5): string {
  if (ranges.length === 0) return "ว่างทุกวันในช่วง 2 เดือนข้างหน้า ✅";

  const lines = ranges
    .slice(0, max)
    .map(
      (r) =>
        `• ไม่ว่าง ${formatBangkokDateTime(r.start)}\n  ถึง ${formatBangkokDateTime(r.end)}`
    );

  if (ranges.length > max) {
    lines.push(`• และอีก ${ranges.length - max} ช่วง`);
  }

  return [
    "ช่วงที่มีคนจองแล้ว:",
    ...lines,
    "",
    "นอกช่วงนี้ว่างหมดครับ — เลือกเวลารับรถหลังเวลาที่ระบุได้เลย",
  ].join("\n");
}

/** วันแรกที่ว่างทั้งวัน (ใช้แสดงบนการ์ดรถ) */
export function firstFreeDate(map: Availability, fromStr: string, days: number): string | null {
  for (const dateStr of dateList(fromStr, days)) {
    if (map[dateStr] !== "full") return dateStr;
  }
  return null;
}

/**
 * ช่วงที่ไม่ว่างของรถคันเดียว ในรูปแบบ ISO string
 * ส่งลง client ได้ตรงๆ เพื่อปิดตัวเลือกเวลาที่ชนในฟอร์มจอง
 */
export async function getBusySpans(
  carId: string,
  days = 120
): Promise<{ start: string; end: string }[]> {
  const ranges = await getBusyRanges(carId, days);
  return ranges.map((r) => ({
    start: r.start.toISOString(),
    end: r.end.toISOString(),
  }));
}
