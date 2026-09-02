"use client";

import { useState } from "react";

const inputClass =
  "w-full rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-colors";
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

const ROLE_CHOICES = [
  {
    value: "ADMIN",
    label: "แอดมิน",
    hint: "เข้าหลังบ้านได้ทั้งหมด — จัดการรถ การจอง และมอบหมายงาน",
  },
  {
    value: "DRIVER",
    label: "คนรับ-ส่งรถ",
    hint: "ไม่เข้าหลังบ้าน เห็นเฉพาะคิวงานของตัวเองที่ส่งไปทาง LINE",
  },
] as const;

export default function AddAdminForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"ADMIN" | "DRIVER">("ADMIN");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-600/25 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        เพิ่มผู้ใช้
      </button>
    );
  }

  return (
    <form
      action={action}
      className="bg-white rounded-2xl border border-slate-200 p-6 w-full order-last"
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-slate-900">เพิ่มผู้ใช้ใหม่</h2>
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
          <label className={labelClass} htmlFor="new-username">ชื่อผู้ใช้ (ใช้ล็อกอิน)</label>
          <input
            id="new-username"
            name="email"
            type="text"
            required
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            pattern="[A-Za-z0-9._@-]{3,}"
            title="ใช้ตัวอักษรอังกฤษ ตัวเลข จุด ขีด หรือขีดล่าง อย่างน้อย 3 ตัว"
            placeholder="Sutimon"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-500">
            ภาษาอังกฤษหรือตัวเลข ห้ามเว้นวรรค · ใช้อีเมลก็ได้ถ้าต้องการ
          </p>
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

      <div className="mt-4">
        <p className={labelClass}>ประเภทบัญชี</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {ROLE_CHOICES.map((r) => (
            <label
              key={r.value}
              className={`flex gap-3 items-start rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                role === r.value
                  ? "border-blue-500 bg-blue-50/60 ring-4 ring-blue-500/10"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="role"
                value={r.value}
                checked={role === r.value}
                onChange={() => setRole(r.value)}
                className="mt-1 accent-blue-600"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">{r.label}</span>
                <span className="block text-xs text-slate-500 mt-0.5">{r.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        บอกชื่อผู้ใช้และรหัสผ่านให้เจ้าตัว แล้วให้เขาเข้าไปผูก LINE เองที่หน้า “บัญชีของฉัน”
      </p>

      <button
        type="submit"
        className="mt-6 w-full sm:w-auto px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-3 shadow-sm shadow-blue-600/25 transition-colors"
      >
        {role === "DRIVER" ? "สร้างบัญชีคนรับ-ส่งรถ" : "สร้างบัญชีแอดมิน"}
      </button>
    </form>
  );
}
