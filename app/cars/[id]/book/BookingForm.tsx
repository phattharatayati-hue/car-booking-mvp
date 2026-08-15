"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BookingForm({
  carId,
  pricePerDay,
}: {
  carId: string;
  pricePerDay: number;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const days =
    startDate && endDate
      ? Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000))
      : 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        carId,
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        fullName: formData.get("fullName"),
        phone: formData.get("phone"),
        email: formData.get("email"),
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
      return;
    }

    router.push(`/booking/${data.bookingId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <p className="text-red-400 text-sm bg-red-950/50 px-3 py-2 rounded-md">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-neutral-300 mb-1">วันรับรถ</label>
          <input
            type="date"
            name="startDate"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-300 mb-1">วันคืนรถ</label>
          <input
            type="date"
            name="endDate"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-white"
          />
        </div>
      </div>

      {days > 0 && (
        <p className="text-sm text-neutral-400">
          {days} วัน · รวม {(days * pricePerDay).toLocaleString()} บาท
        </p>
      )}

      <div>
        <label className="block text-sm text-neutral-300 mb-1">ชื่อ-นามสกุล</label>
        <input name="fullName" required className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-white" />
      </div>
      <div>
        <label className="block text-sm text-neutral-300 mb-1">เบอร์โทร</label>
        <input name="phone" required className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-white" />
      </div>
      <div>
        <label className="block text-sm text-neutral-300 mb-1">อีเมล (ถ้ามี)</label>
        <input name="email" type="email" className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-white" />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-md py-2.5"
      >
        {submitting ? "กำลังบันทึก..." : "ยืนยันการจอง"}
      </button>
    </form>
  );
}
