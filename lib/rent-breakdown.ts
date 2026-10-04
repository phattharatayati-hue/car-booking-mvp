import { getSettings, lateRuleFromSettings } from "@/lib/settings";
import { quoteBooking } from "@/lib/pricing";
import { getAfterHoursRates } from "@/lib/after-hours-server";
import { getCarRates } from "@/lib/car-rates-server";

export type RentLine = { pricePerDay: number; days: number; total: number };

export type RentBreakdown = {
  /** จำนวนวันที่คิดค่าเช่า — นับแบบเดียวกับตอนสร้างใบจอง */
  days: number;
  /** ค่าเช่าแยกตามช่วงราคา — ช่วงเดียวคือราคาเท่ากันทุกวัน */
  segments: RentLine[];
  /** ผลรวมค่าเช่าล้วน (ยังไม่รวมค่าบริการอื่นและส่วนลด) */
  rentTotal: number;
};

/**
 * ค่าเช่าแยกช่วงราคาของใบจอง — ใช้แสดงในการ์ดแจ้งเตือน (แอดมิน · คนส่งรถ)
 *
 * ใช้ quoteBooking ตัวเดียวกับตอนสร้างใบจอง จำนวนวันจึงนับตรงกัน
 * คืน null ถ้าคำนวณไม่ได้ ผู้เรียกต้องส่งการ์ดต่อได้โดยไม่มีส่วนนี้ — ห้ามทำให้แจ้งเตือนหาย
 */
export async function rentBreakdown(b: {
  carId: string;
  startDate: Date;
  endDate: Date;
  car: { pricePerDay: number };
}): Promise<RentBreakdown | null> {
  try {
    const [settings, rates, carRates] = await Promise.all([
      getSettings(),
      getAfterHoursRates(),
      getCarRates(b.carId),
    ]);
    const quote = quoteBooking({
      start: b.startDate,
      end: b.endDate,
      pricePerDay: b.car.pricePerDay,
      rates,
      carRates,
      lateRule: lateRuleFromSettings(settings),
    });
    const segments = quote.segments.map((seg) => ({
      pricePerDay: seg.pricePerDay,
      days: seg.days,
      total: seg.total,
    }));
    return {
      days: quote.days,
      segments,
      rentTotal: segments.reduce((n, seg) => n + seg.total, 0),
    };
  } catch (err) {
    console.error("rentBreakdown failed:", err);
    return null;
  }
}

/** "1,000 × 2 = 2,000" */
export function rentLineText(seg: RentLine): string {
  return `${seg.pricePerDay.toLocaleString()} × ${seg.days} = ${seg.total.toLocaleString()}`;
}
