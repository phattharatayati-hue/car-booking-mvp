"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import AvailabilityCalendar, { DayStatus } from "@/components/AvailabilityCalendar";
import { OTHER_PLACE, pointLabel, type PickupOption } from "@/lib/pickup-points";
import {
  feeForTime,
  rateRangeLabel,
  rentalDuration,
  DEFAULT_LATE_RULE,
  type AfterHoursRate,
  type LateRule,
} from "@/lib/pricing";
import {
  DEFAULT_LEAD_HOURS,
  earliestPickup,
  earliestPickupDateStr,
  isTooSoon,
  leadTimeShort,
  URGENT_LINE,
  leadTimeMessage,
} from "@/lib/booking-rules";
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
  lateRule = DEFAULT_LATE_RULE,
  minLeadHours = DEFAULT_LEAD_HOURS,
}: {
  car: LiffCar;
  availability: Record<string, DayStatus>;
  timeOptions: string[];
  afterHoursRates: AfterHoursRate[];
  busySpans?: BusySpan[];
  liffId: string;
  /** กติกาค่าคืนรถล่าช้า — มาจากหน้าตั้งค่าระบบ */
  lateRule?: LateRule;
  /** ต้องจองล่วงหน้ากี่ชั่วโมง — มาจากหน้าตั้งค่าระบบ (0 = ไม่บังคับ) */
  minLeadHours?: number;
  pickupPoints: PickupOption[];
}) {
  const [ready, setReady] = useState(false);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  /* วันแรกที่จองได้ตามกฎจองล่วงหน้า (lib/booking-rules.ts) */
  const minPickupDate = earliestPickupDateStr(minLeadHours);
  /* เวลารับรถที่เร็วที่สุดจริง ๆ (ระดับนาที) — ปฏิทินกรองได้แค่ระดับวัน
     ค่านี้เอาไว้ปิดเวลาที่กระชั้นเกินไปในวันแรกที่เลือกได้ */
  const earliestAt = minLeadHours > 0 ? earliestPickup(minLeadHours) : null;

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

  // เลื่อนจอไปหาข้อความ error เอง — เดิมกล่อง error อยู่บนสุด กดปุ่มล่างสุดแล้วไม่เห็นว่าพลาดตรงไหน
  const errorRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);

  // กันกดจองซ้ำเป็นสองรายการ — ส่งรหัสคำขอเดิมไปทุกครั้งที่ลองใหม่ด้วยเงื่อนไขเดียวกัน
  const requestId = useMemo(
    () => `${car.id}-${startDate}-${startTime}-${endDate}-${endTime}-${pickupPlace}-${returnPlace}`,
    [car.id, startDate, startTime, endDate, endTime, pickupPlace, returnPlace]
  );

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

  // วันเต็ม + ชั่วโมงเลท ตามกติกาที่แอดมินตั้งไว้
  const duration =
    startDate && endDate
      ? rentalDuration(
          new Date(`${startDate}T${startTime}:00+07:00`),
          new Date(`${endDate}T${endTime}:00+07:00`),
          lateRule
        )
      : null;
  const days = duration?.days ?? 0;
  // ปิดเวลาที่รถยังอยู่กับลูกค้าอื่น
  const startChoices = timeChoicesFor(startDate, timeOptions, busySpans, earliestAt);
  const endChoices = timeChoicesFor(endDate, timeOptions, busySpans);
  const overlaps = rangeBusy(startDate, startTime, endDate, endTime, busySpans);

  useEffect(() => {
    if (!startDate) return;
    const startChoice = startChoices.find((c) => c.time === startTime);
    if (startChoice?.busy || startChoice?.tooSoon) {
      const next = firstFreeTime(startDate, timeOptions, busySpans, earliestAt);
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
  const lateHours = duration?.lateHours ?? 0;
  const lateFee =
    lateHours > 0 ? Math.min(lateHours * lateRule.hourlyFee, car.pricePerDay) : 0;
  const total = days * car.pricePerDay + afterHoursTotal + lateFee;

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

    if (isTooSoon(new Date(`${startDate}T${startTime}:00+07:00`), minLeadHours)) {
      setError(leadTimeMessage(minLeadHours));
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
          requestId,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (data?.needPhone) setNeedPhone(true);
        setError(thaiError(data?.error, res.status));
        setSubmitting(false);
        return;
      }

      setResult(data as Result);
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ กรุณาเช็คสัญญาณอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง");
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
        <div
          ref={errorRef}
          role="alert"
          aria-live="assertive"
          className="text-sm bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl"
        >
          {error}
        </div>
      )}

      <AvailabilityCalendar
        minDate={minPickupDate}
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

      {minLeadHours > 0 && (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 leading-relaxed">
          {leadTimeShort(minLeadHours)} — ทีมงานต้องเตรียมรถและจัดคิวคนไปส่งก่อน
          <br />
          {URGENT_LINE}
        </p>
      )}

      {/* เลือกจากปฏิทินด้านบน หรือกรอกวันตรงนี้ก็ได้

          ช่องวันที่ต้องการที่กว้างกว่าช่องอื่นมาก (iOS แสดงวันเต็มรูปแบบ)
          จึงขึ้นสองคอลัมน์ที่ 480px ไม่ใช่ 360px เหมือนช่องเวลา/จุดรับ-ส่ง
          บนมือถือทั่วไปจะเรียงลงมาเป็นคอลัมน์เดียว อ่านง่ายกว่าและไม่มีทางล้น */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-1 min-[480px]:grid-cols-2 gap-3">
        <div className="min-w-0">
          <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="sd">
            วันรับรถ
          </label>
          <input
            id="sd"
            type="date"
            value={startDate}
            min={minPickupDate}
            onChange={(e) => {
              const v = e.target.value;
              setStartDate(v);
              if (endDate && endDate < v) setEndDate("");
            }}
            className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
        <div className="min-w-0">
          <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="ed">
            วันคืนรถ
          </label>
          <input
            id="ed"
            type="date"
            value={endDate}
            min={startDate || minPickupDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
        <p className="col-span-full -mt-1 text-xs text-slate-500">
          เช่าวันเดียว ใส่วันเดียวกับวันรับรถได้เลย
        </p>
        <div className="min-w-0">
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
              <option key={c.time} value={c.time} disabled={c.busy || c.tooSoon}>
                {c.time} น.
                {c.busy ? " — รถไม่ว่าง" : c.tooSoon ? " — กระชั้นเกินไป" : ""}
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
        <div className="min-w-0">
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
        <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-1 min-[360px]:grid-cols-2 gap-3">
          <div className="min-w-0">
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
          <div className="min-w-0">
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
          <p className="col-span-full text-xs text-slate-500">
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
            {lateFee > 0 && (
              <span className="block text-xs text-amber-700 mt-0.5">
                + คืนรถล่าช้า {lateHours} ชม. {lateFee.toLocaleString()} ฿
              </span>
            )}
            {duration?.roundedUpToDay && (
              <span className="block text-xs text-slate-500 mt-0.5">
                คืนช้าเกิน {lateRule.roundUpHours} ชม. จึงคิดเป็นค่าเช่าอีก 1 วัน
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">ยอดรวม</p>
            <p className="text-xl font-bold text-slate-900">{total.toLocaleString()} ฿</p>
          </div>
        </div>
      )}

      {/* ปุ่มยืนยันติดขอบล่าง — จอ LIFF เตี้ย เดิมต้องไถลงไปหาปุ่มเอง */}
      <div className="sticky bottom-0 -mx-4 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
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
    </div>
  );
}

/** แปล error ดิบจาก API เป็นข้อความไทยที่ลูกค้าอ่านแล้วรู้ว่าต้องทำอะไรต่อ */
function thaiError(raw: unknown, status: number): string {
  const text = typeof raw === "string" ? raw : "";
  const map: Record<string, string> = {
    "invalid id token": "เซสชัน LINE หมดอายุ กรุณาปิดหน้านี้แล้วเปิดใหม่จากแชท",
    "id token expired": "เซสชัน LINE หมดอายุ กรุณาปิดหน้านี้แล้วเปิดใหม่จากแชท",
    "car not found": "ไม่พบรถคันนี้แล้ว อาจถูกปิดการจองไป กรุณาเลือกคันอื่น",
    "car unavailable": "รถคันนี้ถูกจองในช่วงเวลาที่เลือกไปแล้ว กรุณาเลือกวันใหม่",
    "overlap": "ช่วงเวลาที่เลือกคาบกับการจองอื่น กรุณาเลือกใหม่",
    "invalid phone": "เบอร์โทรไม่ถูกต้อง กรุณากรอกเบอร์ 10 หลัก",
    "phone required": "กรุณากรอกเบอร์โทรเพื่อให้เราติดต่อกลับได้",
    "invalid date": "วันที่ไม่ถูกต้อง กรุณาเลือกใหม่",
  };
  const hit = map[text.toLowerCase().trim()];
  if (hit) return hit;
  // ข้อความไทยจากเซิร์ฟเวอร์ส่งต่อได้เลย ส่วนอังกฤษดิบไม่ต้องโชว์ให้ลูกค้างง
  if (text && /[\u0E00-\u0E7F]/.test(text)) return text;
  if (status === 409) return "ช่วงเวลานี้เพิ่งถูกจองไป กรุณาเลือกวันใหม่";
  if (status === 429) return "กดถี่เกินไป รอสักครู่แล้วลองใหม่อีกครั้ง";
  if (status >= 500) return "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งใน 1-2 นาที";
  return `จองไม่สำเร็จ กรุณาลองใหม่ (รหัส ${status})`;
}
