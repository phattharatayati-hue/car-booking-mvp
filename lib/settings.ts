import { prisma } from "@/lib/prisma";

export const SETTINGS_ID = "default";
export const TZ = "Asia/Bangkok";

export type AppSettings = {
  returnReminderOn: boolean;
  /** เตือนล่วงหน้ากี่นาที ก่อนเวลานัดคืนรถของการจองนั้น */
  returnReminderMinutesBefore: number;
  bookingFee: number;
  securityDeposit: number;
  serviceNote: string;
  /** ค่าคืนรถล่าช้าต่อชั่วโมง */
  lateHourlyFee: number;
  /** เลทตั้งแต่กี่ชั่วโมงจะปัดเป็นค่าเช่าอีก 1 วัน */
  lateRoundUpHours: number;
  /** ผ่อนปรนกี่นาทีก่อนเริ่มคิดค่าเลท */
  lateGraceMinutes: number;
};

export const DEFAULT_SETTINGS: AppSettings = {
  returnReminderOn: true,
  returnReminderMinutesBefore: 120,
  bookingFee: 500,
  securityDeposit: 3000,
  serviceNote:
    "การเช่ารถขับเองในจังหวัดเชียงใหม่เท่านั้น หากออกต่างจังหวัดจะมีค่าใช้จ่ายเพิ่มเติมครับ",
  lateHourlyFee: 200,
  lateRoundUpHours: 4,
  lateGraceMinutes: 0,
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
      returnReminderMinutesBefore: row.returnReminderMinutesBefore,
      bookingFee: row.bookingFee,
      securityDeposit: row.securityDeposit,
      serviceNote: row.serviceNote,
      lateHourlyFee: row.lateHourlyFee,
      lateRoundUpHours: row.lateRoundUpHours,
      lateGraceMinutes: row.lateGraceMinutes,
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

/**
 * รายการเวลาให้เลือกตอนจอง — เปิดให้จองได้ทุกเวลา ทีละครึ่งชั่วโมง (00:00-23:30)
 * เวลานอกเวลาทำการมีค่าธรรมเนียมเพิ่ม ตั้งได้ที่ /admin/after-hours
 */
export function timeOptions(): string[] {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
}

/** ช่วงเวลาของ "วันนั้นทั้งวัน" ตามเวลาไทย แปลงกลับเป็น UTC เพื่อ query */
export function bangkokDayRange(dateStr: string) {
  // เวลาไทย = UTC+7 ตลอดปี (ไม่มี DST)
  const start = new Date(`${dateStr}T00:00:00+07:00`);
  const end = new Date(start.getTime() + 86400000);
  return { start, end };
}

/** ขอบเขตที่ยอมให้ตั้งค่าเตือนล่วงหน้าได้ — 5 นาที ถึง 7 วัน */
export const REMINDER_MIN_MINUTES = 5;
export const REMINDER_MAX_MINUTES = 7 * 24 * 60;

/** แยกนาทีรวมเป็น ชั่วโมง + นาที สำหรับแสดงในฟอร์ม */
export function splitMinutes(total: number): { hours: number; minutes: number } {
  const t = Math.max(0, Math.trunc(total));
  return { hours: Math.floor(t / 60), minutes: t % 60 };
}

/** ข้อความอ่านง่ายจากจำนวนนาที เช่น "2 ชั่วโมง", "1 ชั่วโมง 30 นาที", "45 นาที" */
export function formatMinutesBefore(total: number): string {
  const { hours, minutes } = splitMinutes(total);
  const parts: string[] = [];
  if (hours) parts.push(`${hours} ชั่วโมง`);
  if (minutes) parts.push(`${minutes} นาที`);
  return parts.join(" ") || "0 นาที";
}

/** แปลงค่าตั้งค่าเป็นกติกาค่าเลทที่ lib/pricing.ts ใช้ */
export function lateRuleFromSettings(s: AppSettings) {
  return {
    hourlyFee: s.lateHourlyFee,
    roundUpHours: s.lateRoundUpHours,
    graceMinutes: s.lateGraceMinutes,
  };
}
