import { prisma } from "@/lib/prisma";

/**
 * ใบเสร็จรับเงิน — ตัวช่วยฝั่งเซิร์ฟเวอร์
 *
 * ยังไม่มี VAT ตามที่ร้านใช้อยู่จริง ถ้าวันหนึ่งจดทะเบียน VAT
 * ต้องเพิ่มบรรทัด "ราคาก่อนภาษี / ภาษีมูลค่าเพิ่ม 7% / รวมทั้งสิ้น" และเปลี่ยนชื่อเอกสาร
 * เป็น "ใบเสร็จรับเงิน/ใบกำกับภาษี" ด้วย — แก้ที่ lib/receipt.ts กับหน้าใบเสร็จสองที่
 */

export type ReceiptItem = {
  name: string;
  qty: number;
  unitPrice: number;
  discount: number;
  amount: number;
};

export const PAYMENT_LABEL: Record<string, string> = {
  CASH: "เงินสด",
  TRANSFER: "โอนเงิน",
  CHEQUE: "เช็คธนาคาร",
  OTHER: "อื่นๆ",
};

export const PAYMENT_METHODS = ["CASH", "TRANSFER", "CHEQUE", "OTHER"] as const;

/** ปี พ.ศ. ปัจจุบันตามเวลาไทย */
export function buddhistYear(d: Date = new Date()): number {
  const y = Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
    }).format(d)
  );
  return y + 543;
}

/** รูปแบบเลขที่ใบเสร็จ — รีเซ็ตลำดับทุกปี */
export function receiptNumber(year: number, seq: number): string {
  return `RE-${year}-${String(seq).padStart(5, "0")}`;
}

/**
 * ขอเลขลำดับถัดไปของปีนั้น
 *
 * ใช้ upsert + increment ในคำสั่งเดียว ไม่ใช่ "อ่านค่าแล้วบวกหนึ่งแล้วเขียน"
 * เพราะแอดมินสองคนกดออกใบเสร็จพร้อมกันจะได้เลขซ้ำ ซึ่งเป็นปัญหาทางบัญชี
 * ฐานข้อมูลเป็นคนบวกให้ จึงไม่มีช่องว่างให้สองคำสั่งชนกัน
 */
export async function nextReceiptSeq(year: number): Promise<number> {
  const row = await prisma.receiptCounter.upsert({
    where: { year },
    create: { year, lastSeq: 1 },
    update: { lastSeq: { increment: 1 } },
  });
  return row.lastSeq;
}

const UNITS = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const PLACES = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

/** อ่านจำนวนเต็มไม่เกินหลักล้านเป็นคำไทย */
function readInt(n: number): string {
  if (n === 0) return "ศูนย์";

  // เกินล้าน อ่านส่วนล้านก่อนแล้วต่อด้วยที่เหลือ เช่น 1,200,000 = หนึ่งล้านสองแสน
  if (n >= 1_000_000) {
    const millions = Math.floor(n / 1_000_000);
    const rest = n % 1_000_000;
    return readInt(millions) + "ล้าน" + (rest > 0 ? readInt(rest) : "");
  }

  const digits = String(n).split("").map(Number);
  let out = "";

  digits.forEach((d, i) => {
    const place = digits.length - i - 1;
    if (d === 0) return;

    // กฎการอ่านเลขไทยที่ต่างจากภาษาอื่น
    if (place === 1 && d === 1) out += "สิบ";        // 10 = สิบ ไม่ใช่ หนึ่งสิบ
    else if (place === 1 && d === 2) out += "ยี่สิบ"; // 20 = ยี่สิบ ไม่ใช่ สองสิบ
    else if (place === 0 && d === 1 && digits.length > 1) out += "เอ็ด"; // 21 = ยี่สิบเอ็ด
    else out += UNITS[d] + PLACES[place];
  });

  return out;
}

/** แปลงจำนวนเงินเป็นตัวอักษร เช่น 3200 → "สามพันสองร้อยบาทถ้วน" */
export function bahtText(amount: number): string {
  const neg = amount < 0;
  const abs = Math.abs(amount);
  const baht = Math.floor(abs);
  const satang = Math.round((abs - baht) * 100);

  const head = `${readInt(baht)}บาท`;
  const tail = satang > 0 ? `${readInt(satang)}สตางค์` : "ถ้วน";
  return (neg ? "ลบ" : "") + head + tail;
}

/** จำนวนวันเช่าแบบปัดขึ้น — ใช้เขียนรายการในใบเสร็จ ไม่ใช่ตัวคิดราคา */
export function rentalDays(start: Date, end: Date): number {
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
}

/** รวมยอดจากรายการ */
export function sumItems(items: ReceiptItem[]): {
  subtotal: number;
  discount: number;
  total: number;
} {
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const discount = items.reduce((s, i) => s + i.discount, 0);
  return { subtotal, discount, total: Math.max(0, subtotal - discount) };
}

/** ตรวจรายการที่รับมาจากฟอร์ม — คืนรายการที่สะอาดแล้ว หรือ null ถ้าใช้ไม่ได้ */
export function parseItems(raw: unknown): ReceiptItem[] | null {
  if (!Array.isArray(raw)) return null;

  const items: ReceiptItem[] = [];
  for (const r of raw) {
    const name = String((r as ReceiptItem)?.name ?? "").trim();
    if (!name) continue; // แถวว่างคือแถวที่แอดมินไม่ได้ใช้ ข้ามไปเฉย ๆ

    const qty = Math.floor(Number((r as ReceiptItem)?.qty));
    const unitPrice = Math.floor(Number((r as ReceiptItem)?.unitPrice));
    const discount = Math.floor(Number((r as ReceiptItem)?.discount ?? 0));

    if (!Number.isFinite(qty) || qty < 1 || qty > 9999) return null;
    if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 10_000_000) return null;
    if (!Number.isFinite(discount) || discount < 0 || discount > qty * unitPrice) return null;

    items.push({
      name: name.slice(0, 200),
      qty,
      unitPrice,
      discount,
      amount: qty * unitPrice - discount,
    });
  }

  return items.length > 0 ? items : null;
}
