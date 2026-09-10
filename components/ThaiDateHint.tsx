"use client";

import { useEffect, useState } from "react";

const TH_MONTH = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
const TH_DAY = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

/**
 * แปลงค่าใน input[type=date] เป็นวันแบบไทยกำกับไว้ใต้ช่อง
 *
 * เบราว์เซอร์เป็นคนกำหนดรูปแบบที่แสดงในช่องวันที่เอง แก้ไม่ได้ด้วย CSS หรือ JS
 * บนเครื่องที่ตั้งภาษาอังกฤษจะขึ้นเป็น MM/DD/YYYY เช่น "09/12/2026"
 * ซึ่งคนไทยอ่านเป็น 9 ธันวาคม ได้ง่าย ๆ ทั้งที่จริงคือ 12 กันยายน
 * มอบหมายงานผิดวันแล้วรถไม่ไปถึงลูกค้า จึงต้องมีตัวกำกับเป็นภาษาไทยเสมอ
 *
 * อ่านค่าจากช่องจริงและตามการแก้ไขแบบสด ๆ ไม่ได้รับค่ามาเป็น prop ตายตัว
 */
export default function ThaiDateHint({ inputId }: { inputId: string }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const el = document.getElementById(inputId) as HTMLInputElement | null;
    if (!el) return;

    const update = () => {
      const v = el.value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        setText(null);
        return;
      }
      const [y, m, d] = v.split("-").map(Number);
      const weekday = TH_DAY[new Date(y, m - 1, d).getDay()];
      setText(`${d} ${TH_MONTH[m - 1]} ${y + 543} (${weekday})`);
    };

    update();
    el.addEventListener("change", update);
    el.addEventListener("input", update);
    return () => {
      el.removeEventListener("change", update);
      el.removeEventListener("input", update);
    };
  }, [inputId]);

  if (!text) return null;

  return (
    <p className="text-[11px] font-medium text-blue-700 mt-1" aria-live="polite">
      {text}
    </p>
  );
}
