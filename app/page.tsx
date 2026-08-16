export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import PublicShell from "@/components/PublicShell";
import CarCard from "@/components/CarCard";
import { getAvailability, firstFreeDate } from "@/lib/availability";
import { bangkokDateStr } from "@/lib/settings";

const FEATURES = [
  {
    title: "จองออนไลน์ 24 ชม.",
    desc: "เลือกรถ เลือกวัน แล้วยืนยันได้ทันที ไม่ต้องรอเวลาทำการ",
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
    title: "ราคาชัดเจน",
    desc: "แสดงราคาต่อวันและยอดรวมก่อนยืนยัน ไม่มีค่าใช้จ่ายแอบแฝง",
    icon: (
      <path
        d="M12 3v18M8 7.5A2.5 2.5 0 0110.5 5h3a2.5 2.5 0 010 5h-3a2.5 2.5 0 000 5h3a2.5 2.5 0 002.5-2.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "รถสะอาด พร้อมใช้",
    desc: "ตรวจเช็คสภาพและทำความสะอาดทุกคันก่อนส่งมอบ",
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
];

export default async function HomePage() {
  const cars = await prisma.car.findMany({
    where: { status: "AVAILABLE" },
    orderBy: { pricePerDay: "asc" },
    take: 6,
  });

  const totalCars = await prisma.car.count({ where: { status: "AVAILABLE" } });
  const minPrice = cars.length ? cars[0].pricePerDay : null;

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

  return (
    <PublicShell>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 via-slate-50 to-slate-50">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(60% 50% at 80% 0%, rgba(37,99,235,0.12) 0%, rgba(248,250,252,0) 100%)",
          }}
        />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="max-w-2xl animate-fade-up">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-blue-100 text-blue-700 text-xs font-medium shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              บริการเช่ารถในเชียงใหม่
            </span>

            <h1 className="mt-5 text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.15]">
              เช่ารถง่ายๆ<br />
              <span className="text-blue-600">จองออนไลน์ได้ทันที</span>
            </h1>

            <p className="mt-5 text-lg text-slate-600 leading-relaxed">
              เลือกรถที่ถูกใจ ระบุวันรับ-คืนรถ แล้วยืนยันการจองด้วยการโอนมัดจำ
              ใช้เวลาไม่ถึง 5 นาที
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/cars"
                className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-600/25 transition-colors"
              >
                ดูรถทั้งหมด
              </Link>
              <Link
                href="/how-to-book"
                className="px-6 py-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold transition-colors"
              >
                วิธีการจอง
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-8">
              <div>
                <p className="text-2xl font-bold text-slate-900">{totalCars}</p>
                <p className="text-sm text-slate-500">คันพร้อมให้เช่า</p>
              </div>
              {minPrice !== null && (
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {minPrice.toLocaleString()}฿
                  </p>
                  <p className="text-sm text-slate-500">เริ่มต้นต่อวัน</p>
                </div>
              )}
              <div>
                <p className="text-2xl font-bold text-slate-900">24 ชม.</p>
                <p className="text-sm text-slate-500">จองได้ตลอดเวลา</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* จุดเด่น */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid gap-5 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl border border-slate-200 p-6"
            >
              <span className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 grid place-items-center mb-4">
                <svg viewBox="0 0 24 24" fill="none" className="w-[22px] h-[22px]">
                  {f.icon}
                </svg>
              </span>
              <h3 className="font-semibold text-slate-900 mb-1.5">{f.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* เชื่อมต่อ LINE */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-4">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden sm:flex items-center">
          <div className="p-6 sm:p-8 flex-1">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-9 h-9 rounded-xl bg-[#06C755] text-white grid place-items-center font-bold">
                L
              </span>
              <span className="text-sm font-semibold text-slate-900">
                รับแจ้งเตือนทาง LINE
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
              ไม่ต้องคอยเปิดเว็บเช็คเอง
            </h2>
            <p className="text-slate-600 text-sm mt-2 leading-relaxed">
              เชื่อมต่อ LINE ครั้งเดียว แล้วรู้ทันทีเมื่อแอดมินตรวจสลิปเสร็จ
              พร้อมเตือนก่อนถึงวันคืนรถ และเช็คสถานะได้ในแชท
            </p>
            <Link
              href="/line/connect"
              className="inline-block mt-5 px-6 py-3 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-semibold transition-colors"
            >
              เชื่อมต่อ LINE
            </Link>
          </div>
          <div className="hidden sm:block w-px self-stretch bg-slate-100" />
          <ul className="p-6 sm:p-8 sm:w-72 text-sm text-slate-600 space-y-2.5 shrink-0">
            <li className="flex gap-2">
              <span className="text-emerald-500">✓</span> แจ้งผลตรวจสลิปทันที
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-500">✓</span> เตือนก่อนวันคืนรถ
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-500">✓</span> เช็คสถานะในแชท
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-500">✓</span> จองครั้งหน้าในแชทได้เลย
            </li>
          </ul>
        </div>
      </section>

      {/* รถแนะนำ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">รถแนะนำ</h2>
            <p className="text-slate-500 text-sm mt-1">
              คัดรถยอดนิยม ราคาคุ้มค่า พร้อมให้จองแล้ววันนี้
            </p>
          </div>
          <Link
            href="/cars"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800 shrink-0"
          >
            ดูทั้งหมด
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <path
                d="M5 12h14m0 0l-6-6m6 6l-6 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>

        {cars.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cars.map((car: CarCardData) => (
              <CarCard key={car.id} car={car} availability={availabilityFor(car.id)} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-16 text-center">
            <p className="text-slate-500">ยังไม่มีรถว่างให้จองในขณะนี้</p>
            <p className="text-sm text-slate-400 mt-1">กรุณากลับมาใหม่อีกครั้ง</p>
          </div>
        )}
      </section>
    </PublicShell>
  );
}

type CarCardData = {
  id: string;
  name: string;
  brand: string;
  pricePerDay: number;
  photoUrl: string | null;
  source: string;
  licensePlate: string;
};
