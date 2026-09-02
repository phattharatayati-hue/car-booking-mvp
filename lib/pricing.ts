/**
 * คิดราคาการจอง — ไฟล์นี้เป็น "จุดเดียว" ที่คำนวณราคา
 *
 * ห้าม import prisma ในไฟล์นี้ เพราะ client component (ฟอร์มจองบนเว็บและ LIFF)
 * ใช้ไฟล์นี้แสดงราคาให้ลูกค้าเห็นก่อนกดจอง ถ้าใส่ prisma เข้าไป build จะพัง
 * ส่วนการดึงข้อมูลช่วงเวลาจากฐานข้อมูลอยู่ที่ lib/after-hours-server.ts
 */

import {
  rentSegments,
  formatRateRange,
  type CarRateView,
  type RentSegment,
} from "@/lib/car-rates";

export const MINUTES_PER_DAY = 24 * 60;

export type AfterHoursRate = {
  id: string;
  label: string;
  /** นาทีนับจากเที่ยงคืน ตามเวลาไทย (0-1439) */
  startMinute: number;
  /** ถ้า <= startMinute คือช่วงข้ามเที่ยงคืน เช่น 22:00-05:00 */
  endMinute: number;
  fee: number;
};

/** "HH:mm" → นาทีนับจากเที่ยงคืน */
export function toMinuteOfDay(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** นาทีนับจากเที่ยงคืน → "HH:mm" */
export function fromMinuteOfDay(total: number): string {
  const t = ((total % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** ช่วงเวลาแบบอ่านง่าย เช่น "22:00-05:00" */
export function rateRangeLabel(rate: AfterHoursRate): string {
  return `${fromMinuteOfDay(rate.startMinute)}-${fromMinuteOfDay(rate.endMinute)}`;
}

/** นาทีนี้อยู่ในช่วงนี้ไหม — รองรับช่วงที่ข้ามเที่ยงคืน */
export function isInRange(
  minute: number,
  rate: Pick<AfterHoursRate, "startMinute" | "endMinute">
): boolean {
  const { startMinute: s, endMinute: e } = rate;
  if (s === e) return false;
  // ช่วงปกติ เช่น 05:00-07:00 → นับต้นช่วง ไม่นับปลายช่วง
  if (s < e) return minute >= s && minute < e;
  // ช่วงข้ามเที่ยงคืน เช่น 22:00-05:00
  return minute >= s || minute < e;
}

/**
 * ค่าธรรมเนียมของเวลานั้น — ถ้าไม่ตรงช่วงไหนเลยคือฟรี
 * ถ้าเผลอตั้งช่วงทับกัน จะคิดอันที่แพงที่สุด เพื่อให้ผลลัพธ์คาดเดาได้
 */
export function feeForMinute(
  minute: number,
  rates: AfterHoursRate[]
): { fee: number; rate: AfterHoursRate | null } {
  let best: AfterHoursRate | null = null;
  for (const r of rates) {
    if (isInRange(minute, r) && (!best || r.fee > best.fee)) best = r;
  }
  return { fee: best?.fee ?? 0, rate: best };
}

/** ค่าธรรมเนียมของเวลาในรูปแบบ "HH:mm" */
export function feeForTime(time: string, rates: AfterHoursRate[]) {
  return feeForMinute(toMinuteOfDay(time), rates);
}

/** นาทีของวันตามเวลาไทย จาก Date */
export function bangkokMinuteOfDay(d: Date): number {
  const s = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(d));
  return toMinuteOfDay(s);
}

/**
 * กติกาค่าคืนรถล่าช้า — ตั้งได้ที่หน้า "ตั้งค่าระบบ"
 *
 * ตัวอย่าง: รับรถ 08:00 คืน 10:00 วันรุ่งขึ้น = 1 วัน 2 ชม.
 *   เลทต่ำกว่า roundUpHours → คิดค่าเลชั่วโมงละ hourlyFee (เศษนาทีปัดขึ้นเป็นชั่วโมง)
 *   เลทตั้งแต่ roundUpHours ขึ้นไป → ปัดเป็นค่าเช่าอีก 1 วันเต็ม
 *   เลทไม่เกิน graceMinutes → ไม่คิดเงิน
 */
export type LateRule = {
  /** ค่าเลทต่อชั่วโมง */
  hourlyFee: number;
  /** เลทตั้งแต่กี่ชั่วโมงจะปัดเป็น 1 วัน */
  roundUpHours: number;
  /** ผ่อนปรนกี่นาทีก่อนเริ่มคิดค่าเลท */
  graceMinutes: number;
};

export const DEFAULT_LATE_RULE: LateRule = {
  hourlyFee: 200,
  roundUpHours: 4,
  graceMinutes: 0,
};

export type RentalDuration = {
  /** จำนวนวันที่คิดค่าเช่า (อย่างน้อย 1) */
  days: number;
  /** ชั่วโมงเลทที่คิดเงิน — ปัดเศษนาทีขึ้นเป็นชั่วโมง (0 = ไม่คิด) */
  lateHours: number;
  /** นาทีที่เกินวันเต็มจริง ๆ ใช้แสดงผลให้ลูกค้าเห็น */
  overMinutes: number;
  /** เลทมากจนถูกปัดเป็นค่าเช่าอีก 1 วัน */
  roundedUpToDay: boolean;
};

/**
 * แยกระยะเวลาเช่าเป็น "วันเต็ม + ชั่วโมงเลท" ตามกติกาที่ตั้งไว้
 * ไม่คิดเงินในนี้ — แค่บอกว่ากี่วันกี่ชั่วโมง
 */
export function rentalDuration(
  start: Date,
  end: Date,
  rule: LateRule = DEFAULT_LATE_RULE
): RentalDuration {
  const totalMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));

  const fullDays = Math.floor(totalMinutes / MINUTES_PER_DAY);
  const overMinutes = totalMinutes - fullDays * MINUTES_PER_DAY;

  // เช่าไม่ถึง 24 ชั่วโมง = 1 วัน ไม่มีค่าเลท (overMinutes = 0 เพราะไม่ได้เกินวันเต็ม)
  if (fullDays === 0) {
    return { days: 1, lateHours: 0, overMinutes: 0, roundedUpToDay: false };
  }

  // คืนตรงเวลา หรือเลทไม่เกินช่วงผ่อนปรน
  if (overMinutes <= Math.max(0, rule.graceMinutes)) {
    return { days: fullDays, lateHours: 0, overMinutes, roundedUpToDay: false };
  }

  const roundUpMinutes = Math.max(1, rule.roundUpHours) * 60;

  // เลทมาก — ปัดเป็นค่าเช่าอีก 1 วัน
  if (overMinutes >= roundUpMinutes) {
    return { days: fullDays + 1, lateHours: 0, overMinutes, roundedUpToDay: true };
  }

  return {
    days: fullDays,
    lateHours: Math.ceil(overMinutes / 60),
    overMinutes,
    roundedUpToDay: false,
  };
}

/** ข้อความอ่านง่ายของระยะเวลา เช่น "1 วัน 2 ชม." */
export function durationLabel(d: RentalDuration): string {
  const hours = Math.floor(d.overMinutes / 60);
  const mins = d.overMinutes % 60;
  if (d.roundedUpToDay || d.overMinutes === 0) return `${d.days} วัน`;
  return `${d.days} วัน ${hours > 0 ? `${hours} ชม.` : ""}${
    mins > 0 ? ` ${mins} นาที` : ""
  }`.trim();
}

export type QuoteLine = {
  kind: "rent" | "pickup" | "return" | "late";
  label: string;
  amount: number;
};

export type Quote = {
  days: number;
  /** ชั่วโมงเลทที่คิดเงิน */
  lateHours: number;
  /** ค่าคืนรถล่าช้ารวม */
  lateFee: number;
  /** รายละเอียดระยะเวลา ใช้แสดง "1 วัน 2 ชม." */
  duration: RentalDuration;
  rentTotal: number;
  /** ค่าเช่าแยกตามช่วงราคา — วันที่ราคาเท่ากันและติดกันจะถูกยุบเป็นช่วงเดียว */
  segments: RentSegment[];
  pickupFee: number;
  returnFee: number;
  afterHoursTotal: number;
  total: number;
  lines: QuoteLine[];
};

/**
 * จำนวนวันที่คิดค่าเช่า — ตามกติกาค่าเลท
 * (เลทน้อยจะไม่ปัดเป็นวันอีกแล้ว แต่ไปคิดเป็นค่าเลทรายชั่วโมงแทน)
 */
export function rentalDays(start: Date, end: Date, rule: LateRule = DEFAULT_LATE_RULE): number {
  return rentalDuration(start, end, rule).days;
}

/**
 * ใบเสนอราคาของการจองหนึ่งรายการ
 * ค่าธรรมเนียมนอกเวลาคิด "ต่อครั้ง" แยกกันระหว่างตอนรับรถและตอนคืนรถ
 */
export function quoteBooking(params: {
  start: Date;
  end: Date;
  pricePerDay: number;
  rates: AfterHoursRate[];
  /** ช่วงราคาตามวันของรถคันนั้น — ไม่ส่งมาก็ใช้ราคาปกติทุกวัน */
  carRates?: CarRateView[];
  /** กติกาค่าคืนรถล่าช้า — ไม่ส่งมาก็ใช้ค่าตั้งต้น */
  lateRule?: LateRule;
}): Quote {
  const {
    start,
    end,
    pricePerDay,
    rates,
    carRates = [],
    lateRule = DEFAULT_LATE_RULE,
  } = params;

  const duration = rentalDuration(start, end, lateRule);
  const days = duration.days;

  // คิดราคาทีละวัน แล้วยุบวันที่ราคาเท่ากันและติดกันเข้าด้วยกัน
  const segments = rentSegments(start, days, pricePerDay, carRates);
  const rentTotal = segments.reduce((sum, seg) => sum + seg.total, 0);

  const pickup = feeForMinute(bangkokMinuteOfDay(start), rates);
  const ret = feeForMinute(bangkokMinuteOfDay(end), rates);

  const lines: QuoteLine[] = segments.map((seg) => ({
    kind: "rent" as const,
    label: seg.label
      ? `${seg.label} (${formatRateRange({ startDate: seg.from, endDate: seg.to })}) ${seg.days} วัน × ${seg.pricePerDay.toLocaleString()} บาท`
      : `ค่าเช่า ${seg.days} วัน × ${seg.pricePerDay.toLocaleString()} บาท`,
    amount: seg.total,
  }));

  if (pickup.fee > 0 && pickup.rate) {
    lines.push({
      kind: "pickup",
      label: `รับรถนอกเวลา (${pickup.rate.label} ${rateRangeLabel(pickup.rate)})`,
      amount: pickup.fee,
    });
  }
  if (ret.fee > 0 && ret.rate) {
    lines.push({
      kind: "return",
      label: `คืนรถนอกเวลา (${ret.rate.label} ${rateRangeLabel(ret.rate)})`,
      amount: ret.fee,
    });
  }

  // ค่าเลทไม่ควรแพงกว่าค่าเช่าอีกหนึ่งวัน ไม่งั้นลูกค้าเสียเปรียบกว่าปัดเป็นวันเลย
  const lastDayPrice = segments.at(-1)?.pricePerDay ?? pricePerDay;
  const lateFee =
    duration.lateHours > 0
      ? Math.min(duration.lateHours * lateRule.hourlyFee, lastDayPrice)
      : 0;

  if (lateFee > 0) {
    lines.push({
      kind: "late",
      label: `คืนรถล่าช้า ${duration.lateHours} ชม. × ${lateRule.hourlyFee.toLocaleString()} บาท`,
      amount: lateFee,
    });
  }

  const afterHoursTotal = pickup.fee + ret.fee;

  return {
    days,
    lateHours: duration.lateHours,
    lateFee,
    duration,
    rentTotal,
    segments,
    pickupFee: pickup.fee,
    returnFee: ret.fee,
    afterHoursTotal,
    total: rentTotal + afterHoursTotal + lateFee,
    lines,
  };
}

/**
 * ช่วงเวลาสองช่วงทับกันไหม — เทียบทุก 15 นาทีตลอดวัน
 * วิธีนี้ถูกต้องกับช่วงที่ข้ามเที่ยงคืนด้วย และอ่านง่ายกว่าเลขคณิตของช่วง wrap
 */
export function rangesOverlap(
  a: Pick<AfterHoursRate, "startMinute" | "endMinute">,
  b: Pick<AfterHoursRate, "startMinute" | "endMinute">
): boolean {
  for (let m = 0; m < MINUTES_PER_DAY; m += 15) {
    if (isInRange(m, a as AfterHoursRate) && isInRange(m, b as AfterHoursRate)) return true;
  }
  return false;
}
