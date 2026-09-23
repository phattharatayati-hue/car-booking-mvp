import { prisma } from "@/lib/prisma";
import type { TripAreaRateView, TripPlaceView } from "@/lib/trip-plans";

/** สถานที่ยอดนิยมที่เปิดใช้งาน เรียงตามลำดับที่แอดมินตั้ง */
export async function getTripPlaces(): Promise<TripPlaceView[]> {
  try {
    const rows = await prisma.tripPlace.findMany({
      where: { isActive: true },
      orderBy: [{ province: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        province: true,
        district: true,
        surcharge: true,
        drivingTip: true,
        steep: true,
      },
    });
    return rows as TripPlaceView[];
  } catch (err) {
    console.error("getTripPlaces failed:", err);
    return [];
  }
}

export async function getTripAreaRates(): Promise<TripAreaRateView[]> {
  try {
    const rows = await prisma.tripAreaRate.findMany({
      select: { province: true, district: true, surcharge: true },
    });
    return rows as TripAreaRateView[];
  } catch (err) {
    console.error("getTripAreaRates failed:", err);
    return [];
  }
}
