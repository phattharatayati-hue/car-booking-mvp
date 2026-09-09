"use client";

import { useEffect, useState } from "react";
import { remember } from "@/lib/device-bookings";

/**
 * กล่องบนสุดของหน้าสถานะการจอง — ทำสองหน้าที่
 *
 *   1. จำการจองนี้ไว้ในเครื่อง (localStorage) ทันทีที่เปิดหน้า
 *      คนที่จองโดยไม่เข้าสู่ระบบจะกลับมาหาได้จากหน้า /my แม้ปิดแท็บไปแล้ว
 *   2. ให้ทางเก็บลิงก์ — คัดลอก หรือส่งเข้าแชท LINE ของตัวเอง
 *
 * ทำไมใช้ localStorage ไม่ใช่คุกกี้
 *   เบราว์เซอร์สมัยใหม่บังคับให้คุกกี้หมดอายุภายใน 400 วัน
 *   ส่วน localStorage อยู่จนกว่าผู้ใช้จะล้างเอง ซึ่งตรงกับที่ต้องการ
 */
export default function BookingHandoff({
  bookingId,
  code,
  carLabel,
  bookingUrl,
  showSaveHint,
}: {
  bookingId: string;
  code: string;
  carLabel: string;
  bookingUrl: string;
  /** ซ่อนคำชวนบันทึกลิงก์เมื่อลูกค้าเก็บการจองเข้าบัญชีแล้ว */
  showSaveHint: boolean;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    remember({ id: bookingId, code, carLabel });
  }, [bookingId, code, carLabel]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(bookingUrl);
    } catch {
      // เบราว์เซอร์บล็อกคลิปบอร์ด (มักเป็นหน้าที่ไม่ใช่ https) — เลือกข้อความให้แทน
      const box = document.getElementById("booking-url") as HTMLInputElement | null;
      box?.select();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (!showSaveHint) return null;

  return (
    <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <p className="font-semibold text-amber-900 text-sm mb-1">
        เก็บลิงก์นี้ไว้ก่อนปิดหน้า
      </p>
      <p className="text-xs text-amber-900/85 leading-relaxed mb-3">
        ลิงก์นี้คือทางเข้าเดียวที่จะกลับมาแนบสลิป ส่งเอกสาร และดูสถานะการจอง
        เราจำไว้ในเครื่องนี้ให้แล้ว แต่ถ้าเปลี่ยนเครื่องหรือล้างข้อมูลเบราว์เซอร์จะหาย
      </p>

      <div className="flex gap-2 mb-3">
        <input
          id="booking-url"
          readOnly
          value={bookingUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 min-w-0 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-slate-700 font-mono"
        />
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 transition-colors"
        >
          {copied ? "คัดลอกแล้ว" : "คัดลอก"}
        </button>
      </div>

      {/* ชี้ไปที่ปุ่มเข้าสู่ระบบซึ่งอยู่ถัดลงไป — ทางที่ดีกว่าการเก็บลิงก์ */}
      <p className="text-xs text-amber-900/85 leading-relaxed">
        <span className="font-semibold">ไม่อยากเก็บลิงก์?</span>{" "}
        เข้าสู่ระบบด้วย LINE ที่ปุ่มด้านล่าง แล้วการจองนี้จะอยู่ในบัญชีของคุณถาวร
        เปิดจากเครื่องไหนก็เจอ และได้รับแจ้งเตือนทุกครั้งที่สถานะเปลี่ยน
      </p>

    </div>
  );
}
