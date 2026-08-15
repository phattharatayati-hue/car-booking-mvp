export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminDashboard() {
  const [pendingCount, confirmedCount, carsCount, totalBookings, revenueAgg, recent] =
    await Promise.all([
      prisma.booking.count({ where: { status: "PENDING_DEPOSIT" } }),
      prisma.booking.count({ where: { status: "CONFIRMED" } }),
      prisma.car.count(),
      prisma.booking.count(),
      prisma.booking.aggregate({
        _sum: { totalPrice: true },
        where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
      }),
      prisma.booking.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { car: true, customer: true },
      }),
    ]);

  const revenue = revenueAgg._sum.totalPrice ?? 0;

  const stats = [
    {
      label: "รอตรวจสลิปมัดจำ",
      value: pendingCount,
      accent: "bg-amber-50 text-amber-600",
      href: "/admin/bookings",
      icon: (
        <path
          d="M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ),
    },
    {
      label: "ยืนยันแล้ว",
      value: confirmedCount,
      accent: "bg-emerald-50 text-emerald-600",
      href: "/admin/bookings",
      icon: (
        <path
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ),
    },
    {
      label: "รถทั้งหมด",
      value: carsCount,
      accent: "bg-blue-50 text-blue-600",
      href: "/admin/cars",
      icon: (
        <path
          d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11m-14 0h14m-14 0a1 1 0 00-1 1v4h2m13-5a1 1 0 011 1v4h-2m0 0H7"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ),
    },
    {
      label: "การจองทั้งหมด",
      value: totalBookings,
      accent: "bg-violet-50 text-violet-600",
      href: "/admin/bookings",
      icon: (
        <>
          <rect x="4" y="5" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </>
      ),
    },
  ];

  const statusLabel: Record<string, { text: string; cls: string }> = {
    PENDING_DEPOSIT: { text: "รอตรวจสลิป", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    CONFIRMED: { text: "ยืนยันแล้ว", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    CANCELLED: { text: "ยกเลิก", cls: "bg-red-50 text-red-700 border-red-200" },
    COMPLETED: { text: "เสร็จสิ้น", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  };

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900">แดชบอร์ด</h1>
        <p className="text-slate-500 text-sm mt-1">ภาพรวมระบบจองรถ</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <span className={`w-10 h-10 rounded-xl grid place-items-center mb-3 ${s.accent}`}>
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                {s.icon}
              </svg>
            </span>
            <p className="text-3xl font-bold text-slate-900">{s.value}</p>
            <p className="text-sm text-slate-500 mt-0.5">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 mb-6 text-white">
        <p className="text-blue-100 text-sm">รายได้จากการจองที่ยืนยันแล้ว</p>
        <p className="text-4xl font-bold mt-1.5">{revenue.toLocaleString()} ฿</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">การจองล่าสุด</h2>
          <Link
            href="/admin/bookings"
            className="text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            ดูทั้งหมด
          </Link>
        </div>

        {recent.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {recent.map((b: RecentBooking) => {
              const st = statusLabel[b.status] ?? statusLabel.PENDING_DEPOSIT;
              return (
                <li key={b.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 truncate">
                      {b.car.brand} {b.car.name}
                    </p>
                    <p className="text-sm text-slate-500 truncate">
                      {b.customer.fullName} · {b.customer.phone}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-slate-900">
                      {b.totalPrice.toLocaleString()} ฿
                    </p>
                    <span
                      className={`inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${st.cls}`}
                    >
                      {st.text}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="py-14 text-center text-slate-500 text-sm">ยังไม่มีรายการจอง</div>
        )}
      </div>
    </div>
  );
}

type RecentBooking = {
  id: string;
  status: string;
  totalPrice: number;
  car: { brand: string; name: string };
  customer: { fullName: string; phone: string };
};
