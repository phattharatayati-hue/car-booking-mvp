import { prisma } from "@/lib/prisma";

export type PickupOption = { id: string; name: string; fee: number };

/** ตัวเลือกที่ให้ลูกค้าเลือกเมื่อจุดที่ต้องการไม่มีในรายการ */
export const OTHER_PLACE = "อื่นๆ — แจ้งแอดมินภายหลัง";

/** จุดรับ-ส่งที่เปิดใช้งาน เรียงตามลำดับที่แอดมินตั้งไว้ */
export async function getPickupPoints(): Promise<PickupOption[]> {
  try {
    const rows = await prisma.pickupPoint.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, fee: true },
    });
    return rows;
  } catch (err) {
    console.error("getPickupPoints failed:", err);
    return [];
  }
}

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
