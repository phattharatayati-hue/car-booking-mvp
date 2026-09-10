export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/roles";
import Link from "next/link";
import { formatBangkokDateTime } from "@/lib/settings";

type BookingLite = {
  id: string;
  carId: string;
  status: string;
  startDate: Date;
  endDate: Date;
  customer: { fullName: string };
};

type CarLite = {
  id: string;
  brand: string;
  name: string;
  licensePlate: string;
  status: string;
};

const TH_MONTH = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

const DAYS = 30;
const DAY_MS = 86400000;

/** สร้างรายการวันเริ่มจากวันนี้ — แยกออกนอก component เพราะอ่านเวลาปัจจุบัน */
function buildDays() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: DAYS }, (_, i) => new Date(start.getTime() + i * DAY_MS));
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ cars?: string }>;
}) {
  await requireStaff();

  /* ค่าเริ่มต้นแสดงเฉพาะรถที่เปิดให้เช่า — รถที่ปิดใช้งานจองไม่ได้อยู่แล้ว
     แถวว่างเปล่าของมันกินพื้นที่ไปครึ่งจอโดยไม่ให้ข้อมูลอะไร */
  const { cars: carFilter } = await searchParams;
  const showAllCars = carFilter === "all";

  const days = buildDays();
  const rangeStart = days[0];
  const rangeEnd = new Date(days[days.length - 1].getTime() + DAY_MS);

  const hiddenCount = showAllCars
    ? 0
    : await prisma.car.count({ where: { status: { not: "AVAILABLE" } } });

  const [cars, bookings] = await Promise.all([
    prisma.car.findMany({
      where: showAllCars ? {} : { status: "AVAILABLE" },
      orderBy: [{ brand: "asc" }, { name: "asc" }],
    }),
    prisma.booking.findMany({
      where: {
        status: { in: ["PENDING_DEPOSIT", "CONFIRMED"] },
        startDate: { lt: rangeEnd },
        endDate: { gt: rangeStart },
      },
      include: { customer: true },
    }),
  ]);

  const byCar = new Map<string, BookingLite[]>();
  for (const b of bookings as BookingLite[]) {
    const list = byCar.get(b.carId) ?? [];
    list.push(b);
    byCar.set(b.carId, list);
  }

  function bookingOn(carId: string, day: Date) {
    const list = byCar.get(carId);
    if (!list) return null;
    const dayEnd = new Date(day.getTime() + DAY_MS);
    return (
      list.find(
        (b) => new Date(b.startDate) < dayEnd && new Date(b.endDate) > day
      ) ?? null
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">ปฏิทินการจอง</h1>
        <p className="text-slate-500 text-sm mt-1">
          รถคันไหนว่างวันไหน · 30 วันข้างหน้า · กดช่องสีเพื่อเปิดใบจองนั้น
          {!showAllCars && hiddenCount > 0 && (
            <>
              {" · "}
              <Link href="/admin/calendar?cars=all" className="text-blue-700 hover:underline">
                ซ่อนรถที่ปิดใช้งานอยู่ {hiddenCount} คัน — กดเพื่อแสดง
              </Link>
            </>
          )}
          {showAllCars && (
            <>
              {" · "}
              <Link href="/admin/calendar" className="text-blue-700 hover:underline">
                แสดงเฉพาะรถที่เปิดให้เช่า
              </Link>
            </>
          )}
        </p>
      </div>

      {cars.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-16 text-center text-slate-500">
          ยังไม่มีรถในระบบ
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="sticky left-0 z-10 bg-slate-50 text-left font-medium text-slate-500 px-4 py-3 min-w-[190px] border-r border-slate-200">
                    รถ
                  </th>
                  {days.map((d, i) => {
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    /* วันแรกของเดือนใหม่ — เดิมเลขไล่ 29 30 1 2 โดยไม่มีอะไรบอกว่าข้ามเดือนแล้ว */
                    const newMonth = i > 0 && d.getDate() === 1;
                    return (
                      <th
                        key={i}
                        className={`px-0 py-2 font-medium w-9 min-w-[36px] text-center ${
                          newMonth ? "border-l-2 border-slate-300 " : ""
                        }${isWeekend ? "bg-slate-100 text-slate-500" : "text-slate-500"}`}
                      >
                        <span className="block text-[10px] leading-tight">
                          {newMonth
                            ? TH_MONTH[d.getMonth()]
                            : d.toLocaleDateString("th-TH", { weekday: "narrow" })}
                        </span>
                        <span className="block text-xs font-semibold text-slate-700">
                          {d.getDate()}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {cars.map((car: CarLite) => (
                  <tr key={car.id} className="border-b border-slate-100 last:border-0">
                    <td className="sticky left-0 z-10 bg-white px-4 py-2.5 border-r border-slate-200">
                      <Link
                        href={`/admin/cars/${car.id}`}
                        className="font-medium text-slate-900 hover:text-blue-700 block truncate"
                      >
                        {car.brand} {car.name}
                      </Link>
                      <span className="text-xs text-slate-500">{car.licensePlate}</span>
                    </td>
                    {days.map((day, i) => {
                      const booking = bookingOn(car.id, day);
                      const confirmed = booking?.status === "CONFIRMED";
                      const newMonth = i > 0 && day.getDate() === 1;
                      const cellClass = `h-8 rounded block ${
                        booking
                          ? confirmed
                            ? "bg-emerald-500 hover:bg-emerald-600"
                            : "bg-amber-400 hover:bg-amber-500"
                          : "bg-slate-100"
                      }`;
                      const tip = booking
                        ? `${booking.customer.fullName} · ${
                            confirmed ? "ยืนยันแล้ว" : "รอตรวจสลิป"
                          }\nรับ ${formatBangkokDateTime(
                            booking.startDate
                          )}\nคืน ${formatBangkokDateTime(
                            booking.endDate
                          )}\nกดเพื่อเปิดใบจอง`
                        : "ว่าง";
                      return (
                        <td
                          key={i}
                          className={`p-0.5 align-middle ${
                            newMonth ? "border-l-2 border-slate-300" : ""
                          }`}
                        >
                          {/* กดช่องสีแล้วเปิดใบจองนั้นได้เลย — เดิมเห็นว่าติดแต่ไม่รู้ว่าใครจอง
                              ต้องจำวันแล้วไปไล่หาเองในหน้ารายการจอง */}
                          {booking ? (
                            <Link
                              href={`/admin/bookings?q=${booking.id.slice(0, 8)}`}
                              title={tip}
                              aria-label={tip}
                              className={`${cellClass} transition-colors`}
                            />
                          ) : (
                            <div title={tip} className={cellClass} />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-5 mt-5 text-sm text-slate-600">
        <span className="inline-flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-emerald-500" /> ยืนยันแล้ว
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-amber-400" /> รอตรวจสลิป
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-slate-100 border border-slate-200" /> ว่าง
        </span>
      </div>
    </div>
  );
}
