/**
 * ช่วงเว้นระหว่างการจองที่ต่อกัน — เผื่อเวลาล้างและเตรียมรถ
 *
 * ตั้งได้ที่ /admin/settings (Settings.turnaroundMinutes) ค่าเริ่มต้น 120 นาที
 * ใบจองเดิมถือว่ากินเวลาเพิ่ม "ก่อนรับ" และ "หลังคืน" อีกเท่านี้
 * เช่น คืนรถ 10:00 เว้น 2 ชม. → คนถัดไปรับได้ตั้งแต่ 12:00
 */

const MIN_MS = 60_000;

/** เงื่อนไข Prisma หาใบจองที่ชนกับช่วง [start, end) เมื่อรวมช่วงเว้นแล้ว */
export function clashWhere(start: Date, end: Date, turnaroundMinutes: number) {
  const pad = Math.max(0, turnaroundMinutes) * MIN_MS;
  return {
    startDate: { lt: new Date(end.getTime() + pad) },
    endDate: { gt: new Date(start.getTime() - pad) },
  };
}

/** ขยายช่วงไม่ว่างของใบจองด้วยช่วงเว้น — ใช้ตอนแสดงเวลาที่จองไม่ได้ */
export function padRange<T extends { start: Date; end: Date }>(r: T, turnaroundMinutes: number): T {
  const pad = Math.max(0, turnaroundMinutes) * MIN_MS;
  return { ...r, start: new Date(r.start.getTime() - pad), end: new Date(r.end.getTime() + pad) };
}

export const CLASH_TURNAROUND_NOTE = (minutes: number) =>
  minutes > 0
    ? ` (ระบบเว้นช่วงเตรียมรถ ${minutes >= 60 && minutes % 60 === 0 ? `${minutes / 60} ชั่วโมง` : `${minutes} นาที`} ระหว่างการจองแต่ละคิว)`
    : "";
