import { prisma } from "@/lib/prisma";
import { bangkokDateStrOf } from "@/lib/car-rates";
import type { PromotionView } from "@/lib/promotions";

type Row = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  minDays: number;
  discountPerDay: number;
  maxDiscount: number | null;
};

function toView(r: Row): PromotionView {
  return {
    id: r.id,
    name: r.name,
    startDate: bangkokDateStrOf(r.startDate),
    endDate: bangkokDateStrOf(r.endDate),
    minDays: r.minDays,
    discountPerDay: r.discountPerDay,
    maxDiscount: r.maxDiscount,
  };
}

/** โปรฯ ที่เปิดใช้งานอยู่ เรียงตามวันเริ่ม */
export async function getActivePromotions(): Promise<PromotionView[]> {
  try {
    const rows = (await prisma.promotion.findMany({
      where: { isActive: true },
      orderBy: [{ startDate: "asc" }],
    })) as Row[];
    return rows.map(toView);
  } catch (err) {
    console.error("getActivePromotions failed:", err);
    return [];
  }
}
