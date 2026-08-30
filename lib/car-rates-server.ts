import { prisma } from "@/lib/prisma";
import { bangkokDateStrOf, type CarRateView } from "@/lib/car-rates";

type Row = {
  id: string;
  carId: string;
  kind: "PRICE" | "BLOCK";
  label: string;
  startDate: Date;
  endDate: Date;
  pricePerDay: number | null;
};

function toView(r: Row): CarRateView {
  return {
    id: r.id,
    kind: r.kind,
    label: r.label,
    startDate: bangkokDateStrOf(r.startDate),
    endDate: bangkokDateStrOf(r.endDate),
    pricePerDay: r.pricePerDay,
  };
}

/** ช่วงราคาและช่วงปิดรับจองของรถคันเดียว เรียงตามวันเริ่ม */
export async function getCarRates(carId: string): Promise<CarRateView[]> {
  const rows = (await prisma.carRate.findMany({
    where: { carId },
    orderBy: [{ startDate: "asc" }],
  })) as Row[];
  return rows.map(toView);
}

/** ของรถหลายคันพร้อมกัน — ใช้ในหน้ารายการรถ ไม่ให้ยิงทีละคัน */
export async function getCarRatesMap(carIds: string[]): Promise<Map<string, CarRateView[]>> {
  const map = new Map<string, CarRateView[]>();
  if (carIds.length === 0) return map;

  const rows = (await prisma.carRate.findMany({
    where: { carId: { in: carIds } },
    orderBy: [{ startDate: "asc" }],
  })) as Row[];

  for (const id of carIds) map.set(id, []);
  for (const r of rows) map.get(r.carId)?.push(toView(r));

  return map;
}
