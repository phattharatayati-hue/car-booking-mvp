"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LANG_COOKIE, type Lang } from "@/lib/locale";

/**
 * ปุ่มสลับภาษา ไทย / EN
 *
 * เขียนคุกกี้ฝั่งเบราว์เซอร์แล้วสั่ง refresh()
 * หน้าเป็น server component จึงถูกวาดใหม่ด้วยภาษาใหม่ทั้งหน้าในครั้งเดียว
 */
export default function LangToggle({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pick(next: Lang) {
    if (next === lang) return;
    // 1 ปี · path=/ ให้ใช้ได้ทุกหน้า · SameSite=Lax พอสำหรับความชอบภาษา
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="group"
      aria-label={lang === "th" ? "เลือกภาษา" : "Choose language"}
      aria-busy={pending}
      className="flex items-center rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold"
    >
      {(["th", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => pick(code)}
          aria-pressed={lang === code}
          className={`px-2.5 py-1.5 transition-colors ${
            lang === code
              ? "bg-blue-600 text-white"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          {code === "th" ? "ไทย" : "EN"}
        </button>
      ))}
    </div>
  );
}
