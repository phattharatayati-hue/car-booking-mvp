"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OTHER_PLACE, pointLabel, type PickupOption } from "@/lib/pickup-points";

/**
 * ให้ลูกค้าเลือกจุดรับ-ส่งหลังจองแล้ว
 * ใช้กับการจองที่มาจากแชท LINE ซึ่งยังไม่ได้เลือกจุดตอนจอง
 */
export default function PlacePicker({
  bookingId,
  points,
  currentPickup,
  currentReturn,
}: {
  bookingId: string;
  points: PickupOption[];
  currentPickup: string | null;
  currentReturn: string | null;
}) {
  const router = useRouter();
  const [pickup, setPickup] = useState(currentPickup ?? points[0]?.name ?? OTHER_PLACE);
  const [ret, setRet] = useState(currentReturn ?? points[0]?.name ?? OTHER_PLACE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/bookings/${bookingId}/places`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickupPlace: pickup, returnPlace: ret }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? `บันทึกไม่สำเร็จ (${res.status})`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  const selectClass =
    "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

  return (
    <form onSubmit={save} className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-900 mb-1">จุดรับ-ส่งรถ</h3>
      <p className="text-sm text-slate-500 mb-5">
        เลือกจุดที่สะดวก ถ้าไม่มีจุดที่ต้องการ เลือก “{OTHER_PLACE}” แล้วแอดมินจะติดต่อกลับไปนัดครับ
      </p>

      {error && (
        <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="pp">
            จุดรับรถ
          </label>
          <select
            id="pp"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            className={selectClass}
          >
            {points.map((p) => (
              <option key={p.id} value={p.name}>{pointLabel(p)}</option>
            ))}
            <option value={OTHER_PLACE}>{OTHER_PLACE}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="rp">
            จุดคืนรถ
          </label>
          <select
            id="rp"
            value={ret}
            onChange={(e) => setRet(e.target.value)}
            className={selectClass}
          >
            {points.map((p) => (
              <option key={p.id} value={p.name}>{pointLabel(p)}</option>
            ))}
            <option value={OTHER_PLACE}>{OTHER_PLACE}</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-5 w-full sm:w-auto px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold py-3 transition-colors"
      >
        {saving ? "กำลังบันทึก..." : currentPickup ? "บันทึกการเปลี่ยนแปลง" : "ยืนยันจุดรับ-ส่ง"}
      </button>
    </form>
  );
}
