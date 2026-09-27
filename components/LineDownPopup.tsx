"use client";

import { useState } from "react";

export const LINE_DOWN_TITLE = "LINE ขัดข้องชั่วคราว";
export const LINE_DOWN_MSG =
  "ขณะนี้ระบบเชื่อมต่อ LINE ไม่ได้ ทำให้ยังจองรถไม่ได้\nกรุณารอสักครู่ แล้วกลับมาจองใหม่อีกครั้งครับ\n\nถ้าต้องการใช้รถด่วน โทร 061-280-9588 หรือ 092-745-8074";

/**
 * ป๊อปอัปแจ้งว่า LINE ขัดข้อง — ใช้ตอนเช็คการแอดเพื่อน OA ไม่ได้
 * defaultOpen = เปิดเองตอนโหลดหน้า (หน้าจองรถ) · หรือควบคุมผ่าน open/onClose (หลังกดจอง)
 */
export default function LineDownPopup({
  defaultOpen = false,
  open: openProp,
  onClose,
}: {
  defaultOpen?: boolean;
  open?: boolean;
  onClose?: () => void;
}) {
  const [inner, setInner] = useState(defaultOpen);
  const open = openProp ?? inner;
  if (!open) return null;
  const close = () => {
    setInner(false);
    onClose?.();
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/50 p-4"
      onClick={close}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-slate-200 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-base font-semibold text-amber-800 mb-1">⚠️ {LINE_DOWN_TITLE}</p>
        <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{LINE_DOWN_MSG}</p>
        <div className="mt-5 flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold"
          >
            ลองใหม่
          </button>
          <button
            type="button"
            onClick={close}
            className="btn inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
          >
            ตกลง
          </button>
        </div>
      </div>
    </div>
  );
}
