import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  const [pendingCount, confirmedCount, carsCount, totalBookings] = await Promise.all([
    prisma.booking.count({ where: { status: "PENDING_DEPOSIT" } }),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.car.count(),
    prisma.booking.count(),
  ]);

  const stats = [
    { label: "รอตรวจสลิปมัดจำ", value: pendingCount },
    { label: "ยืนยันแล้ว", value: confirmedCount },
    { label: "รถทั้งหมด", value: carsCount },
    { label: "การจองทั้งหมด", value: totalBookings },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">แดชบอร์ด</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <p className="text-sm text-neutral-400 mb-1">{s.label}</p>
            <p className="text-3xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
