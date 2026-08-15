"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SlipUpload({
  bookingId,
  suggestedAmount,
}: {
  bookingId: string;
  suggestedAmount: number;
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
      uploadForm.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: uploadForm });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error ?? "อัปโหลดไม่สำเร็จ");

      const depositRes = await fetch(`/api/bookings/${bookingId}/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slipImageUrl: uploadData.url, amount }),
      });
      if (!depositRes.ok) throw new Error("บันทึกไม่สำเร็จ");

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col gap-4">
      <p className="text-sm text-neutral-300">อัปโหลดสลิปมัดจำเพื่อยืนยันการจอง</p>

      {error && <p className="text-red-400 text-sm bg-red-950/50 px-3 py-2 rounded-md">{error}</p>}

      <div>
        <label className="block text-sm text-neutral-300 mb-1">ยอดมัดจำ (บาท)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-white"
        />
      </div>

      <div>
        <label className="block text-sm text-neutral-300 mb-1">รูปสลิปโอนเงิน</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-neutral-300"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-md py-2.5"
      >
        {submitting ? "กำลังอัปโหลด..." : "ส่งสลิป"}
      </button>
    </form>
  );
}
