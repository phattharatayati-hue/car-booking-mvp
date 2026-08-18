import { prisma } from "@/lib/prisma";

export const SETTINGS_ID = "default";
export const TZ = "Asia/Bangkok";

export type AppSettings = {
  returnReminderOn: boolean;
  returnReminderDays: number;
  returnReminderHour: number;
  openHour: number;
  closeHour: number;
  bookingFee: number;
  securityDeposit: number;
  serviceNote: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  returnReminderOn: true,
  returnReminderDays: 1,
  returnReminderHour: 9,
  openHour: 6,
  closeHour: 20,
  bookingFee: 500,
  securityDeposit: 3000,
  serviceNote:
    "การเช่ารถขับเองในจังหวัดเชียงใหม่เท่านั้น หากออกต่างจังหวัดจะมีค่าใช้จ่ายเพิ่มเติมครับ",
};

/** อ่านค่าตั้งค่า — ถ้ายังไม่มีแถวจะสร้างให้อัตโนมัติ */
export async function getSettings(): Promise<AppSettings> {
  try {
    const row = await prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID },
      update: {},
    });
    return {
      returnReminderOn: row.returnReminderOn,
      returnReminderDays: row.returnReminderDays,
      returnReminderHour: row.returnReminderHour,
      openHour: row.openHour,
      closeHour: row.closeHour,
      bookingFee: row.bookingFee,
      securityDeposit: row.securityDeposit,
      serviceNote: row.serviceNote,
    };
  } catch (err) {
    console.error("getSettings failed:", err);
    return DEFAULT_SETTINGS;
  }
}

/** ชั่วโมงปัจจุบันตามเวลาไทย (0-23) */
export function bangkokHour(now: Date): number {
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "2-digit",
    hour12: false,
  }).format(now);
  return Number(s);
}

/** วันที่ตามเวลาไทยในรูปแบบ YYYY-MM-DD */
export function bangkokDateStr(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * แปลง "วันที่ + เวลา" ที่ลูกค้าเลือก (ถือเป็นเวลาไทยเสมอ) ให้เป็น Date
 * รับได้ทั้ง ("2026-08-20", "10:00") และ ("2026-08-20T10:00")
 */
export function toBangkokDate(dateStr: string, timeStr?: string): Date {
  const [datePart, timeFromDate] = dateStr.split("T");
  const time = (timeStr || timeFromDate || "00:00").slice(0, 5);
  return new Date(`${datePart}T${time}:00+07:00`);
}

/** เวลาไทยในรูปแบบ HH:mm */
export function formatBangkokTime(d: Date): string {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(d));
}

/** วัน + เวลาไทยแบบอ่านง่าย เช่น "20 ส.ค. 2569 10:00 น." */
export function formatBangkokDateTime(d: Date): string {
  const date = new Intl.DateTimeFormat("th-TH", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
  return `${date} ${formatBangkokTime(d)} น.`;
}

/** รายการเวลาให้เลือก ตามเวลาทำการ */
export function timeOptions(openHour: number, closeHour: number): string[] {
  const out: string[] = [];
  for (let h = openHour; h <= closeHour; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    if (h !== closeHour) out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
}

/** เช็คว่าเวลาอยู่ในเวลาทำการไหม */
export function isWithinHours(d: Date, openHour: number, closeHour: number): boolean {
  const h = bangkokHour(d);
  return h >= openHour && h <= closeHour;
}

/** ช่วงเวลาของ "วันนั้นทั้งวัน" ตามเวลาไทย แปลงกลับเป็น UTC เพื่อ query */
export function bangkokDayRange(dateStr: string) {
  // เวลาไทย = UTC+7 ตลอดปี (ไม่มี DST)
  const start = new Date(`${dateStr}T00:00:00+07:00`);
  const end = new Date(start.getTime() + 86400000);
  return { start, end };
}
