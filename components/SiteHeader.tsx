"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/", label: "หน้าแรก" },
  { href: "/cars", label: "รถทั้งหมด" },
  { href: "/how-to-book", label: "คู่มือการจอง" },
  { href: "/fees", label: "ค่าปรับ" },
  { href: "/my", label: "ประวัติการจอง" },
  { href: "/line/connect", label: "เชื่อมต่อ LINE" },
  { href: "/contact", label: "ติดต่อเรา" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="h-16 flex items-center justify-between gap-4">
          {/* โลโก้ */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="w-9 h-9 rounded-xl bg-blue-600 text-white grid place-items-center shadow-sm shadow-blue-600/30">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
                <path
                  d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11m-14 0h14m-14 0a1 1 0 00-1 1v4h2m13-5a1 1 0 011 1v4h-2m0 0H7m12 0v1.5a1 1 0 01-1 1h-1a1 1 0 01-1-1V16m-9 0v1.5a1 1 0 01-1 1H6a1 1 0 01-1-1V16"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="leading-tight">
              <span className="block font-bold text-slate-900">CM Car Rent</span>
              <span className="block text-[11px] text-slate-500">เช่ารถเชียงใหม่</span>
            </span>
          </Link>

          {/* เมนูจอใหญ่ */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/login"
              className="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              สำหรับแอดมิน
            </Link>
            <Link
              href="/cars"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-600/25 transition-colors"
            >
              จองรถเลย
            </Link>
          </div>

          {/* ปุ่มเมนูมือถือ */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="เปิดเมนู"
            aria-expanded={open}
            className="md:hidden w-10 h-10 grid place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              {open ? (
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>

        {/* เมนูมือถือ */}
        {open && (
          <div className="md:hidden pb-4 flex flex-col gap-1 border-t border-slate-100 pt-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive(item.href)
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="flex gap-2 mt-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex-1 text-center px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700"
              >
                สำหรับแอดมิน
              </Link>
              <Link
                href="/cars"
                onClick={() => setOpen(false)}
                className="flex-1 text-center px-3 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold"
              >
                จองรถเลย
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
