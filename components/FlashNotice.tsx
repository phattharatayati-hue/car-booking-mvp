"use client";

import { useEffect, useState } from "react";

/**
 * แถบยืนยันผลลัพธ์สั้นๆ ที่มุมล่าง — ใช้กับการกระทำที่หน้าเปลี่ยนไปจนไม่เห็นผล
 * ตอนนี้มีเคสเดียวคือออกจากระบบ (?logout=1)
 *
 * อ่านค่าจาก window.location แทน useSearchParams ตั้งใจไว้แบบนี้
 * เพราะ useSearchParams บังคับให้ต้องมี <Suspense> ครอบทุกหน้าที่ใช้เปลือกนี้
 * แล้วลบพารามิเตอร์ทิ้งด้วย replaceState เพื่อไม่ให้ข้อความโผล่ซ้ำตอนกดรีเฟรช
 */
const MESSAGES: Record<string, string> = {
  "1": "ออกจากระบบเรียบร้อยแล้ว",
};

export default function FlashNotice() {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const msg = MESSAGES[params.get("logout") ?? ""];
    if (!msg) return;

    setText(msg);

    params.delete("logout");
    const q = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (q ? `?${q}` : "")
    );

    const timer = setTimeout(() => setText(null), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!text) return null;

  return (
    <div
      role="status"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-full bg-panel text-white text-sm font-medium shadow-pop flex items-center gap-2"
    >
      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-gold-fixed">
        <path
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {text}
    </div>
  );
}
