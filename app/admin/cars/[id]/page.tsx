export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import EditCarForm from "@/components/EditCarForm";

export default async function EditCarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const car = await prisma.car.findUnique({ where: { id } });
  if (!car) notFound();

  const [bookingCount, partners] = await Promise.all([
    prisma.booking.count({ where: { carId: id } }),
    prisma.partner.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="max-w-3xl">
      <nav className="text-sm text-slate-500 mb-4">
        <Link href="/admin/cars" className="hover:text-blue-700">จัดการรถ</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">แก้ไข</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {car.brand} {car.name}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          ทะเบียน {car.licensePlate} · ราคาปกติ {car.pricePerDay.toLocaleString()} บาท/วัน · มีการจอง{" "}
          {bookingCount} รายการ
        </p>
        <Link
          href={`/admin/cars/${car.id}/rates`}
          className="inline-flex items-center gap-2 mt-3 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          📅 ราคาตามช่วงวัน และช่วงปิดรับจอง
        </Link>
      </div>

      <EditCarForm
        car={{
          id: car.id,
          name: car.name,
          brand: car.brand,
          licensePlate: car.licensePlate,
          pricePerDay: car.pricePerDay,
          photoUrl: car.photoUrl,
          source: car.source,
          status: car.status,
          costPerDay: car.costPerDay,
          partnerId: car.partnerId,
          bookingCount,
        }}
        partners={partners}
      />
    </div>
  );
}
