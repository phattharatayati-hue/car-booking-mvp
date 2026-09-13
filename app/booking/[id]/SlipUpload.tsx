"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { shrinkImage } from "@/lib/image-resize";
import CopyButton from "@/components/CopyButton";
import { BANK } from "@/lib/contact";

/** เพดานเดียวกับฝั่งเซิร์ฟเวอร์ — บอกผู้ใช้ตั้งแต่ตอนเลือกไฟล์ */
const MAX_MB = 8;
const MAX_BYTES = MAX_MB * 1024 * 1024;

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
  const [preview, setPreview] = useState<string | null>(null);
  const [amount, setAmount] = useState(String(suggestedAmount));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* แสดงรูปตัวอย่าง — บนมือถือชื่อไฟล์เป็น IMG_4821 ดูไม่ออกว่าแนบใบถูกไหม
     ต้องคืน URL ทิ้งทุกครั้งที่เปลี่ยนไฟล์ ไม่งั้นหน่วยความจำรั่ว */
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  /** ตรวจไฟล์ตั้งแต่ตอนเลือก ไม่ใช่ปล่อยให้รออัปโหลดจนจบแล้วเจอ 413 */
  function pickFile(chosen: File | null) {
    setError(null);
    if (!chosen) {
      setFile(null);
      return;
    }
    if (!chosen.type.startsWith("image/")) {
      setFile(null);
      setError("ไฟล์ต้องเป็นรูปภาพเท่านั้น (JPG, PNG หรือ WEBP)");
      return;
    }
    if (chosen.size > MAX_BYTES) {
      setFile(null);
      setError(
        `ไฟล์ใหญ่ ${(chosen.size / 1024 / 1024).toFixed(1)} MB เกิน ${MAX_MB} MB — ถ่ายใหม่ด้วยความละเอียดต่ำลง หรือย่อรูปก่อน`
      );
      return;
    }
    setFile(chosen);
  }

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
      uploadForm.append("file", await shrinkImage(file, { maxEdge: 1600, quality: 0.85, targetBytes: 500_000 }));
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

        {/* QR + เลขบัญชี — ให้ลูกค้าเลือกทางที่ถนัด
            สแกน QR สะดวกกว่าและพิมพ์เลขผิดไม่ได้ แต่คนที่เปิดหน้านี้บนมือถือเครื่องเดียว
            กับที่ใช้แอปธนาคารจะสแกนหน้าจอตัวเองไม่ได้ จึงต้องมีทั้งปุ่มบันทึกรูป
            (เอาไปเปิดจากคลังภาพในแอปธนาคาร) และปุ่มคัดลอกเลขบัญชีควบคู่กัน */}
        <div className="mt-3 flex flex-col sm:flex-row gap-4 items-start">
          <div className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/payment-qr.png"
              alt={`QR พร้อมเพย์ ${BANK.accountName}`}
              width={160}
              height={160}
              className="w-40 h-40 rounded-xl bg-white p-2 border border-blue-200"
            />
            <a
              href="/payment-qr.png"
              download="phuping-qr.png"
              className="btn mt-2 w-40 inline-flex items-center justify-center px-3 py-2 rounded-lg bg-white border border-blue-200 text-blue-800 text-xs font-semibold hover:bg-blue-50 transition-colors"
            >
              บันทึกรูป QR
            </a>
            <p className="text-[11px] text-blue-800/70 mt-1.5 w-40 leading-snug">
              บันทึกไม่ได้ให้กดค้างที่รูปแล้วเลือกบันทึกรูป
            </p>
          </div>

          <div className="text-xs text-blue-800/80 leading-relaxed">
            <p className="font-semibold text-blue-900 mb-1">หรือโอนเข้าบัญชี</p>
            <p>{BANK.name}</p>
            <p className="text-base font-bold text-blue-900 tracking-wide my-0.5">
              {BANK.number}
            </p>
            <p>ชื่อบัญชี {BANK.accountName}</p>
            <div className="mt-2">
              <CopyButton value={BANK.number.replace(/-/g, "")} label="คัดลอกเลขบัญชี" />
            </div>
          </div>
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
          min={1}
          step={1}
          required
          inputMode="numeric"
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
          htmlFor="slip-file"
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
            <>
              {preview && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={preview}
                  alt="ตัวอย่างสลิปที่เลือก"
                  data-no-dim
                  className="max-h-56 w-auto rounded-lg border border-slate-200"
                />
              )}
              <span className="text-sm font-medium text-slate-900 break-all">{file.name}</span>
              <span className="text-xs text-slate-400">
                {(file.size / 1024 / 1024).toFixed(1)} MB · แตะเพื่อเปลี่ยนรูป
              </span>
            </>
          ) : (
            <>
              <span className="text-sm font-medium text-slate-700">
                คลิกเพื่อเลือกรูปสลิป
              </span>
              <span className="text-xs text-slate-400">JPG, PNG หรือ WEBP (สูงสุด 8MB)</span>
            </>
          )}
        </label>
        {/* ห้ามตั้ง id เป็น "slip" — ชนกับ div จุดหมายของลิงก์ #slip ในหน้า
            พอ id ซ้ำกัน label จะไปจับ div แทน input แล้วกดเลือกไฟล์ไม่ได้ */}
        <input
          id="slip-file"
          type="file"
          accept="image/*"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          className="sr-only"
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
