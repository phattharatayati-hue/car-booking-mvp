"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AvailabilityCalendar, { DayStatus } from "@/components/AvailabilityCalendar";
import { OTHER_PLACE, pointLabel, type PickupOption } from "@/lib/pickup-points";
import {
  feeForTime,
  rateRangeLabel,
  type AfterHoursRate,
} from "@/lib/pricing";
import {
  rentSegments,
  blockingRates,
  formatRateRange,
  type CarRateView,
} from "@/lib/car-rates";
import {
  timeChoicesFor,
  firstFreeTime,
  rangeBusy,
  isTimeBusy,
  type BusySpan,
} from "@/lib/day-slots";

const inputClass =
  "w-full rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-colors";
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

export default function BookingForm({
  carId,
  pricePerDay,
  timeOptions,
  afterHoursRates,
  busySpans = [],
  carRates = [],
  isRequest = false,
  availability,
  pickupPoints,
}: {
  carId: string;
  pricePerDay: number;
  timeOptions: string[];
  afterHoursRates: AfterHoursRate[];
  busySpans?: BusySpan[];
  carRates?: CarRateView[];
  isRequest?: boolean;
  availability: Record<string, DayStatus>;
  pickupPoints: PickupOption[];
}) {
  const router = useRouter();
  /** วันนี้ตามเวลาไทย — ใช้กันไม่ให้เลือกวันย้อนหลัง */
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(
    new Date()
  );
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
  // ตัวเลือกเวลา — ปิดเวลาที่รถยังอยู่กับลูกค้าอื่น
  const startChoices = timeChoicesFor(startDate, timeOptions, busySpans);
  const endChoices = timeChoicesFor(endDate, timeOptions, busySpans);
  const overlaps = rangeBusy(startDate, startTime, endDate, endTime, busySpans);

  // ถ้าเวลาที่เลือกอยู่กลายเป็นเวลาที่ชน ให้เลื่อนไปเวลาว่างแรกของวันนั้นให้เลย
  useEffect(() => {
    if (!startDate) return;
    if (startChoices.find((c) => c.time === startTime)?.busy) {
      const next = firstFreeTime(startDate, timeOptions, busySpans);
      if (next) setStartTime(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate]);

  useEffect(() => {
    if (!endDate) return;
    if (endChoices.find((c) => c.time === endTime)?.busy) {
      const next = firstFreeTime(endDate, timeOptions, busySpans);
      if (next) setEndTime(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endDate]);

  /** เช่าวันเดียว — เวลาคืนต้องหลังเวลารับ */
  const sameDay = Boolean(startDate && endDate && startDate === endDate);
  const sameDayInvalid = sameDay && endTime <= startTime;

  // เลือกวันเดียวกันแล้วเวลาคืนยังไม่หลังเวลารับ — เลื่อนให้อัตโนมัติ
  useEffect(() => {
    if (!sameDay) return;
    if (endTime > startTime) return;
    const next = timeOptions.find((t) => t > startTime && !isTimeBusy(endDate, t, busySpans));
    if (next) setEndTime(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sameDay, startTime, endDate]);

  const pickupFee = feeForTime(startTime, afterHoursRates);
  const returnFee = feeForTime(endTime, afterHoursRates);
  const afterHoursTotal = pickupFee.fee + returnFee.fee;

  // ค่าเช่าคิดรายวันตามช่วงราคาของรถคันนี้ แล้วยุบวันที่ราคาเท่ากันเข้าด้วยกัน
  const segments =
    days > 0 && startDate
      ? rentSegments(new Date(`${startDate}T${startTime}:00+07:00`), days, pricePerDay, carRates)
      : [];
  const rentTotal = segments.reduce((sum, seg) => sum + seg.total, 0);
  const total = rentTotal + afterHoursTotal;

  // ช่วงที่แอดมินปิดรับจอง
  const blocked = blockingRates(startDate, endDate, carRates);

  /** ป้ายค่าธรรมเนียมข้างช่องเลือกเวลา */
  function feeHint(f: ReturnType<typeof feeForTime>) {
    if (!f.rate || f.fee <= 0) return "ไม่มีค่าบริการเพิ่ม";
    return `${f.rate.label} (${rateRangeLabel(f.rate)}) +${f.fee.toLocaleString()} บาท`;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!startDate || !endDate) {
      setError("กรุณาเลือกวันรับและวันคืนรถบนปฏิทิน");
      setSubmitting(false);
      return;
    }

    if (startDate === endDate && endTime <= startTime) {
      setError("เช่าวันเดียว เวลาคืนรถต้องหลังเวลารับรถ กรุณาเลือกเวลาคืนใหม่");
      setSubmitting(false);
      return;
    }

    if (rangeBusy(startDate, startTime, endDate, endTime, busySpans)) {
      setError("ช่วงเวลาที่เลือกคาบกับการจองของลูกค้าอื่น กรุณาเลือกใหม่");
      setSubmitting(false);
      return;
    }

    const nowBlocked = blockingRates(startDate, endDate, carRates);
    if (nowBlocked.length > 0) {
      setError(
        `รถคันนี้ปิดรับจองช่วง ${formatRateRange(nowBlocked[0])} (${nowBlocked[0].label}) กรุณาเลือกวันอื่น`
      );
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
          busySpans={busySpans}
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

        {/* เลือกวันจากปฏิทินด้านบน หรือกรอกตรงนี้ก็ได้ — เช่าวันเดียวใส่วันเดียวกันได้เลย */}
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={labelClass} htmlFor="startDateInput">วันรับรถ</label>
            <input
              id="startDateInput"
              type="date"
              value={startDate}
              min={todayStr}
              onChange={(e) => {
                const v = e.target.value;
                setStartDate(v);
                if (endDate && endDate < v) setEndDate("");
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="endDateInput">วันคืนรถ</label>
            <input
              id="endDateInput"
              type="date"
              value={endDate}
              min={startDate || todayStr}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClass}
            />
            <p className="text-xs mt-1.5 text-slate-500">
              เช่าวันเดียว ใส่วันเดียวกับวันรับรถได้เลย
            </p>
          </div>
        </div>

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
              {startChoices.map((c) => (
                <option key={c.time} value={c.time} disabled={c.busy}>
                  {c.time} น.{c.busy ? " — รถไม่ว่าง" : ""}
                </option>
              ))}
            </select>
            <p className={`text-xs mt-1.5 ${pickupFee.fee > 0 ? "text-amber-700" : "text-slate-500"}`}>
              {feeHint(pickupFee)}
            </p>
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
              {endChoices.map((c) => (
                <option key={c.time} value={c.time} disabled={c.busy}>
                  {c.time} น.{c.busy ? " — รถไม่ว่าง" : ""}
                </option>
              ))}
            </select>
            <p className={`text-xs mt-1.5 ${returnFee.fee > 0 ? "text-amber-700" : "text-slate-500"}`}>
              {feeHint(returnFee)}
            </p>
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

        {overlaps && (
          <div className="mt-4 text-sm bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3">
            ช่วงเวลาที่เลือกคาบกับการจองของลูกค้าอื่น กรุณาเลือกวันหรือเวลาใหม่
          </div>
        )}

        {sameDayInvalid && (
          <div className="mt-4 text-sm bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3">
            เช่าวันเดียว เวลาคืนรถต้องหลังเวลารับรถ — เลือกเวลาคืนให้ช้ากว่า {startTime} น.
          </div>
        )}

        {blocked.length > 0 && (
          <div className="mt-4 text-sm bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3">
            รถคันนี้ปิดรับจองช่วง {formatRateRange(blocked[0])} ({blocked[0].label}) กรุณาเลือกวันอื่น
          </div>
        )}

        {days > 0 && (
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              {segments.length > 1 ? (
                segments.map((seg) => (
                  <span key={seg.from} className="block">
                    {formatRateRange({ startDate: seg.from, endDate: seg.to })} ·{" "}
                    {seg.days} วัน × {seg.pricePerDay.toLocaleString()} ฿
                    {seg.label ? (
                      <span className="text-amber-700"> ({seg.label})</span>
                    ) : null}
                  </span>
                ))
              ) : (
                <>
                  {days} วัน × {(segments[0]?.pricePerDay ?? pricePerDay).toLocaleString()} ฿
                  {segments[0]?.label ? (
                    <span className="text-amber-700"> ({segments[0].label})</span>
                  ) : null}
                </>
              )}
              <span className="block text-xs text-slate-500 mt-0.5">
                รับ {startTime} น. · คืน {endTime} น.
              </span>
              {pickupFee.fee > 0 && (
                <span className="block text-xs text-amber-700 mt-0.5">
                  + รับรถนอกเวลา {pickupFee.fee.toLocaleString()} ฿
                </span>
              )}
              {returnFee.fee > 0 && (
                <span className="block text-xs text-amber-700 mt-0.5">
                  + คืนรถนอกเวลา {returnFee.fee.toLocaleString()} ฿
                </span>
              )}
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
