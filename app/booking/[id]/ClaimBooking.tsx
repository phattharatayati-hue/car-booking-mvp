"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * ปุ่มดึงการจองที่ทำไว้ตอนไม่ได้เข้าสู่ระบบ เข้ามาไว้ในบัญชี LINE ของตัวเอง
 * ขึ้นเฉพาะตอนที่เข้าสู่ระบบอยู่ และการจองนี้ยังไม่มีเจ้าของที่ผูก LINE
 */
export default function ClaimBooking({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setBusy(true);
    setError(null);

    const res = await fetch("/api/my/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);

    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "ทำรายการไม่สำเร็จ กรุณาลองใหม่");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-5">
      <p className="text-sm text-blue-900 mb-3">
        เก็บการจองนี้ไว้ในบัญชี LINE ของคุณ เพื่อกลับมาดูสถานะได้จากหน้าประวัติการจอง
      </p>
      {error && <p className="text-sm text-red-700 mb-3">{error}</p>}
      <button
        type="button"
        onClick={claim}
        disabled={busy}
        className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
      >
        {busy ? "กำลังบันทึก..." : "เก็บเข้าบัญชีของฉัน"}
      </button>
    </div>
  );
}
