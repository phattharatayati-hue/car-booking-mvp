/**
 * ช่วงเวลาที่รถไม่ว่าง — ใช้ปิดตัวเลือกเวลาในฟอร์มจอง
 *
 * ห้าม import prisma ที่นี่ (client component ใช้ไฟล์นี้)
 * ฝั่ง server ส่งช่วงเวลามาเป็น ISO string ผ่าน props
 */

export type BusySpan = { start: string; end: string };

const TZ_OFFSET = "+07:00";

/** วันที่ + เวลาไทย → เวลาจริง (epoch ms) */
export function bangkokMs(dateStr: string, time = "00:00"): number {
  return new Date(`${dateStr}T${time.slice(0, 5)}:00${TZ_OFFSET}`).getTime();
}

type Span = { s: number; e: number };

function toSpans(busy: BusySpan[]): Span[] {
  return busy
    .map((b) => ({ s: new Date(b.start).getTime(), e: new Date(b.end).getTime() }))
    .filter((x) => Number.isFinite(x.s) && Number.isFinite(x.e) && x.e > x.s)
    .sort((a, b) => a.s - b.s);
}

/** เวลานี้ (ของวันนั้น) อยู่ในช่วงที่รถไม่ว่างไหม */
export function isTimeBusy(dateStr: string, time: string, busy: BusySpan[]): boolean {
  const t = bangkokMs(dateStr, time);
  return toSpans(busy).some((sp) => t >= sp.s && t < sp.e);
}

/**
 * ช่วงที่ลูกค้าเลือก ทับกับการจองอื่นไหม
 * เกณฑ์เดียวกับที่ฝั่ง server ใช้: start < busyEnd && end > busyStart
 * ครอบกรณี "คร่อม" ที่การปิดตัวเลือกเวลาอย่างเดียวจับไม่ได้
 */
export function rangeBusy(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
  busy: BusySpan[]
): boolean {
  if (!startDate || !endDate) return false;
  const s = bangkokMs(startDate, startTime);
  const e = bangkokMs(endDate, endTime);
  if (!(e > s)) return false;
  return toSpans(busy).some((sp) => s < sp.e && e > sp.s);
}

/** "HH:mm" ของ epoch ms ตามเวลาไทย */
function hhmm(ms: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}

/**
 * คำอธิบายว่าวันนั้นรถติดช่วงไหน — ไว้แสดงใต้ปฏิทิน
 * คืน null ถ้าวันนั้นว่างทั้งวัน
 */
export function describeDayBusy(dateStr: string, busy: BusySpan[]): string | null {
  const dayStart = bangkokMs(dateStr);
  const dayEnd = dayStart + 86400000;
  const spans = toSpans(busy).filter((sp) => sp.s < dayEnd && sp.e > dayStart);
  if (spans.length === 0) return null;

  // ติดทั้งวัน
  if (spans.some((sp) => sp.s <= dayStart && sp.e >= dayEnd)) {
    return "วันนี้รถอยู่กับลูกค้าอื่นทั้งวัน";
  }

  const parts = spans.map((sp) => {
    const startsBefore = sp.s <= dayStart;
    const endsAfter = sp.e >= dayEnd;
    if (startsBefore) return `รถอยู่กับลูกค้าอื่นถึง ${hhmm(sp.e)} น.`;
    if (endsAfter) return `รถไม่ว่างตั้งแต่ ${hhmm(sp.s)} น. เป็นต้นไป`;
    return `ไม่ว่างช่วง ${hhmm(sp.s)}-${hhmm(sp.e)} น.`;
  });

  // ช่วงที่ยังว่าง — บอกให้ชัดว่ารับได้ตั้งแต่กี่โมง
  const lastEndBeforeDayEnd = Math.max(
    ...spans.filter((sp) => sp.e < dayEnd).map((sp) => sp.e),
    0
  );
  if (lastEndBeforeDayEnd > dayStart && !spans.some((sp) => sp.e >= dayEnd)) {
    parts.push(`ว่างตั้งแต่ ${hhmm(lastEndBeforeDayEnd)} น. เป็นต้นไป`);
  }

  return parts.join(" · ");
}

/** ตัวเลือกเวลาพร้อมสถานะว่ากดได้ไหม */
export type TimeChoice = { time: string; busy: boolean };

export function timeChoicesFor(
  dateStr: string,
  allTimes: string[],
  busy: BusySpan[]
): TimeChoice[] {
  if (!dateStr) return allTimes.map((time) => ({ time, busy: false }));
  return allTimes.map((time) => ({ time, busy: isTimeBusy(dateStr, time, busy) }));
}

/** เวลาว่างแรกของวันนั้น — ใช้เลื่อนค่าที่เลือกอัตโนมัติเมื่อเวลาเดิมถูกปิด */
export function firstFreeTime(
  dateStr: string,
  allTimes: string[],
  busy: BusySpan[]
): string | null {
  const found = timeChoicesFor(dateStr, allTimes, busy).find((c) => !c.busy);
  return found?.time ?? null;
}
