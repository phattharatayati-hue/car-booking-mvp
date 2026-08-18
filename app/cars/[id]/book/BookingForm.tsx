"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AvailabilityCalendar, { DayStatus } from "@/components/AvailabilityCalendar";
import { OTHER_PLACE, pointLabel, type PickupOption } from "@/lib/pickup-points";

const inputClass =
  "w-full rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-colors";
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

export default function BookingForm({
  carId,
  pricePerDay,
  timeOptions,
  isRequest = false,
  availability,
  pickupPoints,
}: {
  carId: string;
  pricePerDay: number;
  timeOptions: string[];
  isRequest?: boolean;
  availability: Record<string, DayStatus>;
  pickupPoints: PickupOption[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState(timeOptions[0] ?? "10:00");
  const [endTime, setEndTime] = useState(timeOptions[0] ?? "10:00");

  const days =
    startDate && endDate
      ? Math.max(
          1,
          Math.ceil(
            (new Date(`${endDate}T${endTime}`).getTime() -
              new Date(`${startDate}T${startTime}`).getTime()) /
              86400000
          )
        )
      : 0;
  const total = days * pricePerDay;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!startDate || !endDate) {
      setError("กรุณาเลือกวันรับและวันคืนรถบนปฏิทิน");
      setSubmitting(false);
      return;
    }

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId,
          startDate: formData.get("startDate"),
          endDate: formData.get("endDate"),
          startTime: formData.get("startTime"),
          endTime: formData.get("endTime"),
          fullName: formData.get("fullName"),
          phone: formData.get("phone"),
          email: formData.get("email"),
          pickupPlace: formData.get("pickupPlace"),
          returnPlace: formData.get("returnPlace"),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.bookingId) {
        setError(data?.error ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
        setSubmitting(false);
        return;
      }

      router.push(`/booking/${data.bookingId}`);
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <div className="flex gap-3 text-sm bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 shrink-0 text-red-500">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
            <path d="M12 8v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1" fill="currentColor" />
          </svg>
          {error}
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">ช่วงเวลาเช่า</h2>
        <AvailabilityCalendar
          availability={availability}
          startDate={startDate}
          endDate={endDate}
          onSelect={(s, e) => {
            setStartDate(s);
            setEndDate(e);
          }}
        />

        <input type="hidden" name="startDate" value={startDate} />
        <input type="hidden" name="endDate" value={endDate} />

        <p className="mt-3 text-sm text-slate-500">
          {!startDate
            ? "กดเลือกวันรับรถบนปฏิทิน"
            : !endDate
            ? "กดเลือกวันคืนรถอีกครั้ง"
            : `เลือกแล้ว ${startDate} ถึง ${endDate}`}
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={labelClass} htmlFor="startTime">เวลารับรถ</label>
            <select
              id="startTime"
              name="startTime"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={inputClass}
            >
              {timeOptions.map((t) => (
                <option key={t} value={t}>{t} น.</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="endTime">เวลาคืนรถ</label>
            <select
              id="endTime"
              name="endTime"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={inputClass}
            >
              {timeOptions.map((t) => (
                <option key={t} value={t}>{t} น.</option>
              ))}
            </select>
          </div>
        </div>

        {pickupPoints.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className={labelClass} htmlFor="pickupPlace">จุดรับรถ</label>
              <select id="pickupPlace" name="pickupPlace" className={inputClass}>
                {pickupPoints.map((p) => (
                  <option key={p.id} value={p.name}>{pointLabel(p)}</option>
                ))}
                <option value={OTHER_PLACE}>{OTHER_PLACE}</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="returnPlace">จุดคืนรถ</label>
              <select id="returnPlace" name="returnPlace" className={inputClass}>
                {pickupPoints.map((p) => (
                  <option key={p.id} value={p.name}>{pointLabel(p)}</option>
                ))}
                <option value={OTHER_PLACE}>{OTHER_PLACE}</option>
              </select>
            </div>
            <p className="sm:col-span-2 text-xs text-slate-500 -mt-1">
              ถ้าต้องการจุดอื่นนอกรายการ เลือก “{OTHER_PLACE}” แล้วแอดมินจะติดต่อกลับไปนัดจุดรับ-ส่งครับ
            </p>
          </div>
        )}

        {days > 0 && (
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              {days} วัน × {pricePerDay.toLocaleString()} ฿
              <span className="block text-xs text-slate-500 mt-0.5">
                รับ {startTime} น. · คืน {endTime} น.
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">ยอดรวม</p>
              <p className="text-xl font-bold text-slate-900">
                {total.toLocaleString()} ฿
              </p>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">ข้อมูลผู้เช่า</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelClass} htmlFor="fullName">ชื่อ-นามสกุล</label>
            <input
              id="fullName"
              name="fullName"
              required
              placeholder="เช่น สมชาย ใจดี"
              className={inputClass}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="phone">เบอร์โทร</label>
              <input
                id="phone"
                name="phone"
                required
                inputMode="tel"
                placeholder="08X-XXX-XXXX"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="email">
                อีเมล <span className="text-slate-400 font-normal">(ถ้ามี)</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </section>

      <button
        type="submit"
        disabled={submitting}
        className={`w-full rounded-xl disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 shadow-lg transition-colors ${
          isRequest
            ? "bg-violet-600 hover:bg-violet-700 shadow-violet-600/25"
            : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/25"
        }`}
      >
        {submitting ? "กำลังบันทึก..." : isRequest ? "ส่งคำขอจอง" : "ยืนยันการจอง"}
      </button>

      <p className="text-xs text-slate-500 text-center -mt-2">
        การกดยืนยันถือว่าคุณยอมรับเงื่อนไขการเช่ารถของเรา
      </p>
    </form>
  );
}
