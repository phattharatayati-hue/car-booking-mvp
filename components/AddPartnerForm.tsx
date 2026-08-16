"use client";

import { useState } from "react";

const inputClass =
  "w-full rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-colors";
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

export default function AddPartnerForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold shadow-sm shadow-violet-600/25 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        เพิ่มเจ้าของรถ
      </button>
    );
  }

  return (
    <form
      action={action}
      className="bg-white rounded-2xl border border-slate-200 p-6 w-full order-last"
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-slate-900">เพิ่มเจ้าของรถ</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-slate-400 hover:text-slate-700 text-sm"
        >
          ยกเลิก
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="p-name">ชื่อเจ้าของรถ</label>
          <input id="p-name" name="name" required placeholder="เช่น คุณสมชาย" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="p-phone">เบอร์โทร</label>
          <input
            id="p-phone"
            name="phone"
            required
            inputMode="tel"
            placeholder="08X-XXX-XXXX"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="p-line">
            LINE ID <span className="text-slate-400 font-normal">(ถ้ามี)</span>
          </label>
          <input id="p-line" name="lineId" placeholder="@somchai" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="p-note">
            หมายเหตุ <span className="text-slate-400 font-normal">(ถ้ามี)</span>
          </label>
          <input
            id="p-note"
            name="note"
            placeholder="เช่น รับสายหลัง 18:00"
            className={inputClass}
          />
        </div>
      </div>

      <button
        type="submit"
        className="mt-6 w-full sm:w-auto px-6 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-3 shadow-sm shadow-violet-600/25 transition-colors"
      >
        บันทึก
      </button>
    </form>
  );
}
