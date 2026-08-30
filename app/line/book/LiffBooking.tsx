"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import AvailabilityCalendar, { DayStatus } from "@/components/AvailabilityCalendar";
import { OTHER_PLACE, pointLabel, type PickupOption } from "@/lib/pickup-points";
import { feeForTime, rateRangeLabel, type AfterHoursRate } from "@/lib/pricing";
import {
  timeChoicesFor,
  firstFreeTime,
  rangeBusy,
  isTimeBusy,
  type BusySpan,
} from "@/lib/day-slots";
import { BANK_ACCOUNT } from "@/lib/contact";

import type { Liff } from "@/lib/liff-types";

const SDK_URL = "https://static.line-scdn.net/liff/edge/2/sdk.js";
const LOGIN_ATTEMPT_KEY = "liff_booking_login_attempt";

function loadSdk(): Promise<Liff> {
  return new Promise((resolve, reject) => {
    if (window.liff) return resolve(window.liff);
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    const done = () =>
      window.liff ? resolve(window.liff) : reject(new Error("โหลด LIFF ไม่สำเร็จ"));
    if (existing) {
      existing.addEventListener("load", done);
      existing.addEventListener("error", () => reject(new Error("โหลด LIFF ไม่สำเร็จ")));
      return;
    }
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = done;
    script.onerror = () => reject(new Error("โหลด LIFF ไม่สำเร็จ"));
    document.head.appendChild(script);
  });
}

export type LiffCar = {
  id: string;
  brand: string;
  name: string;
  pricePerDay: number;
  photoUrl: string | null;
  isRequest: boolean;
};

type Result = {
  bookingId: string;
  isRequest: boolean;
  totalPrice: number;
  deposit: number;
};

