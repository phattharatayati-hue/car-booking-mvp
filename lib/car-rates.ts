/**
 * ราคาตามช่วงวัน และช่วงปิดรับจอง — ตรรกะล้วน ไม่แตะฐานข้อมูล
 *
 * ห้าม import prisma ที่นี่ เพราะฟอร์มจองฝั่ง client ใช้ไฟล์นี้คิดราคาให้ลูกค้าเห็น
 * ส่วนการอ่านข้อมูลอยู่ที่ lib/car-rates-server.ts
 *
 * วันที่ในไฟล์นี้เป็นสตริง "YYYY-MM-DD" ตามปฏิทินไทยเสมอ
 * เพื่อไม่ให้เพี้ยนตาม timezone ของเซิร์ฟเวอร์
 */

export type CarRateKind = "PRICE" | "BLOCK";

export type CarRateView = {
  id: string;
  kind: CarRateKind;
  label: string;
  /** วันแรกของช่วง (รวมวันนี้) */
  startDate: string;
  /** วันสุดท้ายของช่วง (รวมวันนี้) */
  endDate: string;
  /** ราคาต่อวันในช่วงนี้ — null คือใช้ราคาปกติของรถ */
  pricePerDay: number | null;
  /** จำนวนวันขั้นต่ำถ้าการจองแตะช่วงนี้ — null คือไม่บังคับ */
  minDays?: number | null;
};

const DAY_MS = 86400000;

/** Date → "YYYY-MM-DD" ตามเวลาไทย */
export function bangkokDateStrOf(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(d));
}

/** บวกวันให้สตริงวันที่ */
export function addDaysStr(dateStr: string, n: number): string {
  const t = new Date(`${dateStr}T00:00:00+07:00`).getTime() + n * DAY_MS;
  return bangkokDateStrOf(new Date(t));
}

/** จำนวนวันจาก a ถึง b โดยนับวันสุดท้ายด้วย (a=b คือ 1 วัน) */
export function daysBetweenInclusive(a: string, b: string): number {
  const ms =
    new Date(`${b}T00:00:00+07:00`).getTime() - new Date(`${a}T00:00:00+07:00`).getTime();
  return Math.floor(ms / DAY_MS) + 1;
}

/** รายการวันของการเช่า เริ่มนับจากวันรับรถ */
export function rentalDayList(start: Date, days: number): string[] {
  const first = bangkokDateStrOf(start);
  return Array.from({ length: Math.max(1, days) }, (_, i) => addDaysStr(first, i));
}

/** วันนี้อยู่ในช่วงนี้ไหม (รวมวันแรกและวันสุดท้าย) */
export function dayInRate(dateStr: string, rate: CarRateView): boolean {
  return dateStr >= rate.startDate && dateStr <= rate.endDate;
}

/** ช่วงราคาที่ครอบวันนี้ — ไม่มีคือใช้ราคาปกติของรถ */
export function findRateForDay(dateStr: string, rates: CarRateView[]): CarRateView | null {
  return (
    rates.find((r) => r.kind === "PRICE" && r.pricePerDay != null && dayInRate(dateStr, r)) ??
    null
  );
}

/** ราคาของวันนั้น */
export function priceForDay(
  dateStr: string,
  basePrice: number,
  rates: CarRateView[]
): { price: number; rate: CarRateView | null } {
  const rate = findRateForDay(dateStr, rates);
  return { price: rate?.pricePerDay ?? basePrice, rate };
}

/** ช่วงปิดรับจองที่ครอบวันนี้ */
export function blockForDay(dateStr: string, rates: CarRateView[]): CarRateView | null {
  return rates.find((r) => r.kind === "BLOCK" && dayInRate(dateStr, r)) ?? null;
}

/**
 * ช่วงปิดรับจองที่ชนกับวันที่ลูกค้าเลือก
 * ใช้ทั้งตอนเตือนในฟอร์ม และตอนกันจริงฝั่งเซิร์ฟเวอร์
 */
export function blockingRates(
  startDateStr: string,
  endDateStr: string,
  rates: CarRateView[]
): CarRateView[] {
  if (!startDateStr || !endDateStr) return [];
  return rates.filter(
    (r) => r.kind === "BLOCK" && r.startDate <= endDateStr && r.endDate >= startDateStr
  );
}

/**
 * ช่วงที่บังคับจำนวนวันขั้นต่ำ และชนกับวันที่ลูกค้าเลือก
 *
 * กติกา: "แตะช่วงไหน ต้องทำตามขั้นต่ำของช่วงนั้น" — จองคร่อมช่วงเทศกาลแค่วันเดียว
 * ก็ต้องเช่าครบตามที่ช่วงนั้นกำหนด ไม่งั้นลูกค้าจะแทรกคิวสั้น ๆ กลางช่วงทองเที่ยว
 * แล้วรถว่างเป็นวัน ๆ ขายต่อไม่ได้
 */
