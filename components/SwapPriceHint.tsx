"use client";

import { useEffect, useState } from "react";

/**
 * บอกราคาที่ระบบคำนวณได้ของ "รถคันใหม่" ตอนแอดมินเลือกสลับรถ
 *
 * ที่ต้องมี: ช่องยอดค่าเช่าเติมราคาเดิมไว้ให้ ซึ่งถูกแล้วสำหรับกรณีปกติ
 * (เปลี่ยนเพราะรถเข้าเช็คระยะ ไม่ควรให้ลูกค้ารับภาระ) แต่ถ้าสลับไปคันที่ถูกกว่า
 * แอดมินต้องนั่งคิดเองว่าควรลดเหลือเท่าไร ระหว่างที่คุยโทรศัพท์กับลูกค้าอยู่
 *
 * ตัวเลขมาจาก data-suggest ที่ฝั่งเซิร์ฟเวอร์คำนวณไว้แล้วด้วย quoteBooking()
 * ตัวเดียวกับตอนลูกค้าจอง จึงรวมค่าธรรมเนียมนอกเวลาให้เรียบร้อย
 */
export default function SwapPriceHint({
  selectId,
  priceId,
  currentPrice,
}: {
  selectId: string;
  priceId: string;
  currentPrice: number;
}) {
  const [suggest, setSuggest] = useState<number | null>(null);

  useEffect(() => {
    const sel = document.getElementById(selectId) as HTMLSelectElement | null;
    if (!sel) return;

    const update = () => {
      const opt = sel.selectedOptions[0];
      const raw = opt?.dataset.suggest;
      const n = raw ? Number(raw) : NaN;
      setSuggest(Number.isFinite(n) ? n : null);
    };

    update();
    sel.addEventListener("change", update);
    return () => sel.removeEventListener("change", update);
  }, [selectId]);

  if (suggest === null) return null;

  const diff = suggest - currentPrice;

  function apply() {
    const input = document.getElementById(priceId) as HTMLInputElement | null;
    if (!input || suggest === null) return;
    input.value = String(suggest);
    // ให้ React/ฟอร์มรู้ว่าค่าเปลี่ยน ไม่งั้นบางเบราว์เซอร์ไม่เห็นค่าใหม่
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  }

  return (
    <p className="text-xs mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-slate-500">
        ราคาตามรถคันใหม่:{" "}
        <strong className="text-slate-700">{suggest.toLocaleString()} ฿</strong>
        {diff !== 0 && (
          <span className={diff < 0 ? "text-emerald-600" : "text-amber-600"}>
            {" "}
            ({diff < 0 ? "ถูกลง" : "แพงขึ้น"} {Math.abs(diff).toLocaleString()} ฿)
          </span>
        )}
      </span>
      {diff !== 0 && (
        <button
          type="button"
          onClick={apply}
          className="underline font-medium text-blue-600 hover:text-blue-700"
        >
          ใช้ราคานี้
        </button>
      )}
    </p>
  );
}
