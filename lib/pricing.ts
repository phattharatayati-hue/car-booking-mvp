/**
 * คิดราคาการจอง — ไฟล์นี้เป็น "จุดเดียว" ที่คำนวณราคา
 *
 * ห้าม import prisma ในไฟล์นี้ เพราะ client component (ฟอร์มจองบนเว็บและ LIFF)
 * ใช้ไฟล์นี้แสดงราคาให้ลูกค้าเห็นก่อนกดจอง ถ้าใส่ prisma เข้าไป build จะพัง
 * ส่วนการดึงข้อมูลช่วงเวลาจากฐานข้อมูลอยู่ที่ lib/after-hours-server.ts
 */

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

export type QuoteLine = {
  kind: "rent" | "pickup" | "return";
  label: string;
  amount: number;
};

export type Quote = {
  days: number;
  rentTotal: number;
  pickupFee: number;
  returnFee: number;
  afterHoursTotal: number;
  total: number;
  lines: QuoteLine[];
};

/** จำนวนวันเช่า — เศษวันปัดขึ้น อย่างน้อย 1 วัน */
export function rentalDays(start: Date, end: Date): number {
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
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
}): Quote {
  const { start, end, pricePerDay, rates } = params;
  const days = rentalDays(start, end);
  const rentTotal = days * pricePerDay;

  const pickup = feeForMinute(bangkokMinuteOfDay(start), rates);
  const ret = feeForMinute(bangkokMinuteOfDay(end), rates);

  const lines: QuoteLine[] = [
    {
      kind: "rent",
      label: `ค่าเช่า ${days} วัน × ${pricePerDay.toLocaleString()} บาท`,
      amount: rentTotal,
    },
  ];
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

  const afterHoursTotal = pickup.fee + ret.fee;

  return {
    days,
    rentTotal,
    pickupFee: pickup.fee,
    returnFee: ret.fee,
    afterHoursTotal,
    total: rentTotal + afterHoursTotal,
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
