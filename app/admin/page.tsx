export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/roles";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { bangkokDayRange, bangkokDateStr, formatBangkokTime } from "@/lib/settings";
import { HANDOFF_LABEL, type HandoffKind } from "@/lib/assignments";
import {
  ACTIVE_BOOKING_STATUSES,
  STATUS_LABEL,
  STATUS_CLASS,
} from "@/lib/booking-status";

export default async function AdminDashboard() {
  await requireStaff();

  const [
    pendingCount,
    confirmedCount,
    carsCount,
    totalBookings,
    revenueAgg,
    depositAgg,
    recent,
  ] =
    await Promise.all([
      prisma.booking.count({ where: { status: "PENDING_DEPOSIT" } }),
      prisma.booking.count({ where: { status: "CONFIRMED" } }),
      prisma.car.count(),
      prisma.booking.count(),
      prisma.booking.aggregate({
        _sum: { totalPrice: true },
        where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
      }),
      /* ค่าจองที่รับเข้ามาแล้วจริง — นับจากสลิปที่แอดมินยืนยัน ไม่ใช่จากยอดจอง
         ค่าเช่าจ่ายตอนรับรถ จึงยังไม่ใช่เงินในมือ ณ ตอนนี้ */
      prisma.deposit.aggregate({
        _sum: { amount: true },
        where: { status: "CONFIRMED" },
      }),
      prisma.booking.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { car: true, customer: true },
      }),
    ]);

  /* แยกสองตัวเลขให้ชัด ไม่งั้นคนอ่านจะเข้าใจว่ายอดจองคือเงินที่ได้แล้ว
     ซึ่งต่างกันเป็นสิบเท่า เพราะค่าเช่าเก็บตอนรับรถ */
  const bookingValue = revenueAgg._sum.totalPrice ?? 0;
  const depositReceived = depositAgg._sum.amount ?? 0;

  // งานรับ-ส่งรถของฉันวันนี้ + งานที่ยังไม่มีคนรับ
  const session = await auth();
  const today = bangkokDayRange(bangkokDateStr(new Date()));

  const me = session?.user?.email
    ? await prisma.adminUser.findUnique({ where: { email: session.user.email } })
    : null;

  const myJobs = me
    ? await prisma.bookingAssignment.findMany({
        where: { adminUserId: me.id, meetAt: { gte: today.start, lt: today.end } },
        orderBy: { meetAt: "asc" },
        include: { booking: { include: { car: true, customer: true } } },
      })
    : [];

  // งานที่ยังไม่มีคนรับ — นับจากการจองที่ยังใช้งานอยู่ ในอีก 7 วันข้างหน้า
  const soon = new Date(Date.now() + 7 * 86400000);
  const upcoming = await prisma.booking.findMany({
    where: {
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
      OR: [
        { startDate: { gte: today.start, lt: soon } },
        { endDate: { gte: today.start, lt: soon } },
      ],
    },
    include: { assignments: true },
  });

  let unassignedCount = 0;
  for (const b of upcoming) {
    if (b.startDate >= today.start && b.startDate < soon) {
      if (!b.assignments.some((a) => a.kind === "DELIVERY")) unassignedCount++;
    }
    if (b.endDate >= today.start && b.endDate < soon) {
      if (!b.assignments.some((a) => a.kind === "PICKUP")) unassignedCount++;
    }
  }

  const stats = [
    {
      label: "รอตรวจเอกสาร",
      value: pendingCount,
      accent: "bg-amber-50 text-amber-700",
      href: "/admin/bookings?status=review",
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
      accent: "bg-emerald-50 text-emerald-700",
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
      accent: "bg-blue-50 text-blue-700",
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
      accent: "bg-violet-50 text-violet-700",
      href: "/admin/bookings",
      icon: (
        <>
          <rect x="4" y="5" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </>
      ),
    },
    {
      label: "งานรับ-ส่งของฉันวันนี้",
      value: myJobs.length,
      accent: "bg-blue-50 text-blue-700",
      href: "/admin/schedule",
      icon: (
        <>
          <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M5 20a7 7 0 0114 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </>
      ),
    },
    {
      // ระบุช่วงเวลาบนป้ายเลย ไม่งั้นดูขัดกับตัวเลขในหน้าตารางที่นับทั้งเดือน
      label: "ยังไม่มีคนรับ (7 วันข้างหน้า)",
      value: unassignedCount,
      accent: unassignedCount > 0 ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-400",
      href: "/admin/bookings?status=unassigned",
      icon: (
        <>
          <path
            d="M12 9v4M12 17h.01M10.3 3.9L2.4 18a1.8 1.8 0 001.6 2.7h16a1.8 1.8 0 001.6-2.7L13.7 3.9a1.8 1.8 0 00-3.4 0z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ),
    },
  ];


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

      {/* การ์ดเงิน — พื้นเขียวเข้มตลอดทั้งสองโหมด จึงใช้สีชุดที่ไม่สลับ */}
      <div className="bg-panel rounded-2xl p-6 mb-6 text-white">
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <p className="text-white/75 text-sm">ค่าจองที่รับแล้ว</p>
            <p className="text-4xl font-bold mt-1.5">
              {depositReceived.toLocaleString()} ฿
            </p>
            <p className="text-white/60 text-xs mt-1.5 leading-relaxed">
              เงินที่เข้ามาแล้วจริง จากสลิปค่าจองที่ยืนยัน
            </p>
          </div>
          <div className="sm:border-l sm:border-white/15 sm:pl-6">
            <p className="text-white/75 text-sm">มูลค่าการจอง</p>
            <p className="text-4xl font-bold mt-1.5 text-gold-fixed">
              {bookingValue.toLocaleString()} ฿
            </p>
            <p className="text-white/60 text-xs mt-1.5 leading-relaxed">
              ยอดรวมของการจองที่ยืนยันและเสร็จสิ้น — ส่วนค่าเช่าเก็บตอนลูกค้ารับรถ
            </p>
          </div>
        </div>
      </div>

      {myJobs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">งานรับ-ส่งรถของฉันวันนี้</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {myJobs.map((j) => (
              <div key={j.id} className="px-5 py-3.5 flex items-center gap-4">
                <span className="font-mono text-sm text-slate-900 tabular-nums shrink-0">
                  {formatBangkokTime(j.meetAt)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-900">
                    {HANDOFF_LABEL[j.kind as HandoffKind]} · {j.booking.car.brand}{" "}
                    {j.booking.car.name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {j.booking.customer.fullName} · {j.booking.customer.phone}
                    {j.place ? ` · ${j.place}` : ""}
                  </p>
                </div>
                <Link
                  href="/admin/bookings"
                  className="text-xs text-blue-700 hover:underline shrink-0"
                >
                  ดูการจอง
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

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
              // ใช้ป้ายสถานะกลางจาก lib/booking-status
              // เดิมหน้านี้เขียนตารางเองแล้วขาด REQUESTED กับ REJECTED
              // การจองที่ "รอเช็คกับเจ้าของรถ" จึงแสดงว่า "รอตรวจสลิป" ผิดข้อเท็จจริง
              const stText = STATUS_LABEL[b.status] ?? b.status;
              const stCls = STATUS_CLASS[b.status] ?? STATUS_CLASS.COMPLETED;
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
                      className={`inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${stCls}`}
                    >
                      {stText}
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
