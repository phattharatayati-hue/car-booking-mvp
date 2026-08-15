export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";

export default async function HomePage() {
  const cars = await prisma.car.findMany({
    where: { status: "AVAILABLE" },
    orderBy: { pricePerDay: "asc" },
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-800 px-6 py-5">
        <h1 className="text-lg font-semibold">จองรถเช่า</h1>
        <p className="text-sm text-neutral-400">เลือกรถที่ต้องการแล้วจองออนไลน์ได้เลย</p>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cars.map((car) => (
            <div key={car.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col">
              <div className="relative w-full h-40 bg-neutral-800">
                {car.photoUrl ? (
                  <Image src={car.photoUrl} alt={car.name} fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-600 text-sm">
                    ไม่มีรูป
                  </div>
                )}
              </div>
              <div className="p-4 flex flex-col gap-2 flex-1">
                <p className="font-medium">{car.brand} {car.name}</p>
                <p className="text-sm text-neutral-400">{car.pricePerDay.toLocaleString()} บาท / วัน</p>
                <Link
                  href={`/cars/${car.id}/book`}
                  className="mt-auto bg-blue-600 hover:bg-blue-500 text-center text-sm font-medium rounded-md py-2"
                >
                  จองรถคันนี้
                </Link>
              </div>
            </div>
          ))}
        </div>

        {cars.length === 0 && (
          <p className="text-center text-neutral-500 py-16">ยังไม่มีรถว่างให้จองในขณะนี้</p>
        )}
      </main>
    </div>
  );
}
