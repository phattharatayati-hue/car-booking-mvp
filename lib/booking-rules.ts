/**
 * กฎ "ต้องจองล่วงหน้า" — จุดเดียวที่ตัดสินว่าเวลารับรถกระชั้นเกินไปหรือยัง
 *
 * เหตุผล: ทีมงานต้องเตรียมรถก่อนส่งมอบ — ล้าง เติมน้ำมัน เช็คสภาพ
 * จัดคิวคนไปส่ง และช่วงที่คิวแน่นต้องสลับรถกัน ถ้ารับจองแบบวันนี้จองพรุ่งเช้ารับ
 * จะกลายเป็นรับปากลูกค้าแล้วเตรียมไม่ทัน ซึ่งแย่กว่าการบอกตั้งแต่แรกว่าจองไม่ได้
 *
 * จำนวนชั่วโมงตั้งได้ที่หน้า /admin/settings (`Settings.minLeadHours`)
 * ทุกฟังก์ชันในไฟล์นี้จึงรับ hours เข้ามา — ไม่ไปอ่าน DB เอง
 * เพราะ client component ใช้ไฟล์นี้ด้วย (**ห้าม import prisma**)
 */

import { PHONES } from "@/lib/contact";

/** ค่าตั้งต้นเมื่ออ่านค่าจากฐานข้อมูลไม่ได้ — ต้องตรงกับ @default ใน schema.prisma */
export const DEFAULT_LEAD_HOURS = 24;

const HOUR_MS = 3600000;

/** เวลารับรถที่เร็วที่สุดที่จองได้ ณ ตอนนี้ */
export function earliestPickup(hours: number, now: Date = new Date()): Date {
  return new Date(now.getTime() + Math.max(0, hours) * HOUR_MS);
}

/** เวลารับรถที่เลือกมา เร็วเกินกว่าจะเตรียมรถทันหรือไม่ */
export function isTooSoon(start: Date, hours: number, now: Date = new Date()): boolean {
  if (hours <= 0) return false;
  return start.getTime() < earliestPickup(hours, now).getTime();
}

/** "2026-09-12" — วันแรกที่เลือกได้ในปฏิทิน (เวลาไทย) */
export function earliestPickupDateStr(hours: number, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(earliestPickup(hours, now));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "01";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** เบอร์แอดมินในรูปประโยค เช่น "061-280-9588 หรือ 092-745-8074" */
const ADMIN_PHONES = PHONES.join(" หรือ ");

/** ประโยคสั้นสำหรับป้ายกำกับใต้ช่องเลือกวัน */
export function leadTimeShort(hours: number): string {
  return `จองล่วงหน้าอย่างน้อย ${hours} ชั่วโมงเท่านั้น`;
}

/** ทางออกสำหรับคนที่ต้องใช้รถด่วน — ต้องเป็นการโทร ไม่ใช่ทักแชท
    เพราะงานด่วนต้องได้คำตอบทันที ไม่ใช่รอแอดมินมาเปิดแชท */
export const URGENT_LINE = `ต้องการใช้รถด่วนกว่านี้ กรุณาโทรหาแอดมิน ${ADMIN_PHONES}`;

/** ประโยคเต็มพร้อมเหตุผล สำหรับหน้าอธิบายและข้อความในแชท */
export function leadTimeNote(hours: number): string {
  return (
    `${leadTimeShort(hours)} เพื่อให้ทีมงานเตรียมรถและจัดคิวคนไปส่งได้ทัน — ` +
    `${URGENT_LINE} จะเช็ครถที่พร้อมส่งให้เป็นกรณีไป`
  );
}

/** ข้อความตอบเมื่อลูกค้าเลือกเวลารับรถเร็วเกินไป — เขียนให้รู้ว่าทำอะไรต่อได้ */
export function leadTimeMessage(hours: number): string {
  return [
    `ช่วงเวลานี้กระชั้นเกินไปครับ ระบบรับ${leadTimeShort(hours)}`,
    "ทีมงานต้องเตรียมรถและจัดคิวคนไปส่งก่อน ถ้าคิวแน่นจะส่งไม่ทันตามนัด",
    "",
    "กรุณาเลือกเวลารับรถใหม่",
    `หรือถ้าต้องใช้รถด่วน กรุณาโทรหาแอดมิน ${ADMIN_PHONES} จะเช็ครถที่พร้อมส่งให้ทันทีครับ`,
  ].join("\n");
}
