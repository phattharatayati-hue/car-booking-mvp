"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { remember } from "@/lib/device-bookings";

/**
 * ค้นการจองด้วยรหัสจอง + เบอร์โทร
 * ทางเข้าสำรองของคนที่จองโดยไม่เข้าสู่ระบบแล้วลิงก์หาย
 */
export default function FindBooking() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch("/api/my/find", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, phone }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);

    if (!res.ok || !data?.bookingId) {
      setError(data?.error ?? "ค้นหาไม่สำเร็จ กรุณาลองใหม่");
      return;
    }

    // เจอแล้วให้เครื่องนี้จำไว้ด้วย ครั้งหน้าไม่ต้องกรอกอีก
    remember({ id: data.bookingId, code: code.toUpperCase(), carLabel: "การจองของฉัน" });
    router.push(`/booking/${data.bookingId}`);
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 text-sm text-blue-700 hover:underline"
      >
        จองไว้แต่ไม่ได้เข้าสู่ระบบ? ค้นด้วยรหัสจอง
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mt-5 bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3"
    >
      <div>
        <h2 className="font-semibold text-slate-900 text-sm">ค้นการจองของคุณ</h2>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          กรอกรหัสจอง 8 ตัวที่อยู่ในหน้ายืนยันการจอง คู่กับเบอร์ที่ใช้จอง
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="find-code" className="block text-sm font-medium text-slate-700 mb-1.5">
          รหัสจอง
        </label>
        <input
          id="find-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8))}
          required
          placeholder="เช่น K3M9QP2X"
          className={`${inputClass} font-mono uppercase tracking-widest`}
        />
      </div>

      <div>
        <label htmlFor="find-phone" className="block text-sm font-medium text-slate-700 mb-1.5">
          เบอร์โทรที่ใช้จอง
        </label>
        <input
          id="find-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          required
          placeholder="0812345678"
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={busy || code.length !== 8}
        className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 transition-colors"
      >
        {busy ? "กำลังค้นหา..." : "ค้นหาการจอง"}
      </button>
    </form>
  );
}
