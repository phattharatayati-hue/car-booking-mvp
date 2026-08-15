import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import BookingForm from "./BookingForm";

export default async function BookCarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const car = await prisma.car.findUnique({ where: { id } });

  if (!car || car.status !== "AVAILABLE") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-6 py-10">
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-semibold mb-1">จอง {car.brand} {car.name}</h1>
        <p className="text-neutral-400 text-sm mb-6">{car.pricePerDay.toLocaleString()} บาท / วัน</p>
        <BookingForm carId={car.id} pricePerDay={car.pricePerDay} />
      </div>
    </div>
  );
}
