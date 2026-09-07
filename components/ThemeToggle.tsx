"use client";

import { useEffect, useState } from "react";
import { THEME_KEY, type ThemeChoice } from "@/lib/theme";

/**
 * ปุ่มสลับโหมดสว่าง/มืด — สองค่าเท่านั้น กดสลับไปมา
 *
 * ไอคอนแสดง "โหมดที่จะได้ถ้ากด" ไม่ใช่โหมดปัจจุบัน
 *   อยู่โหมดสว่าง → ขึ้นรูปพระจันทร์ (กดแล้วมืด)
 *   อยู่โหมดมืด  → ขึ้นรูปดวงอาทิตย์ (กดแล้วสว่าง)
 * แบบนี้ผู้ใช้เดาผลของการกดได้ทันทีโดยไม่ต้องลอง
 *
 * ค่าเริ่มต้นอ่านจาก attribute ที่ THEME_INIT_SCRIPT ใส่ไว้บน <html>
 * จึงไม่มีจังหวะที่ปุ่มแสดงไอคอนผิดตอนโหลดหน้า
 */
const LABEL: Record<ThemeChoice, { th: string; en: string }> = {
  light: { th: "เปลี่ยนเป็นโหมดมืด", en: "Switch to dark mode" },
  dark: { th: "เปลี่ยนเป็นโหมดสว่าง", en: "Switch to light mode" },
};

export default function ThemeToggle({ lang = "th" }: { lang?: "th" | "en" }) {
  const [theme, setTheme] = useState<ThemeChoice>("light");

  useEffect(() => {
    const v = document.documentElement.getAttribute("data-theme");
    if (v === "dark") setTheme("dark");
  }, []);

  function toggle() {
    const next: ThemeChoice = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // เบราว์เซอร์บล็อกที่เก็บข้อมูล (โหมดส่วนตัว) — เปลี่ยนสีได้แต่ไม่จำค่า
    }
  }

  const label = LABEL[theme][lang];

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className="w-9 h-9 grid place-items-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
    >
      <svg viewBox="0 0 24 24" fill="none" className="w-[18px] h-[18px]">
        {theme === "dark" ? (
          <>
            <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.7" />
            <path
              d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </>
        ) : (
          <path
            d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </button>
  );
}