export function minDaysRates(
  startDateStr: string,
  endDateStr: string,
  rates: CarRateView[]
): CarRateView[] {
  if (!startDateStr || !endDateStr) return [];
  return rates.filter(
    (r) =>
      r.kind === "PRICE" &&
      (r.minDays ?? 0) > 1 &&
      r.startDate <= endDateStr &&
      r.endDate >= startDateStr
  );
}

/** ช่วงที่ต้องการวันมากที่สุดในบรรดาช่วงที่ถูกแตะ — ใช้ตัวนี้เป็นเกณฑ์ */
export function strictestMinDays(
  startDateStr: string,
  endDateStr: string,
  rates: CarRateView[]
): CarRateView | null {
  const hits = minDaysRates(startDateStr, endDateStr, rates);
  if (hits.length === 0) return null;
  return hits.reduce((a, b) => ((b.minDays ?? 0) > (a.minDays ?? 0) ? b : a));
}

/**
 * ตรวจว่าจำนวนวันที่จองผ่านขั้นต่ำไหม
 * คืนค่า null = ผ่าน · ถ้าไม่ผ่านคืนช่วงที่เข้มที่สุดพร้อมจำนวนวันที่ต้องการ
 */
export function checkMinDays(
  startDateStr: string,
  endDateStr: string,
  days: number,
  rates: CarRateView[]
): { required: number; rate: CarRateView } | null {
  const rate = strictestMinDays(startDateStr, endDateStr, rates);
  if (!rate) return null;
  const required = rate.minDays ?? 0;
  return days < required ? { required, rate } : null;
}

/** ข้อความบอกลูกค้าว่าทำไมจองไม่ได้ — ใช้ทั้งเว็บ LIFF และแชท LINE */
export function minDaysMessage(hit: { required: number; rate: CarRateView }, days: number): string {
  return `ช่วง ${formatRateRange(hit.rate)} (${hit.rate.label}) ต้องเช่าอย่างน้อย ${hit.required} วัน — ตอนนี้เลือกไว้ ${days} วัน`;
}

/** ค่าเช่าที่ยุบวันติดกันซึ่งใช้ราคาเดียวกันเข้าด้วยกัน */
export type RentSegment = {
  /** ชื่อช่วงราคา — null คือราคาปกติของรถ */
  rateId: string | null;
  label: string | null;
  from: string;
  to: string;
  days: number;
  pricePerDay: number;
  total: number;
};

export function rentSegments(
  start: Date,
  days: number,
  basePrice: number,
  rates: CarRateView[]
): RentSegment[] {
  const out: RentSegment[] = [];

  for (const dateStr of rentalDayList(start, days)) {
    const { price, rate } = priceForDay(dateStr, basePrice, rates);
    const last = out[out.length - 1];

    if (last && last.rateId === (rate?.id ?? null) && last.pricePerDay === price) {
      last.to = dateStr;
      last.days += 1;
      last.total += price;
      continue;
    }

    out.push({
      rateId: rate?.id ?? null,
      label: rate?.label ?? null,
      from: dateStr,
      to: dateStr,
      days: 1,
      pricePerDay: price,
      total: price,
    });
  }

  return out;
}

/** สองช่วงวันทับกันไหม (นับวันหัวท้ายด้วย) */
export function dateRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}

const TH_MONTH = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

/** "2026-04-13" → "13 เม.ย. 69" */
export function formatThaiDateStr(dateStr: string, withYear = true): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const month = TH_MONTH[m - 1] ?? "";
  const be = (y + 543) % 100;
  return withYear
    ? `${d} ${month} ${String(be).padStart(2, "0")}`
    : `${d} ${month}`;
}

/** "13–16 เม.ย. 69" · ข้ามเดือนเป็น "28 ธ.ค. – 3 ม.ค. 70" · วันเดียวเป็น "13 เม.ย. 69" */
export function formatRateRange(rate: Pick<CarRateView, "startDate" | "endDate">): string {
  const { startDate: a, endDate: b } = rate;
  if (a === b) return formatThaiDateStr(a);

  // เดือนและปีเดียวกัน ไม่ต้องซ้ำชื่อเดือน
  if (a.slice(0, 7) === b.slice(0, 7)) {
    return `${Number(a.slice(8))}–${formatThaiDateStr(b)}`;
  }
  return `${formatThaiDateStr(a, false)} – ${formatThaiDateStr(b)}`;
}
