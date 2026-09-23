"use client";

import { useMemo } from "react";
import {
  DISTRICTS,
  OTHER_PROVINCE,
  SERVICE_PROVINCES,
  isServiceProvince,
} from "@/lib/th-areas";
import { MAX_TRIP_PLANS, type TripPlaceView, type TripPlanInput } from "@/lib/trip-plans";

/** แถวในฟอร์ม — mode บอกว่าเลือกจากรายการ หรือกรอกเอง */
export type TripRow = {
  key: string;
  mode: "place" | "custom";
  placeId: string;
  province: string;
  otherProvince: string;
  district: string;
  placeName: string;
};

let seq = 0;
export function emptyTripRow(): TripRow {
  seq += 1;
  return {
    key: `r${Date.now()}-${seq}`,
    mode: "place",
    placeId: "",
    province: "",
    otherProvince: "",
    district: "",
    placeName: "",
  };
}

/** แปลงแพลนที่บันทึกไว้กลับเป็นแถวในฟอร์ม (ใช้ตอนแก้ไข) */
export function rowsFromPlans(
  plans: { placeId: string | null; province: string; district: string; placeName: string }[]
): TripRow[] {
  if (plans.length === 0) return [emptyTripRow()];
  return plans.map((p) => {
    const row = emptyTripRow();
    if (p.placeId) return { ...row, mode: "place", placeId: p.placeId };
    const inArea = isServiceProvince(p.province);
    return {
      ...row,
      mode: "custom",
      province: inArea ? p.province : OTHER_PROVINCE,
      otherProvince: inArea || p.province === OTHER_PROVINCE ? "" : p.province,
      district: p.district,
      placeName: p.placeName,
    };
  });
}

/** แถวที่กรอกครบแล้วเท่านั้น → รูปแบบที่ API รับ */
export function rowsToInputs(rows: TripRow[]): TripPlanInput[] {
  const out: TripPlanInput[] = [];
  for (const r of rows) {
    if (r.mode === "place") {
      if (r.placeId) out.push({ placeId: r.placeId });
      continue;
    }
    const province =
      r.province === OTHER_PROVINCE ? r.otherProvince.trim() || OTHER_PROVINCE : r.province;
    if (province && r.district.trim() && r.placeName.trim()) {
      out.push({ province, district: r.district.trim(), placeName: r.placeName.trim() });
    }
  }
  return out;
}

/** สถานที่ชันมากที่เลือกไว้ (ใช้กับรถที่ห้ามขึ้น) */
export function steepNamesIn(rows: TripRow[], places: TripPlaceView[]): string[] {
  return rows
    .filter((r) => r.mode === "place" && r.placeId)
    .map((r) => places.find((p) => p.id === r.placeId))
    .filter((p): p is TripPlaceView => Boolean(p?.steep))
    .map((p) => p.name);
}

/** ข้อความปัญหาแรกที่เจอ หรือ null ถ้าครบ */
export function tripRowsProblem(rows: TripRow[]): string | null {
  if (rows.length === 0) return "กรุณากรอกแผนการเดินทางอย่างน้อย 1 แห่ง";
  for (const [i, r] of rows.entries()) {
    const n = i + 1;
    if (r.mode === "place" && !r.placeId) return `แผนที่ ${n}: กรุณาเลือกสถานที่`;
    if (r.mode === "custom") {
      if (!r.province) return `แผนที่ ${n}: กรุณาเลือกจังหวัด`;
      if (r.province === OTHER_PROVINCE && !r.otherProvince.trim())
        return `แผนที่ ${n}: กรุณาพิมพ์ชื่อจังหวัด`;
      if (!r.district.trim()) return `แผนที่ ${n}: กรุณาระบุอำเภอ`;
      if (!r.placeName.trim()) return `แผนที่ ${n}: กรุณาพิมพ์ชื่อสถานที่`;
    }
  }
  return null;
}

export function rowsOutsideArea(rows: TripRow[]): boolean {
  return rows.some((r) => r.mode === "custom" && r.province === OTHER_PROVINCE);
}

const OTHER_OPTION = "__other__";

