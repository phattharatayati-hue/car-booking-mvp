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

type CarLite = { id: string; brand: string; name: string; licensePlate: string };

const DAYS = 30;
const DAY_MS = 86400000;

/** สร้างรายการวันเริ่มจากวันนี้ — แยกออกนอก component เพราะอ่านเวลาปัจจุบัน */
function buildDays() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: DAYS }, (_, i) => new Date(start.getTime() + i * DAY_MS));
}

export default async function CalendarPage() {
  await requireStaff();

  const days = buildDays();
  const rangeStart = days[0];
  const rangeEnd = new Date(days[days.length - 1].getTime() + DAY_MS);

  const [cars, bookings] = await Promise.all([
    prisma.car.findMany({ orderBy: [{ brand: "asc" }, { name: "asc" }] }),
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
          30 วันข้างหน้า · เขียว = ยืนยันแล้ว · เหลือง = รอตรวจสลิป
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
                    return (
                      <th
                        key={i}
                        className={`px-0 py-2 font-medium w-9 min-w-[36px] text-center ${
                          isWeekend ? "bg-slate-100 text-slate-500" : "text-slate-500"
                        }`}
                      >
                        <span className="block text-[10px] leading-tight">
                          {d.toLocaleDateString("th-TH", { weekday: "narrow" })}
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
                      return (
                        <td key={i} className="p-0.5 align-middle">
                          <div
                            title={
                              booking
                                ? `${booking.customer.fullName} · ${
                                    confirmed ? "ยืนยันแล้ว" : "รอตรวจสลิป"
                                  }\nรับ ${formatBangkokDateTime(
                                    booking.startDate
                                  )}\nคืน ${formatBangkokDateTime(booking.endDate)}`
                                : "ว่าง"
                            }
                            className={`h-8 rounded ${
                              booking
                                ? confirmed
                                  ? "bg-emerald-500"
                                  : "bg-amber-400"
                                : "bg-slate-100"
                            }`}
                          />
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
