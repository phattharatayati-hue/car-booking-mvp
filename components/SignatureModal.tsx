"use client";

import { useEffect } from "react";
import SignaturePad from "@/components/SignaturePad";

/**
 * กล่องเซ็นแบบเต็มจอ — ใช้ตอนลูกค้าเซ็นบนมือถือของคนไปส่ง/รับรถ
 *
 * ทำไมต้องเต็มจอ: ใน in-app browser ของ LINE การลากนิ้วลงบนหน้าเว็บ
 * จะไปโดน "ลากลงเพื่อปิด" ของตัว LINE เอง เซ็นอยู่ดี ๆ หน้าเว็บพับปิดลง
 * จึงต้องล็อกไม่ให้หน้าข้างหลังเลื่อน และกัน touchmove ที่หลุดออกนอกกรอบเซ็น
 * ตัว canvas เองมี touch-none อยู่แล้ว จึงยังเซ็นได้ตามปกติ
 */
export default function SignatureModal({
  open,
  onClose,
  title = "ให้ลูกค้าเซ็นรับใบเสร็จ",
  subtitle,
  buttonText = "บันทึกลายเซ็นลูกค้า",
  submit,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  submit: (blob: Blob) => Promise<void>;
}) {
  useEffect(() => {
    if (!open) return;

    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPosition = body.style.position;
    const prevTop = body.style.top;
    const prevWidth = body.style.width;
    const scrollY = window.scrollY;

    /* position: fixed กันหน้าเบื้องหลังเลื่อน — สำคัญกับ LINE/Safari
       เพราะ overflow: hidden อย่างเดียวยังลากหน้าได้อยู่ */
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    // ต้องเป็น non-passive ถึงจะ preventDefault ได้
    const block = (e: TouchEvent) => e.preventDefault();
    document.addEventListener("touchmove", block, { passive: false });

    return () => {
      document.removeEventListener("touchmove", block);
      body.style.overflow = prevOverflow;
      body.style.position = prevPosition;
      body.style.top = prevTop;
      body.style.width = prevWidth;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[100] bg-slate-900/60 flex items-end sm:items-center justify-center"
    >
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-xl p-5 max-h-[92vh] overflow-y-auto overscroll-contain">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-base font-semibold text-slate-900">{title}</p>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="btn shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <SignaturePad
          submit={submit}
          buttonText={buttonText}
          label="เซ็นในกรอบด้านล่างได้เลย — ไม่สะดวกเซ็นก็กดปิดได้ ใบเสร็จจะเว้นช่องไว้ให้เซ็นด้วยปากกา"
          height="h-56"
        />
      </div>
    </div>
  );
}
