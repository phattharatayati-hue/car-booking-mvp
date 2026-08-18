import { prisma } from "@/lib/prisma";
import type { PickupOption } from "@/lib/pickup-points";

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
