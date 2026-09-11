"use client";

import { useState } from "react";

/**
 * ปุ่มคัดลอกข้อความสั้น ๆ เช่นเลขบัญชี
 *
 * แอดมินต้องเอาเลขไปวางในแอปธนาคาร ถ้าต้องอ่านแล้วพิมพ์ตามทีละหลัก
 * พิมพ์ผิดเมื่อไหร่คือเงินไปผิดบัญชี ซึ่งตามคืนยากกว่าพิมพ์ใหม่มาก
 */
export default function CopyButton({
  value,
  label = "คัดลอก",
}: {
  value: string;
  label?: string;
}) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // บางเบราว์เซอร์บล็อก clipboard API — ใช้วิธีเลือกข้อความแทน
      const el = document.createElement("textarea");
      el.value = value;
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand("copy");
      } catch {
        /* คัดลอกไม่ได้จริง ๆ ก็ปล่อยให้ผู้ใช้ลากเลือกเอง */
      }
      document.body.removeChild(el);
    }
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
      aria-live="polite"
    >
      {done ? "คัดลอกแล้ว ✓" : label}
    </button>
  );
}
