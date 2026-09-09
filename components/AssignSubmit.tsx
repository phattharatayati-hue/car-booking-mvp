"use client";

import { useFormStatus } from "react-dom";

/**
 * ปุ่มมอบหมายงาน — บอกสถานะให้ชัดว่ากดไปแล้วและระบบกำลังทำงานอยู่
 *
 * ปัญหาเดิม: กดแล้วหน้าเงียบไปหลายวินาที (ต้องลงปฏิทิน Google และส่ง LINE)
 * แอดมินไม่รู้ว่ากดติดไหม เลยกดซ้ำ
 * useFormStatus บอกได้ว่าฟอร์มนี้กำลังส่งอยู่ จึงเปลี่ยนสี ข้อความ และปิดปุ่มกันกดซ้ำ
 */
export default function AssignSubmit() {
  const { pending } = useFormStatus();

  return (
    <>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className={`w-full mt-3 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
          pending
            ? "bg-blue-500 cursor-wait"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {pending && (
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 animate-spin">
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeOpacity="0.3"
            />
            <path
              d="M21 12a9 9 0 0 0-9-9"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        )}
        {pending ? "กำลังมอบหมายและส่ง LINE…" : "มอบหมายและแจ้งทาง LINE"}
      </button>

      {pending && (
        <p className="text-xs text-blue-700 mt-2 text-center">
          กำลังลงปฏิทินและส่งการ์ดงานเข้าแชท LINE — อย่าเพิ่งปิดหน้านี้
        </p>
      )}
    </>
  );
}