export default function TripPlanEditor({
  rows,
  onChange,
  places,
  noSteep = false,
  steepPenalty = 1000,
  inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm",
  labelClass = "block text-xs font-medium text-slate-500 mb-1",
}: {
  rows: TripRow[];
  onChange: (rows: TripRow[]) => void;
  places: TripPlaceView[];
  /** รถคันนี้ห้ามขึ้นเส้นทางชันมาก */
  noSteep?: boolean;
  steepPenalty?: number;
  inputClass?: string;
  labelClass?: string;
}) {
  // จัดกลุ่มสถานที่ตามจังหวัด ให้เลื่อนหาง่าย
  const grouped = useMemo(() => {
    const m = new Map<string, TripPlaceView[]>();
    for (const p of places) {
      const list = m.get(p.province) ?? [];
      list.push(p);
      m.set(p.province, list);
    }
    return [...m.entries()];
  }, [places]);

  function update(key: string, patch: Partial<TripRow>) {
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  const outside = rowsOutsideArea(rows);

  return (
    <div className="flex flex-col gap-3">
      {rows.map((r, i) => (
        <div key={r.key} className="rounded-xl border border-slate-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600">แผนที่ {i + 1}</span>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(rows.filter((x) => x.key !== r.key))}
                className="text-xs font-medium text-red-600 hover:underline"
              >
                ลบ
              </button>
            )}
          </div>

          <label className={labelClass} htmlFor={`tp-${r.key}`}>
            สถานที่
          </label>
          <select
            id={`tp-${r.key}`}
            value={r.mode === "custom" ? OTHER_OPTION : r.placeId}
            onChange={(e) => {
              const v = e.target.value;
              if (v === OTHER_OPTION) update(r.key, { mode: "custom", placeId: "" });
              else update(r.key, { mode: "place", placeId: v });
            }}
            className={inputClass}
          >
            <option value="" disabled>
              — เลือกสถานที่ที่จะไป —
            </option>
            {grouped.map(([prov, list]) => (
              <optgroup key={prov} label={prov}>
                {list.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.district})
                  </option>
                ))}
              </optgroup>
            ))}
            <option value={OTHER_OPTION}>อื่นๆ — ระบุเอง</option>
          </select>

          {(() => {
            const chosen = r.mode === "place" ? places.find((p) => p.id === r.placeId) : null;
            return noSteep && chosen?.steep ? (
              <p className="mt-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 leading-relaxed">
                ⛔ รถคันนี้ห้ามขึ้น {chosen.name} เพราะเป็นเส้นทางชันมาก — หากต้องการไป
                กรุณาเลือกรถคันอื่น · หากนำรถไปเส้นทางนี้ มีค่าปรับ {steepPenalty.toLocaleString()} บาท
              </p>
            ) : null;
          })()}

          {(() => {
            const tip =
              r.mode === "place" ? places.find((p) => p.id === r.placeId)?.drivingTip : null;
            return tip ? (
              <p className="mt-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed whitespace-pre-line">
                <b>คำแนะนำการขับ:</b> {tip}
              </p>
            ) : null;
          })()}

          {r.mode === "custom" && (
            <div className="grid sm:grid-cols-3 gap-2 mt-2">
              <div>
                <label className={labelClass}>จังหวัด</label>
                <select
                  value={r.province}
                  onChange={(e) => update(r.key, { province: e.target.value, district: "" })}
                  className={inputClass}
                >
                  <option value="" disabled>
                    — เลือกจังหวัด —
                  </option>
                  {SERVICE_PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value={OTHER_PROVINCE}>จังหวัดอื่นๆ</option>
                </select>
                {r.province === OTHER_PROVINCE && (
                  <input
                    value={r.otherProvince}
                    onChange={(e) => update(r.key, { otherProvince: e.target.value })}
                    placeholder="พิมพ์ชื่อจังหวัด"
                    maxLength={60}
                    className={`${inputClass} mt-2`}
                  />
                )}
              </div>
              <div>
                <label className={labelClass}>อำเภอ</label>
                {isServiceProvince(r.province) ? (
                  <select
                    value={r.district}
                    onChange={(e) => update(r.key, { district: e.target.value })}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      — เลือกอำเภอ —
                    </option>
                    {DISTRICTS[r.province].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={r.district}
                    onChange={(e) => update(r.key, { district: e.target.value })}
                    placeholder={r.province ? "พิมพ์ชื่ออำเภอ" : "เลือกจังหวัดก่อน"}
                    disabled={!r.province}
                    maxLength={60}
                    className={inputClass}
                  />
                )}
              </div>
              <div>
                <label className={labelClass}>ชื่อสถานที่</label>
                <input
                  value={r.placeName}
                  onChange={(e) => update(r.key, { placeName: e.target.value })}
                  placeholder="เช่น วัด คาเฟ่ น้ำตก"
                  maxLength={120}
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>
      ))}

      {rows.length < MAX_TRIP_PLANS && (
        <button
          type="button"
          onClick={() => onChange([...rows, emptyTripRow()])}
          className="self-start text-sm font-medium text-blue-700 hover:underline"
        >
          + เพิ่มสถานที่
        </button>
      )}

      {outside && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 leading-relaxed">
          มีเส้นทางนอกพื้นที่ปกติ (เชียงใหม่ ลำพูน ลำปาง) — จองต่อได้เลย
          แอดมินจะติดต่อกลับเพื่อยืนยันเงื่อนไขและค่าใช้จ่ายครับ
        </p>
      )}
    </div>
  );
}
