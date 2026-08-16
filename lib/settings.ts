import { prisma } from "@/lib/prisma";

export const SETTINGS_ID = "default";
export const TZ = "Asia/Bangkok";

export type AppSettings = {
  returnReminderOn: boolean;
  returnReminderDays: number;
  returnReminderHour: number;
};

export const DEFAULT_SETTINGS: AppSettings = {
  returnReminderOn: true,
  returnReminderDays: 1,
  returnReminderHour: 9,
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

/** ช่วงเวลาของ "วันนั้นทั้งวัน" ตามเวลาไทย แปลงกลับเป็น UTC เพื่อ query */
export function bangkokDayRange(dateStr: string) {
  // เวลาไทย = UTC+7 ตลอดปี (ไม่มี DST)
  const start = new Date(`${dateStr}T00:00:00+07:00`);
  const end = new Date(start.getTime() + 86400000);
  return { start, end };
}
