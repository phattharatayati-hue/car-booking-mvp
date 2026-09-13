"use client";

import { useState } from "react";
import { BTN } from "@/lib/ui";

type Car = {
  id: string;
  brand: string;
  name: string;
  licensePlate: string;
  pricePerDay: number;
};

const field =
  "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";
const label = "block text-sm font-medium text-slate-700 mb-1";

/**
 * ฟอร์มกรอกใบจองฝั่งแอดมิน
 *
 * เป็น client component เพราะต้องคำนวณจำนวนวันและยอดประมาณการให้เห็นทันทีระหว่างกรอก
 * แต่การบันทึกจริงเป็น server action — ยอดที่ส่งไปเป็นแค่ "ราคาที่ตกลง" ถ้าแอดมินพิมพ์ทับ
 * ถ้าเว้นว่างเซิร์ฟเวอร์จะคิดให้เองจากราคาจริงของรถคันนั้น
 */
export default function AdminBookingForm({
  cars,
  points,
  bookingFee,
  action,
}: {
  cars: Car[];
  points: { name: string; fee: number }[];
  bookingFee: number;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [carId, setCarId] = useState(cars[0]?.id ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const car = cars.find((c) => c.id === carId);

  const days =
    startDate && endDate
      ? Math.max(
          1,
          Math.round(
            (new Date(`${endDate}T00:00:00+07:00`).getTime() -
              new Date(`${startDate}T00:00:00+07:00`).getTime()) /
              86400000
          )
        )
      : 0;

  const estimate = car && days > 0 ? car.pricePerDay * days : 0;

  return (
    <form action={action} className="flex flex-col gap-5">
      <section className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4">
        <p className="font-semibold text-slate-900">รถและช่วงเวลา</p>

        <div>
          <label className={label} htmlFor="carId">
            รถ
          </label>
          <select
            id="carId"
            name="carId"
            required
            value={carId}
            onChange={(e) => setCarId(e.target.value)}
            className={field}
          >
            {cars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.brand} {c.name} · {c.licensePlate} · {c.pricePerDay.toLocaleString()} ฿/วัน
              </option>
            ))}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="startDate">
              วันรับรถ
            </label>
            <input
              id="startDate"
              type="date"
              name="startDate"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={field}
            />
          </div>
          <div>
            <label className={label} htmlFor="startTime">
              เวลารับรถ
            </label>
            <input id="startTime" type="time" name="startTime" defaultValue="09:00" className={field} />
          </div>
          <div>
            <label className={label} htmlFor="endDate">
              วันคืนรถ
            </label>
            <input
              id="endDate"
              type="date"
              name="endDate"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={field}
            />
          </div>
          <div>
            <label className={label} htmlFor="endTime">
              เวลาคืนรถ
            </label>
            <input id="endTime" type="time" name="endTime" defaultValue="09:00" className={field} />
          </div>
        </div>

        {days > 0 && car && (
          <p className="text-sm text-slate-600">
            {days} วัน · ราคาปกติของคันนี้ประมาณ{" "}
            <b className="text-slate-900">{estimate.toLocaleString()} บาท</b>{" "}
            <span className="text-slate-400">
              (ยังไม่รวมค่าบริการนอกเวลาและราคาช่วงพิเศษ — ระบบคิดให้ตอนบันทึก)
            </span>
          </p>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4">
        <p className="font-semibold text-slate-900">ลูกค้า</p>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="fullName">
              ชื่อผู้เช่า
            </label>
            <input id="fullName" name="fullName" required className={field} />
          </div>
          <div>
            <label className={label} htmlFor="phone">
              เบอร์โทร
            </label>
            <input
              id="phone"
              name="phone"
              required
              inputMode="tel"
              placeholder="0812345678"
              className={field}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="pickupPlace">
              จุดรับรถ
            </label>
            <select id="pickupPlace" name="pickupPlace" className={field}>
              {points.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                  {p.fee > 0 ? ` (+${p.fee.toLocaleString()} ฿)` : " (ฟรี)"}
                </option>
              ))}
              <option value="">อื่นๆ — นัดกันภายหลัง</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="returnPlace">
              จุดคืนรถ
            </label>
            <select id="returnPlace" name="returnPlace" className={field}>
              {points.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                  {p.fee > 0 ? ` (+${p.fee.toLocaleString()} ฿)` : " (ฟรี)"}
                </option>
              ))}
              <option value="">อื่นๆ — นัดกันภายหลัง</option>
            </select>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4">
        <p className="font-semibold text-slate-900">เงินและบันทึก</p>

        <div>
          <label className={label} htmlFor="priceOverride">
            ยอดรวมที่ตกลงกัน (บาท) — เว้นว่างให้ระบบคิดเอง
          </label>
          <input
            id="priceOverride"
            name="priceOverride"
            type="number"
            min={0}
            step={1}
            placeholder={estimate > 0 ? String(estimate) : "ระบบคิดให้"}
            className={field}
          />
          <p className="text-xs text-slate-500 mt-1">
            ใส่เฉพาะกรณีตกลงราคาพิเศษกับลูกค้าไว้แล้ว · เว้นว่างระบบจะคิดตามราคาจริงของรถ
            รวมค่าบริการนอกเวลาและราคาช่วงพิเศษให้
          </p>
        </div>

        <label className="flex items-start gap-2.5 text-sm text-slate-700">
          <input type="checkbox" name="markConfirmed" className="w-4 h-4 mt-0.5 rounded border-slate-300" />
          <span>
            เก็บค่าจอง {bookingFee.toLocaleString()} บาทแล้ว — สร้างเป็น{" "}
            <b>ยืนยันแล้ว</b> ทันที
            <span className="block text-xs text-slate-500 mt-0.5">
              ไม่ติ๊ก = เป็น &ldquo;รอโอนค่าจอง&rdquo; ตามคิวปกติ แต่ไม่มีนับถอยหลังยกเลิกอัตโนมัติ
            </span>
          </span>
        </label>

        <div>
          <label className={label} htmlFor="adminNote">
            บันทึกภายใน
          </label>
          <textarea
            id="adminNote"
            name="adminNote"
            rows={3}
            placeholder="เช่น จองทาง Facebook · ตกลงราคา 3,000 · เบอร์สำรอง 08x-xxx-xxxx"
            className={field}
          />
          <p className="text-xs text-slate-500 mt-1">
            ลูกค้าไม่เห็นข้อความนี้ — เห็นเฉพาะแอดมินในการ์ดใบจอง
          </p>
        </div>
      </section>

      <button type="submit" className={BTN.ok}>
        สร้างใบจอง
      </button>
    </form>
  );
}
