"use client";

/**
 * กล่องยืนยันในดีไซน์เดียวกับระบบ — ใช้แทน window.confirm
 *
 * window.confirm เป็นกล่องของเบราว์เซอร์ หน้าตาไม่เข้ากับเว็บ
 * และใน in-app browser ของ LINE บางรุ่นกดแล้วหน้าค้างหรือถูกปิดไปเลย
 */
export default function ConfirmDialog({
  open,
  title = "ยืนยันการทำรายการ",
  message,
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/50 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-slate-200 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-base font-semibold text-slate-900 mb-1">{title}</p>
        <p className="text-sm text-slate-600 whitespace-pre-line">{message}</p>
        <div className="mt-5 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="btn inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
