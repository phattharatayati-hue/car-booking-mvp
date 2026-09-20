/**
 * ส่วนลดตามช่วงวัน — ตรรกะล้วน ไม่แตะฐานข้อมูล
 *
 * กติกาที่ตกลงกับบริษัท
 *   1. ยึด "วันรับรถ" เป็นตัวตัดสินว่าเข้าโปรฯ ไหม (ไม่ใช่วันที่กดจอง)
 *   2. ลดเป็นบาทต่อวัน
 *   3. เช่าครบขั้นต่ำแล้ว ลดทุกวันที่เช่า ไม่ใช่เฉพาะวันที่เกินขั้นต่ำ
 *   4. ใช้กับรถทุกคัน และเข้าได้ทีละโปรฯ — ถ้าเข้าหลายอัน เลือกอันที่ลูกค้าได้ลดมากที่สุด
 *
 * วันที่ในไฟล์นี้เป็นสตริง "YYYY-MM-DD" ตามปฏิทินไทย เหมือน lib/car-rates.ts
 */

export type PromotionView = {
  id: string;
  name: string;
  /** วันแรกที่ใช้ได้ (นับวันรับรถ) */
  startDate: string;
  /** วันสุดท้ายที่ใช้ได้ — รวมวันนี้ด้วย */
  endDate: string;
  /** เช่าอย่างน้อยกี่วันถึงเข้าเงื่อนไข */
  minDays: number;
  /** ลดกี่บาทต่อวัน */
  discountPerDay: number;
  /** เพดานส่วนลดต่อการจอง — null คือไม่จำกัด */
  maxDiscount?: number | null;
};

export type PromotionHit = {
  promo: PromotionView;
  /** ยอดที่ลดจริง หลังคิดเพดานและไม่ให้เกินค่าเช่า */
  amount: number;
};

/** โปรฯ นี้ใช้กับการจองนี้ได้ไหม */
export function promotionApplies(
  promo: PromotionView,
  pickupDateStr: string,
  days: number
): boolean {
  if (days < Math.max(1, promo.minDays)) return false;
  return pickupDateStr >= promo.startDate && pickupDateStr <= promo.endDate;
}

/** ส่วนลดของโปรฯ หนึ่งอัน — ไม่ให้เกินเพดานและไม่เกินค่าเช่า */
export function discountOf(promo: PromotionView, days: number, rentTotal: number): number {
  const raw = Math.max(0, Math.floor(promo.discountPerDay)) * days;
  const capped = promo.maxDiscount != null ? Math.min(raw, promo.maxDiscount) : raw;
  return Math.max(0, Math.min(capped, rentTotal));
}

/** โปรฯ ที่ลูกค้าได้ลดมากที่สุด — ไม่มีคืนค่า null */
export function bestPromotion(
  promos: PromotionView[],
  pickupDateStr: string,
  days: number,
  rentTotal: number
): PromotionHit | null {
  let best: PromotionHit | null = null;
  for (const promo of promos) {
    if (!promotionApplies(promo, pickupDateStr, days)) continue;
    const amount = discountOf(promo, days, rentTotal);
    if (amount <= 0) continue;
    if (!best || amount > best.amount) best = { promo, amount };
  }
  return best;
}

/** ข้อความสำหรับบิลและการ์ด เช่น "ลดวันละ 100 บาท × 3 วัน" */
export function promotionLineLabel(hit: PromotionHit, days: number): string {
  return `${hit.promo.name} — ลดวันละ ${hit.promo.discountPerDay.toLocaleString()} บาท × ${days} วัน`;
}
