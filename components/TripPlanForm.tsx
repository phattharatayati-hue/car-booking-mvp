"use client";

import { useState } from "react";
import TripPlanEditor, {
  rowsFromPlans,
  rowsToInputs,
  tripRowsProblem,
  type TripRow,
} from "@/components/TripPlanEditor";
import type { TripPlaceView } from "@/lib/trip-plans";

type SavedPlan = { placeId: string | null; province: string; district: string; placeName: string };

/**
 * ฟอร์มแก้แผนเดินทางของใบจองที่มีอยู่แล้ว
 * mode "action" = ส่งเข้า server action (หลังบ้าน) · mode "api" = ยิง API (หน้าลูกค้า)
 */
export default function TripPlanForm({
  bookingId,
  plans,
  places,
  action,
  apiUrl,
  submitText = "บันทึกแผนเดินทาง",
  onSaved,
}: {
  bookingId: string;
  plans: SavedPlan[];
  places: TripPlaceView[];
  action?: (formData: FormData) => void | Promise<void>;
  apiUrl?: string;
  submitText?: string;
  onSaved?: () => void;
}) {
  const [rows, setRows] = useState<TripRow[]>(() => rowsFromPlans(plans));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function save() {
    setError(null);
    setDone(false);
    const problem = tripRowsProblem(rows);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    try {
      const payload = JSON.stringify(rowsToInputs(rows));
      if (action) {
        const fd = new FormData();
        fd.append("bookingId", bookingId);
        fd.append("tripPlans", payload);
        await action(fd);
      } else if (apiUrl) {
        const res = await fetch(apiUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tripPlans: JSON.parse(payload) }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) throw new Error(data?.error ?? `บันทึกไม่สำเร็จ (${res.status})`);
      }
      setDone(true);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <TripPlanEditor rows={rows} onChange={setRows} places={places} />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {busy ? "กำลังบันทึก…" : submitText}
        </button>
        {done && <span className="text-xs text-emerald-700">บันทึกแล้ว</span>}
      </div>
    </div>
  );
}
