"use client";

import { useState } from "react";
import { describeDayBusy, type BusySpan } from "@/lib/day-slots";

export type DayStatus = "free" | "partial" | "full";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const DAY_MS = 86400000;

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
}

function thaiDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = first.getDay();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

export default function AvailabilityCalendar({
  availability,
  startDate,
  endDate,
  onSelect,
  months = 2,
  busySpans = [],
}: {
  availability: Record<string, DayStatus>;
  startDate: string;
  endDate: string;
  onSelect: (start: string, end: string) => void;
  months?: number;
  /** ช่วงที่รถไม่ว่าง — ใช้บอกว่าวันที่เลือกติดช่วงไหน */
  busySpans?: BusySpan[];
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [offset, setOffset] = useState(0);

  const todayStr = ymd(today);

  function statusOf(dateStr: string): DayStatus {
    return availability[dateStr] ?? "free";
  }

  function hasFullBetween(a: string, b: string) {
    const start = new Date(`${a}T00:00:00`);
    const end = new Date(`${b}T00:00:00`);
    for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
      if (statusOf(ymd(new Date(t))) === "full") return true;
    }
    return false;
  }

  function handleClick(dateStr: string) {
    if (statusOf(dateStr) === "full" || dateStr < todayStr) return;

    if (!startDate || (startDate && endDate)) {
      onSelect(dateStr, "");
      return;
    }
    if (dateStr <= startDate) {
      onSelect(dateStr, "");
      return;
    }
    if (hasFullBetween(startDate, dateStr)) {
      onSelect(dateStr, "");
      return;
    }
    onSelect(startDate, dateStr);
  }

  const base = new Date(today.getFullYear(), today.getMonth() + offset, 1);

  const hint = !startDate
    ? "แตะวันที่ต้องการรับรถ"
    : !endDate
    ? "แตะวันคืนรถอีกครั้ง"
    : `${thaiDate(startDate)} → ${thaiDate(endDate)}`;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* หัวข้อ + สถานะที่เลือก */}
      <div className="px-4 py-3.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">เลือกวันเช่ารถ</p>
            <p
              className={`text-sm mt-0.5 truncate ${
                startDate && endDate ? "text-blue-700 font-medium" : "text-slate-500"
              }`}
            >
              {hint}
            </p>
          </div>
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => onSelect("", "")}
              className="text-xs font-medium text-slate-500 hover:text-red-600 shrink-0"
            >
              ล้าง
            </button>
          )}
        </div>
      </div>

      {/* คำอธิบายสี — มีสัญลักษณ์กำกับด้วย ไม่พึ่งสีอย่างเดียว */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className="w-4 h-4 rounded-md bg-white border border-slate-300" />
            ว่างทั้งวัน
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className="w-4 h-4 rounded-md bg-amber-100 border border-amber-300 grid place-items-center text-[9px] font-bold text-amber-700">
              ◗
            </span>
            ว่างบางเวลา
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className="w-4 h-4 rounded-md bg-red-500 border border-red-500 grid place-items-center text-[10px] font-bold text-white">
              ✕
            </span>
            <span className="font-medium text-red-600">ไม่ว่าง</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className="w-4 h-4 rounded-md bg-blue-600 border border-blue-600" />
            วันที่เลือก
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          วัน<span className="text-amber-700 font-medium">สีเหลือง</span>คือวันที่มีคนรับหรือคืนรถ
          ยังจองได้ถ้าเลือกเวลาไม่ชนกัน — แตะดูได้เลย ระบบจะบอกว่าว่างตั้งแต่กี่โมง
        </p>
      </div>

      <div className="p-4">
        {/* ปุ่มเลื่อนเดือน */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setOffset((o) => Math.max(0, o - 1))}
            disabled={offset === 0}
            className="w-9 h-9 grid place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
            aria-label="เดือนก่อนหน้า"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="text-sm text-slate-500">เลื่อนดูเดือนอื่น</span>
          <button
            type="button"
            onClick={() => setOffset((o) => o + 1)}
            className="w-9 h-9 grid place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="เดือนถัดไป"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className={`grid gap-6 ${months > 1 ? "sm:grid-cols-2" : ""}`}>
          {Array.from({ length: months }, (_, m) => {
            const monthDate = new Date(base.getFullYear(), base.getMonth() + m, 1);
            const cells = monthGrid(monthDate.getFullYear(), monthDate.getMonth());

            return (
              <div key={m}>
                <p className="text-center text-sm font-semibold text-slate-900 mb-3">
                  {monthLabel(monthDate)}
                </p>

                <div className="grid grid-cols-7 gap-1 mb-1.5">
                  {WEEKDAYS.map((w, i) => (
                    <span
                      key={w}
                      className={`text-[11px] font-medium text-center ${
                        i === 0 || i === 6 ? "text-red-400" : "text-slate-400"
                      }`}
                    >
                      {w}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {cells.map((cell, i) => {
                    if (!cell) return <span key={i} />;

                    const dateStr = ymd(cell);
                    const status = statusOf(dateStr);
                    const past = dateStr < todayStr;
                    const isToday = dateStr === todayStr;
                    const disabled = past || status === "full";

                    const isStart = dateStr === startDate;
                    const isEnd = dateStr === endDate;
                    const inRange =
                      startDate && endDate && dateStr > startDate && dateStr < endDate;

                    let cls =
                      "bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50";
                    let content: React.ReactNode = cell.getDate();

                    if (past) {
                      cls = "bg-slate-50 border border-transparent text-slate-300 cursor-not-allowed";
                    } else if (status === "full") {
                      cls =
                        "bg-red-500 border border-red-500 text-white cursor-not-allowed relative";
                      content = (
                        <>
                          <span className="line-through decoration-white/70 decoration-2">
                            {cell.getDate()}
                          </span>
                          <span className="block text-[8px] leading-none font-medium -mt-0.5">
                            เต็ม
                          </span>
                        </>
                      );
                    } else if (isStart || isEnd) {
                      cls = "bg-blue-600 border border-blue-600 text-white font-bold shadow-sm";
                    } else if (inRange) {
                      cls = "bg-blue-100 border border-blue-200 text-blue-800 font-medium";
                    } else if (status === "partial") {
                      cls =
                        "bg-amber-100 border border-amber-300 text-amber-900 hover:border-amber-500";
                      content = (
                        <>
                          <span>{cell.getDate()}</span>
                          <span className="block text-[9px] leading-none font-bold text-amber-700 -mt-0.5">
                            ◗
                          </span>
                        </>
                      );
                    }

                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleClick(dateStr)}
                        title={
                          status === "full"
                            ? "วันนี้มีคนจองเต็มทั้งวัน"
                            : describeDayBusy(dateStr, busySpans) ?? "ว่างทั้งวัน"
                        }
                        className={`h-11 rounded-lg text-sm transition-all flex flex-col items-center justify-center ${cls} ${
                          isToday && !isStart && !isEnd ? "ring-2 ring-blue-300" : ""
                        }`}
                      >
                        {content}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* บอกช่วงที่ติดของวันที่เลือก */}
      {(startDate || endDate) && (
        <div className="px-4 pb-4 -mt-1 flex flex-col gap-1.5">
          {[
            { label: "วันรับรถ", date: startDate },
            { label: "วันคืนรถ", date: endDate },
          ].map(({ label, date }) => {
            if (!date) return null;
            const note = describeDayBusy(date, busySpans);
            if (!note) return null;
            return (
              <p
                key={label}
                className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
              >
                <span className="font-medium">{label} {thaiDate(date)}</span> — {note}
              </p>
            );
          })}
        </div>
      )}

    </div>
  );
}
