"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * รีเฟรชข้อมูลในหน้าเองทุก ๆ กี่วินาที โดยไม่โหลดหน้าใหม่ทั้งหน้า
 *
 * หน้าตารางงานมักถูกเปิดค้างไว้บนจอหน้าร้านทั้งวัน
 * ถ้าไม่รีเฟรชเอง คนดูจะเห็นคิวเก่าค้างโดยไม่รู้ตัว
 *
 * หยุดรีเฟรชตอนแท็บไม่ได้อยู่หน้าจอ จะได้ไม่ยิงถี่ ๆ ทิ้งเปล่า
 */
export default function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  const [on, setOn] = useState(true);
  const [last, setLast] = useState<string>("");

  useEffect(() => {
    if (!on) return;
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      setLast(
        new Date().toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Bangkok",
        })
      );
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [on, seconds, router]);

  return (
    <label className="no-print inline-flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => setOn(e.target.checked)}
        className="rounded border-slate-300"
      />
      อัปเดตเองทุก {seconds} วินาที
      {last && <span className="text-slate-400">· ล่าสุด {last} น.</span>}
    </label>
  );
}
