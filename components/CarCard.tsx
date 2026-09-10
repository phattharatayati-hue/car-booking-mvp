import Link from "next/link";
import Image from "next/image";
import { needsApproval } from "@/lib/booking-status";

type CarCardProps = {
  car: {
    id: string;
    name: string;
    brand: string;
    pricePerDay: number;
    photoUrl: string | null;
    source: string;
    licensePlate: string;
    partnerId?: string | null;
  };
  /** ว่างไหมใน "วันแรกที่จองได้" (ไม่ใช่วันนี้ — มีกฎจองล่วงหน้า ดู lib/booking-rules.ts)
      พร้อมวันว่างถัดไปถ้าวันนั้นเต็ม */
  availability?: { busyToday: boolean; nextFree: string | null; from?: string };
  /** มีรถรุ่นเดียวกันหลายคันในรายการไหม — ถ้าใช่ต้องโชว์ทะเบียนกำกับ
      ไม่งั้นลูกค้าเห็นชื่อรุ่นกับราคาเหมือนกันเป๊ะสองใบแล้วนึกว่าระบบแสดงซ้ำ */
  showPlate?: boolean;
};

export default function CarCard({ car, availability, showPlate = false }: CarCardProps) {
  const isRequest = needsApproval(car);

  /* เลี่ยงคำว่า "ว่างวันนี้" เพราะจองวันนี้ไม่ได้อยู่แล้วเมื่อมีกฎจองล่วงหน้า
     บอกวันที่ไปตรง ๆ ชัดกว่าและไม่มีทางผิด */
  /* คำต้องต่างกันด้วย ไม่ใช่ต่างแค่สีจุด
       "ว่าง 12 ก.ย."       = ว่างตั้งแต่วันแรกที่จองได้เลย (เขียว)
       "ว่างเร็วสุด 15 ก.ย." = วันแรกเต็ม ต้องรอถึงวันนั้น (เหลือง) */
  const freeLabel = !availability
    ? null
    : !availability.busyToday
    ? availability.from
      ? `ว่าง ${thaiDay(availability.from)}`
      : "ว่าง"
    : availability.nextFree
    ? `ว่างเร็วสุด ${thaiDay(availability.nextFree)}`
    : "ไม่ว่างช่วงนี้";

  return (
    <div className="group bg-white rounded-3xl border border-slate-200 overflow-hidden flex flex-col hover:shadow-lg hover:shadow-slate-200/60 hover:-translate-y-0.5 transition-all duration-200">
      <div className="relative w-full aspect-[4/3] bg-slate-100 overflow-hidden">
        {car.photoUrl ? (
          <Image
            src={car.photoUrl}
            alt={`${car.brand} ${car.name}`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        ) : (
          // ยังไม่มีรูป — โชว์ชื่อรุ่นไว้แทน กล่องเทาเปล่าๆ ทำให้ดูเหมือนเว็บพัง
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-slate-50 to-slate-100 px-4 text-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-slate-300">
              <path
                d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11m-14 0h14m-14 0a1 1 0 00-1 1v4h2m13-5a1 1 0 011 1v4h-2m0 0H7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm font-semibold text-slate-500">
              {car.brand} {car.name}
            </span>
            <span className="text-[11px] text-slate-400">ยังไม่มีรูป</span>
          </div>
        )}

        {isRequest && (
          <span className="absolute top-3 left-3 text-[11px] font-medium px-2 py-1 rounded-full bg-violet-600 text-white shadow-sm">
            ต้องรอยืนยัน
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <p className="text-xs text-slate-500 mb-0.5">{car.brand}</p>
        <h3 className="font-semibold text-slate-900 text-lg leading-snug">
          {car.name}
          {showPlate && (
            <span className="ml-2 align-middle text-xs font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              {car.licensePlate}
            </span>
          )}
        </h3>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
          {freeLabel && (
            <span
              className={`inline-flex items-center gap-1.5 font-medium ${
                availability && !availability.busyToday
                  ? "text-emerald-600"
                  : availability?.nextFree
                  ? "text-amber-600"
                  : "text-red-500"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  availability && !availability.busyToday
                    ? "bg-emerald-500"
                    : availability?.nextFree
                    ? "bg-amber-500"
                    : "bg-red-500"
                }`}
              />
              {freeLabel}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-slate-400">
              <path
                d="M9 12l2 2 4-4"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
            </svg>
            ประกันชั้น 1
          </span>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-end justify-between gap-3">
          <div>
            <span className="text-2xl font-bold text-slate-900">
              {car.pricePerDay.toLocaleString()}
            </span>
            <span className="text-sm text-slate-500"> ฿/วัน</span>
          </div>
          <Link
            href={`/cars/${car.id}/book`}
            className={`px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm transition-colors ${
              isRequest
                ? "bg-violet-600 hover:bg-violet-700 shadow-violet-600/25"
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/25"
            }`}
          >
            {isRequest ? "ขอจอง" : "จองรถ"}
          </Link>
        </div>
      </div>
    </div>
  );
}

/** "2026-09-11" → "11 ก.ย." */
function thaiDay(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  });
}
