/**
 * จังหวัดและอำเภอในพื้นที่ให้บริการ — ข้อมูลคงที่ ไม่ต้องเก็บในฐานข้อมูล
 * เชียงใหม่ 25 · ลำพูน 8 · ลำปาง 13 อำเภอ
 */

export const SERVICE_PROVINCES = ["เชียงใหม่", "ลำพูน", "ลำปาง"] as const;
export type ServiceProvince = (typeof SERVICE_PROVINCES)[number];

/** ค่าที่ใช้แทนจังหวัดนอกพื้นที่ — ลูกค้าพิมพ์ชื่อจังหวัดเองต่อท้าย */
export const OTHER_PROVINCE = "อื่นๆ";

export const DISTRICTS: Record<ServiceProvince, string[]> = {
  เชียงใหม่: [
    "เมืองเชียงใหม่", "หางดง", "สารภี", "สันทราย", "แม่ริม", "สันกำแพง", "ดอยสะเก็ด",
    "สันป่าตอง", "แม่วาง", "ดอยหล่อ", "แม่แตง", "แม่ออน", "สะเมิง", "จอมทอง", "ฮอด",
    "ดอยเต่า", "เชียงดาว", "พร้าว", "ฝาง", "แม่อาย", "ไชยปราการ", "เวียงแหง",
    "แม่แจ่ม", "กัลยาณิวัฒนา", "อมก๋อย",
  ],
  ลำพูน: [
    "เมืองลำพูน", "ป่าซาง", "บ้านธิ", "แม่ทา", "บ้านโฮ่ง", "เวียงหนองล่อง", "ทุ่งหัวช้าง", "ลี้",
  ],
  ลำปาง: [
    "เมืองลำปาง", "เกาะคา", "ห้างฉัตร", "แม่ทะ", "สบปราบ", "เสริมงาม", "เถิน", "แม่พริก",
    "แม่เมาะ", "งาว", "แจ้ห่ม", "วังเหนือ", "เมืองปาน",
  ],
};

export function isServiceProvince(p: string): p is ServiceProvince {
  return (SERVICE_PROVINCES as readonly string[]).includes(p);
}

export function isValidDistrict(province: string, district: string): boolean {
  return isServiceProvince(province) && DISTRICTS[province].includes(district);
}
