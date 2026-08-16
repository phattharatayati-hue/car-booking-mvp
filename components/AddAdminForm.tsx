"use client";

import { useState } from "react";

const inputClass =
  "w-full rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-colors";
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

export default function AddAdminForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-600/25 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        เพิ่มแอดมิน
      </button>
    );
  }

  return (
    <form
      action={action}
      className="bg-white rounded-2xl border border-slate-200 p-6 w-full order-last"
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-slate-900">เพิ่มแอดมินใหม่</h2>
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
          <label className={labelClass} htmlFor="new-name">ชื่อ</label>
          <input id="new-name" name="name" required placeholder="สมชาย ใจดี" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="new-email">อีเมล (ใช้ล็อกอิน)</label>
          <input
            id="new-email"
            name="email"
            type="email"
            required
            placeholder="somchai@example.com"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="new-password">รหัสผ่าน</label>
          <input
            id="new-password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="อย่างน้อย 8 ตัวอักษร"
            className={inputClass}
          />
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        สร้างบัญชีเสร็จแล้วค่อยกด “สร้างรหัสผูก LINE” ที่การ์ดของคนนั้นเพื่อเชื่อมการแจ้งเตือน
      </p>

      <button
        type="submit"
        className="mt-6 w-full sm:w-auto px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-3 shadow-sm shadow-blue-600/25 transition-colors"
      >
        สร้างบัญชีแอดมิน
      </button>
    </form>
  );
}