export default function LiffBooking({
  car,
  availability,
  timeOptions,
  afterHoursRates,
  busySpans = [],
  liffId,
  pickupPoints,
}: {
  car: LiffCar;
  availability: Record<string, DayStatus>;
  timeOptions: string[];
  afterHoursRates: AfterHoursRate[];
  busySpans?: BusySpan[];
  liffId: string;
  pickupPoints: PickupOption[];
}) {
  const [ready, setReady] = useState(false);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState(timeOptions[0] ?? "10:00");
  const [endTime, setEndTime] = useState(timeOptions[0] ?? "10:00");
  const [phone, setPhone] = useState("");
  const [pickupPlace, setPickupPlace] = useState(pickupPoints[0]?.name ?? OTHER_PLACE);
  const [returnPlace, setReturnPlace] = useState(pickupPoints[0]?.name ?? OTHER_PLACE);
  const [needPhone, setNeedPhone] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!liffId) {
        setInitError("ระบบยังไม่ได้ตั้งค่า LIFF");
        return;
      }
      // กัน LINE ค้าง — ถ้าเกิน 12 วินาทีถือว่าไม่สำเร็จ ดีกว่าหมุนค้างไม่จบ
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("เชื่อมต่อ LINE ไม่สำเร็จ (หมดเวลารอ)")),
          12_000
        )
      );

      try {
        const liff = await Promise.race([loadSdk(), timeout]);
        await Promise.race([liff.init({ liffId }), timeout]);

        if (!liff.isLoggedIn()) {
          // กันวนลูป — ถ้าเพิ่งเด้งไปล็อกอินแล้วยังกลับมาไม่ล็อกอิน อย่าเด้งซ้ำ
          if (sessionStorage.getItem(LOGIN_ATTEMPT_KEY)) {
            sessionStorage.removeItem(LOGIN_ATTEMPT_KEY);
            setInitError("เข้าสู่ระบบ LINE ไม่สำเร็จ");
            return;
          }
          sessionStorage.setItem(LOGIN_ATTEMPT_KEY, "1");
          liff.login({ redirectUri: window.location.href });
          return;
        }

        sessionStorage.removeItem(LOGIN_ATTEMPT_KEY);
        const token = liff.getIDToken();
        if (cancelled) return;
        if (!token) {
          setInitError("ไม่ได้รับข้อมูลยืนยันตัวตนจาก LINE");
          return;
        }
        setIdToken(token);
        setReady(true);
      } catch (err) {
        if (!cancelled) {
          setInitError(err instanceof Error ? err.message : "เชื่อมต่อ LINE ไม่สำเร็จ");
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [liffId]);

  /** วันนี้ตามเวลาไทย — กันเลือกวันย้อนหลัง */
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(
    new Date()
  );

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
  // ปิดเวลาที่รถยังอยู่กับลูกค้าอื่น
  const startChoices = timeChoicesFor(startDate, timeOptions, busySpans);
  const endChoices = timeChoicesFor(endDate, timeOptions, busySpans);
  const overlaps = rangeBusy(startDate, startTime, endDate, endTime, busySpans);

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
  const total = days * car.pricePerDay + afterHoursTotal;

  async function handleSubmit() {
    if (!startDate || !endDate) {
      setError("กรุณาเลือกวันรับและวันคืนรถ");
      return;
    }
    if (startDate === endDate && endTime <= startTime) {
      setError("เช่าวันเดียว เวลาคืนรถต้องหลังเวลารับรถ กรุณาเลือกเวลาคืนใหม่");
      setSubmitting(false);
      return;
    }

    if (rangeBusy(startDate, startTime, endDate, endTime, busySpans)) {
      setError("ช่วงเวลาที่เลือกคาบกับการจองของลูกค้าอื่น กรุณาเลือกใหม่");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/line/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          carId: car.id,
          startDate,
          endDate,
          startTime,
          endTime,
          phone: phone || undefined,
          pickupPlace,
          returnPlace,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (data?.needPhone) setNeedPhone(true);
        setError(data?.error ?? `จองไม่สำเร็จ (${res.status})`);
        setSubmitting(false);
        return;
      }

      setResult(data as Result);
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  }

  function closeLiff() {
    if (window.liff?.isInClient()) window.liff.closeWindow();
  }

  if (initError) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <p className="text-slate-700 mb-1">{initError}</p>
        <p className="text-sm text-slate-500 mb-6">
          ลองใหม่อีกครั้ง หรือจองผ่านเว็บก็ได้เหมือนกันครับ
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 transition-colors"
          >
            ลองใหม่
          </button>
          <a
            href={`/cars/${car.id}/book`}
            className="rounded-xl border border-slate-200 text-slate-700 font-semibold py-3 hover:bg-slate-50 transition-colors"
          >
            จองผ่านเว็บแทน
          </a>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
        <span className="w-10 h-10 rounded-full border-[3px] border-slate-200 border-t-blue-600 animate-spin block mx-auto mb-4" />
        <p className="text-slate-500 text-sm">กำลังเชื่อมต่อ LINE...</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <span
          className={`w-14 h-14 rounded-2xl text-white grid place-items-center mx-auto mb-5 ${
            result.isRequest ? "bg-violet-600" : "bg-emerald-500"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>

        <h1 className="text-xl font-bold text-slate-900 mb-2">
          {result.isRequest ? "ส่งคำขอจองแล้ว" : "จองสำเร็จ"}
        </h1>
        <p className="text-sm text-slate-500 mb-5">
          รหัส {result.bookingId.slice(0, 8).toUpperCase()}
        </p>

        {result.isRequest ? (
          <p className="text-sm text-slate-600 leading-relaxed">
            รถคันนี้เป็นรถจากพาร์ทเนอร์ เราจะเช็ควันว่างกับเจ้าของรถ
            แล้วแจ้งผลกลับทางแชท LINE
            <br />
            <strong>ยังไม่ต้องโอนค่าจอง</strong>
          </p>
        ) : (
          <div className="bg-blue-50 rounded-xl p-4 text-left">
            <p className="text-xs text-blue-900 mb-1">โอนค่าจองเพื่อกันวัน</p>
            <p className="text-2xl font-bold text-blue-900">
              {result.deposit.toLocaleString()} ฿
            </p>
            <p className="text-xs text-blue-800/80 mt-2 leading-relaxed">
              {BANK_ACCOUNT}
              <br />
              โอนแล้วส่งรูปสลิปในแชท LINE ได้เลย
            </p>
          </div>
        )}

        <p className="mt-4 text-xs text-slate-500 leading-relaxed">
          รายละเอียดทั้งหมดส่งไปในแชท LINE ให้แล้ว
          {result.isRequest ? "" : " เปิดหน้าจองเพื่อแนบสลิปและส่งเอกสารได้เลย"}
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <a
            href={`/booking/${result.bookingId}`}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 transition-colors"
          >
            {result.isRequest ? "ดูสถานะการจอง" : "แนบสลิป / ส่งเอกสาร"}
          </a>
          <button
            onClick={closeLiff}
            className="w-full rounded-xl border border-slate-200 text-slate-700 font-semibold py-3.5 hover:bg-slate-50 transition-colors"
          >
            กลับไปที่แชท
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* รถที่เลือก */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex gap-4 p-4">
          <div className="relative w-24 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
            {car.photoUrl ? (
              <Image src={car.photoUrl} alt={car.name} fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full grid place-items-center text-xs text-slate-400">
                ไม่มีรูป
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500">{car.brand}</p>
            <h1 className="font-bold text-slate-900 leading-snug">{car.name}</h1>
            <p className="text-blue-700 font-semibold mt-1">
              {car.pricePerDay.toLocaleString()} ฿ / วัน
            </p>
            {car.isRequest && (
              <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                ต้องรอยืนยันจากเจ้าของรถ
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <AvailabilityCalendar
        busySpans={busySpans}
        availability={availability}
        startDate={startDate}
        endDate={endDate}
        onSelect={(s, e) => {
          setStartDate(s);
          setEndDate(e);
        }}
        months={1}
      />

      {/* เลือกจากปฏิทินด้านบน หรือกรอกวันตรงนี้ก็ได้ */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="sd">
            วันรับรถ
          </label>
          <input
            id="sd"
            type="date"
            value={startDate}
            min={todayStr}
            onChange={(e) => {
              const v = e.target.value;
              setStartDate(v);
              if (endDate && endDate < v) setEndDate("");
            }}
            className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="ed">
            วันคืนรถ
          </label>
          <input
            id="ed"
            type="date"
            value={endDate}
            min={startDate || todayStr}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
        <p className="col-span-2 -mt-1 text-xs text-slate-500">
          เช่าวันเดียว ใส่วันเดียวกับวันรับรถได้เลย
        </p>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="st">
            เวลารับรถ
          </label>
          <select
            id="st"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          >
            {startChoices.map((c) => (
              <option key={c.time} value={c.time} disabled={c.busy}>
                {c.time} น.{c.busy ? " — รถไม่ว่าง" : ""}
              </option>
            ))}
          </select>
          {pickupFee.fee > 0 && pickupFee.rate && (
            <p className="text-xs text-amber-700 mt-1.5">
              {pickupFee.rate.label} ({rateRangeLabel(pickupFee.rate)}) +
              {pickupFee.fee.toLocaleString()} ฿
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="et">
            เวลาคืนรถ
          </label>
          <select
            id="et"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          >
            {endChoices.map((c) => (
              <option key={c.time} value={c.time} disabled={c.busy}>
                {c.time} น.{c.busy ? " — รถไม่ว่าง" : ""}
              </option>
            ))}
          </select>
          {returnFee.fee > 0 && returnFee.rate && (
            <p className="text-xs text-amber-700 mt-1.5">
              {returnFee.rate.label} ({rateRangeLabel(returnFee.rate)}) +
              {returnFee.fee.toLocaleString()} ฿
            </p>
          )}
        </div>
      </div>

      {pickupPoints.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="pp">
              จุดรับรถ
            </label>
            <select
              id="pp"
              value={pickupPlace}
              onChange={(e) => setPickupPlace(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              {pickupPoints.map((p) => (
                <option key={p.id} value={p.name}>{pointLabel(p)}</option>
              ))}
              <option value={OTHER_PLACE}>{OTHER_PLACE}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="rp">
              จุดคืนรถ
            </label>
            <select
              id="rp"
              value={returnPlace}
              onChange={(e) => setReturnPlace(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              {pickupPoints.map((p) => (
                <option key={p.id} value={p.name}>{pointLabel(p)}</option>
              ))}
              <option value={OTHER_PLACE}>{OTHER_PLACE}</option>
            </select>
          </div>
          <p className="col-span-2 text-xs text-slate-500">
            ถ้าต้องการจุดอื่น เลือก “{OTHER_PLACE}” แล้วแอดมินจะติดต่อกลับไปนัดครับ
          </p>
        </div>
      )}

      {needPhone && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="ph">
            เบอร์โทรศัพท์
          </label>
          <input
            id="ph"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="0812345678"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          />
        </div>
      )}

      {sameDayInvalid && (
        <div className="text-sm bg-red-50 border border-red-200 text-red-800 rounded-2xl px-4 py-3">
          เช่าวันเดียว เวลาคืนรถต้องหลังเวลารับรถ — เลือกเวลาคืนให้ช้ากว่า {startTime} น.
        </div>
      )}

      {overlaps && (
        <div className="text-sm bg-red-50 border border-red-200 text-red-800 rounded-2xl px-4 py-3">
          ช่วงเวลาที่เลือกคาบกับการจองของลูกค้าอื่น กรุณาเลือกใหม่
        </div>
      )}

      {days > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            {days} วัน × {car.pricePerDay.toLocaleString()} ฿
            {afterHoursTotal > 0 && (
              <span className="block text-xs text-amber-700 mt-0.5">
                + ค่ารับ-คืนนอกเวลา {afterHoursTotal.toLocaleString()} ฿
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">ยอดรวม</p>
            <p className="text-xl font-bold text-slate-900">{total.toLocaleString()} ฿</p>
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || !startDate || !endDate}
        className={`w-full rounded-xl text-white font-semibold py-4 shadow-lg transition-colors disabled:opacity-50 ${
          car.isRequest
            ? "bg-violet-600 hover:bg-violet-700 shadow-violet-600/25"
            : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/25"
        }`}
      >
        {submitting
          ? "กำลังบันทึก..."
          : car.isRequest
          ? "ส่งคำขอจอง"
          : "ยืนยันการจอง"}
      </button>
    </div>
  );
}
