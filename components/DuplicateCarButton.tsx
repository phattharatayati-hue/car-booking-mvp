"use client";

import { useState } from "react";
import { BTN } from "@/lib/ui";

/**
 * สร้างรถคันใหม่จากคันที่มีอยู่ — ใช้ตอนมีรถรุ่นเดียวกันหลายคัน
 *
 * คัดลอกรูป ยี่ห้อ แหล่งที่มา ราคาทุน และเรทราคาตามช่วงวันให้ทั้งหมด
 * เหลือให้กรอกแค่ 3 ช่องที่ต่างกันจริง ๆ คือ ทะเบียน รุ่น และราคา
 * ไม่ต้องอัปรูปใหม่ ไม่ต้องตั้งเรทใหม่ทีละช่วง
 */
export default function DuplicateCarButton({
  carId,
  brand,
  name,
  pricePerDay,
  rateCount,
  hasPhoto,
  action,
}: {
  carId: string;
  brand: string;
  name: string;
  pricePerDay: number;
  rateCount: number;
  hasPhoto: boolean;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline"
      >
        สร้างซ้ำ
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 p-5 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-semibold text-slate-900">เพิ่มรถแบบด่วน</p>
            <p className="text-sm text-slate-500 mt-1">
              คัดลอกจาก {brand} {name}
              {hasPhoto ? " · ใช้รูปเดิม" : " · คันต้นแบบยังไม่มีรูป"}
              {rateCount > 0 ? ` · คัดลอกเรทราคา ${rateCount} ช่วง` : ""}
            </p>

            <form action={action} className="mt-4 flex flex-col gap-3">
              <input type="hidden" name="sourceId" value={carId} />

              <div>
                <label
                  htmlFor={`plate-${carId}`}
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  ทะเบียน
                </label>
                <input
                  id={`plate-${carId}`}
                  name="licensePlate"
                  required
                  autoFocus
                  placeholder="เช่น 1กก 1234 เชียงใหม่"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
                <p className="text-xs text-slate-500 mt-1">
                  ทะเบียนห้ามซ้ำกับคันที่มีอยู่ — เป็นตัวแยกคันในระบบ
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`name-${carId}`}
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    รุ่น
                  </label>
                  <input
                    id={`name-${carId}`}
                    name="name"
                    required
                    defaultValue={name}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`price-${carId}`}
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    ราคา/วัน (บาท)
                  </label>
                  <input
                    id={`price-${carId}`}
                    name="pricePerDay"
                    type="number"
                    min={1}
                    required
                    defaultValue={pricePerDay}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="unavailable"
                  className="w-4 h-4 rounded border-slate-300"
                />
                สร้างแล้วปิดใช้งานไว้ก่อน (ยังไม่เปิดให้ลูกค้าจอง)
              </label>

              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => setOpen(false)} className={BTN.ghost}>
                  ยกเลิก
                </button>
                <button type="submit" className={BTN.ok}>
                  สร้างรถคันใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
