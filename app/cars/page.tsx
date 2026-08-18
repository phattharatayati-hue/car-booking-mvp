export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import PublicShell from "@/components/PublicShell";
import CarCard from "@/components/CarCard";
import { getAvailability, firstFreeDate } from "@/lib/availability";
import { bangkokDateStr, getSettings } from "@/lib/settings";
import ServiceNote from "@/components/ServiceNote";

type CarCardData = {
  id: string;
  name: string;
  brand: string;
  pricePerDay: number;
  photoUrl: string | null;
  source: string;
  licensePlate: string;
};

const SORTS = [
  { key: "price-asc", label: "ราคาต่ำ → สูง" },
  { key: "price-desc", label: "ราคาสูง → ต่ำ" },
  { key: "newest", label: "มาใหม่ล่าสุด" },
];

export default async function CarsPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; sort?: string }>;
}) {
  const { brand, sort } = await searchParams;

  const orderBy =
    sort === "price-desc"
      ? { pricePerDay: "desc" as const }
      : sort === "newest"
      ? { createdAt: "desc" as const }
      : { pricePerDay: "asc" as const };

  const settings = await getSettings();

  const cars = await prisma.car.findMany({
    where: {
      status: "AVAILABLE",
      ...(brand ? { brand } : {}),
    },
    orderBy,
  });

  const allCars = await prisma.car.findMany({
    where: { status: "AVAILABLE" },
    select: { brand: true },
  });
  const brands: string[] = Array.from(
    new Set(allCars.map((c: { brand: string }) => c.brand) as string[])
  ).sort();


  const fromStr = bangkokDateStr(new Date());
  const availabilityMap = await getAvailability(
    cars.map((c: CarCardData) => c.id),
    fromStr,
    60
  );

  function availabilityFor(carId: string) {
    const map = availabilityMap.get(carId) ?? {};
    return {
      busyToday: map[fromStr] === "full",
      nextFree: firstFreeDate(map, fromStr, 60),
    };
  }

  function linkFor(next: { brand?: string; sort?: string }) {
    const params = new URLSearchParams();
    const b = next.brand !== undefined ? next.brand : brand;
    const s = next.sort !== undefined ? next.sort : sort;
    if (b) params.set("brand", b);
    if (s) params.set("sort", s);
    const qs = params.toString();
    return qs ? `/cars?${qs}` : "/cars";
  }

  return (
    <PublicShell>
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <nav className="text-sm text-slate-500 mb-3">
            <Link href="/" className="hover:text-blue-700">หน้าแรก</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">รถทั้งหมด</span>
          </nav>
          <h1 className="text-3xl font-bold text-slate-900">รถทั้งหมด</h1>
          <p className="text-slate-500 mt-1.5">
            มีรถว่างให้จอง {cars.length} คัน
          </p>
          <ServiceNote note={settings.serviceNote} className="mt-5 max-w-2xl" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* ตัวกรอง */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-600 mr-1">ยี่ห้อ:</span>
            <Link
              href={linkFor({ brand: "" })}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                !brand
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              ทั้งหมด
            </Link>
            {brands.map((b: string) => (
              <Link
                key={b}
                href={linkFor({ brand: b })}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  brand === b
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {b}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-600 mr-1">เรียงตาม:</span>
            {SORTS.map((s) => (
              <Link
                key={s.key}
                href={linkFor({ sort: s.key })}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  (sort ?? "price-asc") === s.key
                    ? "bg-slate-900 border-slate-900 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>

        {cars.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cars.map((car: CarCardData) => (
              <CarCard key={car.id} car={car} availability={availabilityFor(car.id)} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-20 text-center">
            <p className="text-slate-500">ไม่พบรถตามเงื่อนไขที่เลือก</p>
            <Link
              href="/cars"
              className="inline-block mt-4 text-sm font-semibold text-blue-700 hover:text-blue-800"
            >
              ล้างตัวกรอง
            </Link>
          </div>
        )}
      </div>
    </PublicShell>
  );
}
