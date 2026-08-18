export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import LiffBooking from "./LiffBooking";
import { getAvailability } from "@/lib/availability";
import { bangkokDateStr, getSettings, timeOptions } from "@/lib/settings";
import ServiceNote from "@/components/ServiceNote";
import { getPickupPoints } from "@/lib/pickup-points-server";
import { needsApproval } from "@/lib/booking-status";

type CarRow = {
  id: string;
  brand: string;
  name: string;
  pricePerDay: number;
  photoUrl: string | null;
  source: string;
  partnerId: string | null;
};

export default async function LineBookPage({
  searchParams,
}: {
  searchParams: Promise<{ car?: string }>;
}) {
  const { car: carId } = await searchParams;
  const settings = await getSettings();
  const pickupPoints = await getPickupPoints();
  const times = timeOptions(settings.openHour, settings.closeHour);
  const liffId = process.env.NEXT_PUBLIC_LIFF_BOOKING_ID ?? process.env.NEXT_PUBLIC_LIFF_ID ?? "";

  // ยังไม่เลือกรถ — แสดงรายการให้เลือกก่อน
  if (!carId) {
    const cars = await prisma.car.findMany({
      where: { status: "AVAILABLE" },
      orderBy: { pricePerDay: "asc" },
    });

    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-bold text-slate-900 mb-4">เลือกรถที่ต้องการจอง</h1>
          <ServiceNote note={settings.serviceNote} className="mb-4" />
          <div className="flex flex-col gap-3">
            {cars.map((c: CarRow) => (
              <Link
                key={c.id}
                href={`/line/book?car=${c.id}`}
                className="bg-white rounded-2xl border border-slate-200 p-3 flex gap-3 items-center active:bg-slate-50"
              >
                <div className="relative w-20 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                  {c.photoUrl ? (
                    <Image src={c.photoUrl} alt={c.name} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-[10px] text-slate-400">
                      ไม่มีรูป
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">{c.brand}</p>
                  <p className="font-semibold text-slate-900 truncate">{c.name}</p>
                  <p className="text-sm text-blue-700 font-medium">
                    {c.pricePerDay.toLocaleString()} ฿/วัน
                  </p>
                </div>
                {needsApproval(c) && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-violet-100 text-violet-700 shrink-0">
                    ขอจอง
                  </span>
                )}
              </Link>
            ))}
            {cars.length === 0 && (
              <p className="text-center text-slate-500 py-12">ยังไม่มีรถว่างให้จอง</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const car = await prisma.car.findUnique({ where: { id: carId } });
  if (!car || car.status !== "AVAILABLE") notFound();

  const fromStr = bangkokDateStr(new Date());
  const map = await getAvailability([car.id], fromStr, 90);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-5">
      <div className="max-w-md mx-auto">
        <ServiceNote note={settings.serviceNote} className="mb-4" />
        <LiffBooking
          car={{
            id: car.id,
            brand: car.brand,
            name: car.name,
            pricePerDay: car.pricePerDay,
            photoUrl: car.photoUrl,
            isRequest: needsApproval(car),
          }}
          availability={map.get(car.id) ?? {}}
          timeOptions={times}
          liffId={liffId}
          pickupPoints={pickupPoints}
        />
      </div>
    </div>
  );
}
