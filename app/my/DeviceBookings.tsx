"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listRemembered, forget } from "@/lib/device-bookings";
import { STATUS_CLASS } from "@/lib/booking-status";

type Row = {
  id: string;
  code: string;
  carLabel: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: string;
  statusLabel: string;
};

/**
 * "การจองจากอุปกรณ์นี้" — สำหรับคนที่จองโดยไม่เข้าสู่ระบบ
 *
 * รายชื่อรหัสการจองอยู่ใน localStorage ของเครื่อง (ไม่มีวันหมดอายุ)
 * แล้วขอรายละเอียดจากเซิร์ฟเวอร์อีกที เพราะสถานะเปลี่ยนได้ตลอด
 * ห้ามเก็บสถานะไว้ในเครื่อง ไม่งั้นจะแสดงข้อมูลเก่าที่ไม่ตรงความจริง
 */
export default function DeviceBookings({ hideIds = [] }: { hideIds?: string[] }) {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    const saved = listRemembered();
    if (saved.length === 0) {
      setRows([]);
      return;
    }

    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/my/device", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: saved.map((s) => s.id) }),
        });
        const data = await res.json().catch(() => null);
        if (!alive) return;

        const list: Row[] = data?.bookings ?? [];
        // การจองที่ถูกลบไปแล้วไม่ต้องค้างในเครื่อง
        const alive_ids = new Set(list.map((b) => b.id));
        for (const s of saved) if (!alive_ids.has(s.id)) forget(s.id);

        setRows(list.filter((b) => !hideIds.includes(b.id)));
      } catch {
        if (alive) setRows([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [hideIds]);

  if (!rows || rows.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold text-slate-900 mb-1">
        การจองจากอุปกรณ์นี้
      </h2>
      <p className="text-xs text-slate-500 mb-3 leading-relaxed">
        เครื่องนี้จำไว้ให้ {rows.length} รายการ — เข้าสู่ระบบด้วย LINE
        แล้วกดเก็บเข้าบัญชี จะดูได้จากทุกเครื่อง
      </p>

      <ul className="flex flex-col gap-2">
        {rows.map((b) => (
          <li key={b.id}>
            <Link
              href={`/booking/${b.id}`}
              className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3 hover:border-slate-300 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {b.carLabel}
                </p>
                <p className="text-xs text-slate-500 font-mono">{b.code}</p>
              </div>
              <span
                className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full border ${
                  STATUS_CLASS[b.status] ?? "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {b.statusLabel}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
