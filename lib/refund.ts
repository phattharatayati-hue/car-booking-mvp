import { TZ } from "@/lib/settings";

/**
 * คิวคืนเงินประกัน
 *
 * สัญญาที่ให้ลูกค้าไว้คือ "รีวิวแล้วคืนภายใน 1 ชม. ไม่รีวิวคืนภายใน 12 ชม."
 * แต่การโอนต้องมีคนเปิดแอปธนาคารทำจริง ถ้านับเวลาดิบ ๆ ลูกค้าที่คืนรถสี่ทุ่ม
 * แล้วรีวิวทันทีจะครบกำหนดตอนตีห้า ซึ่งไม่มีใครทำได้ กลายเป็นสัญญาที่ผิดทุกคืน
 *
 * จึงนับเฉพาะ "ชั่วโมงทำการ" — เวลาที่เดินนอกเวลาทำการจะถูกยกไปเริ่มเช้าวันถัดไป
 * และข้อความที่ส่งให้ลูกค้าก็เขียนกำกับไว้ว่านับในเวลาทำการ
 */

export type RefundWindow = {
  /** คืนภายในกี่ชั่วโมงทำการ ถ้าลูกค้าแจ้งว่ารีวิวแล้ว */
  reviewedHours: number;
  /** คืนภายในกี่ชั่วโมงทำการ กรณีปกติ */
  normalHours: number;
  /** เวลาทำการเริ่มกี่โมง (0-23) */
  openHour: number;
  /** เวลาทำการเลิกกี่โมง (1-24) */
  closeHour: number;
};

/** ชั่วโมงตามเวลาไทยของ Date หนึ่งค่า (มีทศนิยมเป็นเศษนาที) */
function bangkokHourFloat(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h + m / 60;
}

/**
 * บวกชั่วโมงทำการเข้าไปจากเวลาที่กำหนด
 *
 * เดินทีละก้อน ไม่ใช่คำนวณสูตรเดียวจบ เพราะต้องข้ามคืนได้หลายรอบ
 * (เช่นคืนรถห้าทุ่มวันศุกร์ด้วยโควตา 12 ชม. จะไปจบบ่ายวันเสาร์)
 */
export function addBusinessHours(from: Date, hours: number, w: RefundWindow): Date {
  const openHour = Math.max(0, Math.min(23, w.openHour));
  const closeHour = Math.max(openHour + 1, Math.min(24, w.closeHour));

  let cursor = new Date(from.getTime());
  let left = hours;
  // กันลูปไม่รู้จบถ้าค่าตั้งค่าเพี้ยน — 60 รอบพอสำหรับสองเดือน
  for (let guard = 0; guard < 60 && left > 0; guard++) {
    const h = bangkokHourFloat(cursor);

    if (h < openHour) {
      // ยังไม่ถึงเวลาเปิด — เลื่อนไปตอนเปิดของวันนี้ นาฬิกายังไม่เริ่มเดิน
      cursor = new Date(cursor.getTime() + (openHour - h) * 3600000);
      continue;
    }
    if (h >= closeHour) {
      // เลยเวลาปิดแล้ว — ข้ามไปเวลาเปิดของวันรุ่งขึ้น
      cursor = new Date(cursor.getTime() + (24 - h + openHour) * 3600000);
      continue;
    }

    const usable = closeHour - h;
    if (left <= usable) return new Date(cursor.getTime() + left * 3600000);

    left -= usable;
    cursor = new Date(cursor.getTime() + usable * 3600000);
  }
  return cursor;
}

/** กำหนดที่ต้องโอนคืนให้เสร็จ */
export function refundDueAt(from: Date, reviewed: boolean, w: RefundWindow): Date {
  return addBusinessHours(from, reviewed ? w.reviewedHours : w.normalHours, w);
}

/** ยอดสุทธิที่ต้องโอนคืน */
export function refundNet(depositAmount: number, deductAmount: number): number {
  return Math.max(0, depositAmount - deductAmount);
}

/** เลขบัญชีที่ลบไปแล้วจะเหลือ null — ใช้ข้อความนี้แทนในหน้าจอ */
export const PURGED_LABEL = "ลบแล้วตามกำหนดเก็บข้อมูล";

export const METHOD_LABEL: Record<string, string> = {
  PROMPTPAY: "พร้อมเพย์",
  BANK: "บัญชีธนาคาร",
};

/** ลบเลขบัญชีทิ้งหลังโอนเสร็จกี่วัน — เลขบัญชีลูกค้าไม่ควรค้างอยู่ในระบบนานกว่าที่จำเป็น */
export const ACCOUNT_RETENTION_DAYS = 30;

/**
 * ตรวจรูปแบบเลขที่ลูกค้ากรอก — กันพิมพ์ผิดแบบเห็นชัด ไม่ได้ตรวจว่ามีบัญชีนี้จริง
 * พร้อมเพย์ = เบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก
 * บัญชีธนาคาร = 10-15 หลัก
 */
export function checkAccountNo(method: string, raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (method === "PROMPTPAY") {
    if (digits.length === 10 && digits.startsWith("0")) return null;
    if (digits.length === 13) return null;
    return "พร้อมเพย์ต้องเป็นเบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก";
  }
  if (digits.length < 10 || digits.length > 15) {
    return "เลขบัญชีธนาคารต้องมี 10-15 หลัก";
  }
  return null;
}

/** เก็บเฉพาะตัวเลข — เว้นวรรคกับขีดที่ลูกค้าพิมพ์มาทำให้คัดลอกไปวางในแอปธนาคารพัง */
export function normalizeAccountNo(raw: string): string {
  return raw.replace(/\D/g, "");
}
