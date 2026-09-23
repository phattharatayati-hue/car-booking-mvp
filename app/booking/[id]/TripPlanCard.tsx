"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TripPlanForm from "@/components/TripPlanForm";
import { tripPlanLabel, type TripPlaceView } from "@/lib/trip-plans";

type Plan = {
  placeId: string | null;
  province: string;
  district: string;
  placeName: string;
  outsideArea: boolean;
};

/** แผนเดินทางในหน้าติดตามการจอง — ดูได้เสมอ แก้ได้จนถึงเวลารับรถ */
export default function TripPlanCard({
  bookingId,
  plans,
  places,
  editable,
}: {
  bookingId: string;
  plans: Plan[];
  places: TripPlaceView[];
  editable: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(plans.length === 0 && editable);

  return (
    <div id="trip" className="mb-5 scroll-mt-28 bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-slate-900">แผนการเดินทาง</h3>
        {editable && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm font-medium text-blue-700 hover:underline"
          >
            แก้ไข
          </button>
        )}
      </div>

      {editing ? (
        <TripPlanForm
          bookingId={bookingId}
          plans={plans}
          places={places}
          apiUrl={`/api/bookings/${bookingId}/trip-plans`}
          onSaved={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      ) : plans.length > 0 ? (
        <ul className="flex flex-col gap-1.5 text-sm text-slate-700">
          {plans.map((p, i) => (
            <li key={i}>
              {i + 1}. {tripPlanLabel(p)}
              {p.outsideArea && (
                <span className="ml-1.5 text-xs text-amber-700">(นอกพื้นที่ — แอดมินจะติดต่อกลับ)</span>
              )}
              {(() => {
                const tip = p.placeId ? places.find((x) => x.id === p.placeId)?.drivingTip : null;
                return tip ? (
                  <span className="block mt-1 ml-4 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 whitespace-pre-line">
                    คำแนะนำการขับ: {tip}
                  </span>
                ) : null;
              })()}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">ยังไม่ได้กรอกแผนการเดินทาง</p>
      )}
    </div>
  );
}
