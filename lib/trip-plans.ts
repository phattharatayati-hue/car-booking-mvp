/**
 * แผนการเดินทางของลูกค้า — ตรรกะล้วน ใช้ได้ทั้งฝั่งเว็บและเซิร์ฟเวอร์
 *
 * แต่ละแพลน = สถานที่ยอดนิยมหนึ่งแห่ง หรือ "อื่นๆ" ที่ลูกค้ากรอกจังหวัด/อำเภอ/ชื่อเอง
 *
 * ค่าบริการเพิ่มหาจากละเอียดไปหยาบ: เรทสถานที่ → เรทอำเภอ → เรทจังหวัด → 0
 * หลายแพลนคิดครั้งเดียวต่อการจอง โดยใช้เรทสูงสุด
 * (ต้นทุนจริงของร้าน — สึกหรอ ล้างรถ — เกิดครั้งเดียวต่อการเช่า ไม่ใช่ต่อสถานที่)
 */
import { OTHER_PROVINCE, isServiceProvince, isValidDistrict } from "@/lib/th-areas";

export const MAX_TRIP_PLANS = 10;

export type TripPlaceView = {
  id: string;
  name: string;
  province: string;
  district: string;
  surcharge: number;
};

export type TripAreaRateView = {
  province: string;
  /** null = ทั้งจังหวัด */
  district: string | null;
  surcharge: number;
};

/** สิ่งที่ฟอร์มส่งมา */
export type TripPlanInput = {
  placeId?: string | null;
  province?: string;
  district?: string;
  placeName?: string;
};

/** แพลนที่ตรวจแล้ว พร้อมบันทึก */
export type TripPlanResolved = {
  placeId: string | null;
  province: string;
  district: string;
  placeName: string;
  outsideArea: boolean;
  surcharge: number;
};

export function areaSurcharge(
  province: string,
  district: string,
  areaRates: TripAreaRateView[]
): number {
  const d = areaRates.find((r) => r.province === province && r.district === district);
  if (d) return d.surcharge;
  const p = areaRates.find((r) => r.province === province && !r.district);
  return p?.surcharge ?? 0;
}

/**
 * ตรวจและเติมข้อมูลแพลน — ห้ามเชื่อเรทที่ฝั่งเว็บส่งมา คิดใหม่จากหลังบ้านเสมอ
 * คืน error เป็นข้อความไทยถ้ากรอกไม่ครบ
 */
export function resolveTripPlans(
  inputs: TripPlanInput[],
  places: TripPlaceView[],
  areaRates: TripAreaRateView[]
): { ok: true; plans: TripPlanResolved[] } | { ok: false; error: string } {
  const list = Array.isArray(inputs) ? inputs.slice(0, MAX_TRIP_PLANS) : [];
  const plans: TripPlanResolved[] = [];

  for (const [i, raw] of list.entries()) {
    const n = i + 1;
    if (raw?.placeId) {
      const place = places.find((p) => p.id === raw.placeId);
      if (!place) return { ok: false, error: `แพลนที่ ${n}: ไม่พบสถานที่ที่เลือก กรุณาเลือกใหม่` };
      plans.push({
        placeId: place.id,
        province: place.province,
        district: place.district,
        placeName: place.name,
        outsideArea: false,
        surcharge:
          place.surcharge > 0
            ? place.surcharge
            : areaSurcharge(place.province, place.district, areaRates),
      });
      continue;
    }

    const province = String(raw?.province ?? "").trim().slice(0, 60);
    const district = String(raw?.district ?? "").trim().slice(0, 60);
    const placeName = String(raw?.placeName ?? "").trim().slice(0, 120);
    if (!province || !district || !placeName) {
      return { ok: false, error: `แพลนที่ ${n}: กรุณากรอกจังหวัด อำเภอ และชื่อสถานที่ให้ครบ` };
    }

    if (isServiceProvince(province)) {
      if (!isValidDistrict(province, district)) {
        return { ok: false, error: `แพลนที่ ${n}: อำเภอไม่ตรงกับจังหวัด กรุณาเลือกใหม่` };
      }
      plans.push({
        placeId: null,
        province,
        district,
        placeName,
        outsideArea: false,
        surcharge: areaSurcharge(province, district, areaRates),
      });
    } else {
      // นอกพื้นที่ — ลูกค้าพิมพ์จังหวัดเองใน district ไม่ได้ ใช้รูปแบบ "อื่นๆ" + ข้อความ
      plans.push({
        placeId: null,
        province: province === OTHER_PROVINCE ? OTHER_PROVINCE : province,
        district,
        placeName,
        outsideArea: true,
        surcharge: 0,
      });
    }
  }

  if (plans.length === 0) {
    return { ok: false, error: "กรุณากรอกแผนการเดินทางอย่างน้อย 1 แห่ง" };
  }
  return { ok: true, plans };
}

/** ค่าบริการตามแผนเดินทาง — ใช้เรทสูงสุดครั้งเดียว */
export function tripSurchargeOf(plans: { surcharge: number }[]): number {
  return plans.reduce((m, p) => Math.max(m, p.surcharge || 0), 0);
}

/** บรรทัดสรุป เช่น "เชียงใหม่ · จอมทอง · ดอยอินทนนท์" */
export function tripPlanLabel(p: { province: string; district: string; placeName: string }): string {
  return [p.province, p.district, p.placeName].filter(Boolean).join(" · ");
}
