"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { shrinkImage } from "@/lib/image-resize";
import { BANK } from "@/lib/contact";

export default function SlipUpload({
  bookingId,
  suggestedAmount,
  securityDeposit,
}: {
  bookingId: string;
  suggestedAmount: number;
  securityDeposit: number;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [amount, setAmount] = useState(String(suggestedAmount));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("กรุณาเลือกไฟล์สลิป");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const uploadForm = new FormData();
      uploadForm.append("file", await shrinkImage(file, { maxEdge: 2000, quality: 0.9 }));
      uploadForm.append("kind", "slip");
      const uploadRes = await fetch("/api/upload", { method: "POST", body: uploadForm });
      const uploadData = await uploadRes.json().catch(() => null);
      if (!uploadRes.ok || !uploadData?.url) {
        throw new Error(uploadData?.error ?? (uploadRes.status === 413
            ? "ไฟล์ใหญ่เกินไป กรุณาย่อรูปหรือถ่ายใหม่ด้วยความละเอียดต่ำลง"
            : `อัปโหลดไม่สำเร็จ (${uploadRes.status})`));
      }

      const depositRes = await fetch(`/api/bookings/${bookingId}/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slipImageUrl: uploadData.url, amount }),
      });
      if (!depositRes.ok) {
        const depositData = await depositRes.json().catch(() => null);
        throw new Error(depositData?.error ?? `บันทึกไม่สำเร็จ (${depositRes.status})`);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-5"
    >
      <div>
        <h3 className="font-semibold text-slate-900">อัปโหลดสลิปค่าจอง</h3>
        <p className="text-sm text-slate-500 mt-1">
          โอนค่าจองแล้วแนบสลิปเพื่อกันวันให้คุณ
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs text-blue-900 mb-1">ค่าจอง (กันวัน)</p>
        <p className="text-2xl font-bold text-blue-900">
          {suggestedAmount.toLocaleString()} ฿
        </p>
        <div className="text-xs text-blue-800/80 mt-2 leading-relaxed">
          <p>
            โอนเข้า {BANK.name} <span className="font-semibold">{BANK.number}</span>
          </p>
          <p>ชื่อบัญชี {BANK.accountName}</p>
        </div>
        {securityDeposit > 0 && (
          <p className="text-xs text-blue-800/80 mt-2 leading-relaxed border-t border-blue-200/70 pt-2">
            เงินประกันรถอีก {securityDeposit.toLocaleString()} บาท
            ชำระวันรับรถ และคืนให้หลังส่งคืนรถเรียบร้อย
          </p>
        )}
      </div>

      {error && (
        <div className="flex gap-3 text-sm bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 shrink-0 text-red-500">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
            <path d="M12 8v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1" fill="currentColor" />
          </svg>
          {error}
        </div>
      )}

      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-1.5">
          ยอดที่โอนจริง (บาท)
        </label>
        <input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-slate-700 mb-1.5">
          รูปสลิปโอนเงิน
        </span>
        <label
          htmlFor="slip"
          className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl py-8 px-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors text-center"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-slate-400">
            <path
              d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {file ? (
            <span className="text-sm font-medium text-slate-900 break-all">{file.name}</span>
          ) : (
            <>
              <span className="text-sm font-medium text-slate-700">
                คลิกเพื่อเลือกรูปสลิป
              </span>
              <span className="text-xs text-slate-400">JPG, PNG หรือ WEBP (สูงสุด 8MB)</span>
            </>
          )}
        </label>
        <input
          id="slip"
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 shadow-lg shadow-blue-600/25 transition-colors"
      >
        {submitting ? "กำลังอัปโหลด..." : "ส่งสลิป"}
      </button>
    </form>
  );
}
