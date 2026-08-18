/**
 * ค่าคงที่และตัวช่วยเรื่องจุดรับ-ส่งรถ
 *
 * ไฟล์นี้ต้องไม่ import prisma — client component ใช้ไฟล์นี้ด้วย
 * ถ้าดึง prisma เข้ามา Turbopack จะพยายาม bundle pg ลงฝั่ง client แล้วพัง
 * ฟังก์ชันที่คุยกับฐานข้อมูลอยู่ที่ lib/pickup-points-server.ts
 */

export type PickupOption = { id: string; name: string; fee: number };

/** ตัวเลือกที่ให้ลูกค้าเลือกเมื่อจุดที่ต้องการไม่มีในรายการ */
export const OTHER_PLACE = "อื่นๆ — แจ้งแอดมินภายหลัง";

/** ป้ายกำกับที่แสดงให้ลูกค้าเห็น เช่น "สนามบิน (ฟรี)" */
export function pointLabel(p: PickupOption): string {
  return p.fee > 0 ? `${p.name} (+${p.fee.toLocaleString()} บาท)` : `${p.name} (ฟรี)`;
}

/**
 * ตรวจว่าค่าที่ลูกค้าส่งมาเป็นจุดที่เปิดใช้งานจริง
 * กันคนยิง request ตรงแล้วใส่ข้อความอะไรก็ได้เข้ามา
 */
export function normalizePlace(
  value: unknown,
  points: PickupOption[]
): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (text === OTHER_PLACE) return OTHER_PLACE;
  return points.find((p) => p.name === text)?.name ?? null;
}
