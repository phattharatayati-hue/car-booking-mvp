"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Brand from "@/components/Brand";
import ThemeToggle from "@/components/ThemeToggle";
import LangToggle from "@/components/LangToggle";
import { PHONES, telHref } from "@/lib/contact";
import type { Dict } from "@/lib/i18n";
import type { Lang } from "@/lib/locale";

/**
 * หัวเว็บ 2 ชั้น
 *   ชั้นบน  แถบบาง — เบอร์โทร เวลาทำการ ปุ่มภาษา ปุ่มโหมดสว่าง/มืด
 *   ชั้นล่าง แถบหลัก — ตราบริษัท เมนู ปุ่มจองรถ
 *
 * บนหน้าที่มีรูปใหญ่ (hero) หัวเว็บจะลอยทับรูปแบบโปร่งใสตัวอักษรขาว
 * พอเลื่อนลงเกิน 16px จะเปลี่ยนเป็นพื้นทึบ เพื่อให้อ่านออกเมื่อทับเนื้อหา
 *
 * ใช้ fixed ไม่ใช่ sticky เพราะ sticky จะกินที่ด้านบนเสมอ
 * ทำให้รูป hero ถูกดันลงมา ทับไม่ได้จริง
 */
export default function SiteHeader({
  lang,
  t,
  hero = false,
}: {
  lang: Lang;
  t: Dict;
  hero?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll(); // เผื่อเปิดหน้ามาแล้วเบราว์เซอร์จำตำแหน่งเลื่อนไว้
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ปิดเมนูมือถือเมื่อเปลี่ยนหน้า ไม่งั้นมันค้างเปิดคาไว้
  useEffect(() => setOpen(false), [pathname]);

  // เมนูหลัก 5 รายการตามแบบที่อนุมัติ
  // "ประวัติการจอง" กับ "เชื่อมต่อ LINE" ย้ายไปแถบบนและเมนูมือถือ
  // เพราะเป็นเมนูที่ลูกค้าเก่าใช้ ไม่ใช่ทางเข้าหลักของคนที่เพิ่งเข้าเว็บ
  const NAV = [
    { href: "/", label: t.nav.home },
    { href: "/cars", label: t.nav.cars },
    { href: "/how-to-book", label: t.nav.howTo },
    { href: "/fees", label: t.nav.fees },
    { href: "/contact", label: t.nav.contact },
  ];

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  /** ลอยทับรูปอยู่ — ยังไม่เลื่อนลงและไม่ได้เปิดเมนูมือถือ */
  const over = hero && !scrolled && !open;

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${
        over
          ? "bg-transparent"
          : "bg-surface/90 backdrop-blur-md border-b border-slate-200"
      }`}
    >
      {/* ---------- ชั้นบน: แถบบาง ---------- */}
      <div
        className={`hidden md:block border-b transition-colors ${
          over ? "border-white/15" : "border-slate-100"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-9 flex items-center justify-between gap-4 text-xs">
          {/* เบอร์แรกอยู่ซ้าย เบอร์ที่สองอยู่ท้ายเว็บ ไม่ต้องยัดสองเบอร์ในแถบบาง */}
          <a
            href={telHref(PHONES[0] ?? "")}
            className={`flex items-center gap-1.5 shrink-0 transition-colors ${
              over
                ? "text-white/75 hover:text-white"
                : "text-slate-500 hover:text-blue-700"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
              <path
                d="M3 5.5A2.5 2.5 0 015.5 3h1.6a1 1 0 01.96.73l.9 3.1a1 1 0 01-.28 1L7.4 9.1a12 12 0 007.5 7.5l1.27-1.28a1 1 0 011-.27l3.1.9a1 1 0 01.73.96v1.6a2.5 2.5 0 01-2.5 2.5A16.5 16.5 0 013 5.5z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {PHONES[0]}
          </a>

          {/* จุดขายกลางแถบ — ซ่อนบนจอแคบเพราะจะเบียดเบอร์โทร */}
          <span
            className={`hidden lg:flex items-center gap-2 ${
              over ? "text-white/80" : "text-slate-600"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-amber-500">
              <path
                d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11m-14 0h14m-14 0a1 1 0 00-1 1v4h2m13-5a1 1 0 011 1v4h-2m0 0H7"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t.nav.freeDelivery}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <LangToggle lang={lang} />
            <ThemeToggle lang={lang} />
            <Link
              href="/my"
              className={`ml-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                over
                  ? "text-white/75 hover:text-white"
                  : "text-slate-500 hover:text-blue-700"
              }`}
            >
              {t.nav.my}
            </Link>
            <Link
              href="/login"
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                over
                  ? "text-white/75 hover:text-white"
                  : "text-slate-500 hover:text-blue-700"
              }`}
            >
              {t.nav.admin}
            </Link>
          </div>
        </div>
      </div>

      {/* ---------- ชั้นล่าง: แถบหลัก ---------- */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="h-16 flex items-center justify-between gap-4">
          <Brand href="/" size="md" tone={over ? "white" : "navy"} />

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? over
                      ? "bg-white/15 text-white"
                      : "bg-blue-50 text-blue-700"
                    : over
                    ? "text-white/85 hover:text-white hover:bg-white/10"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {/* เบอร์โทรจองรถ — ลูกค้าหลายคนโทรมากกว่าจองเอง จึงต้องเห็นชัด */}
            <a href={telHref(PHONES[0] ?? "")} className="text-right leading-tight">
              <span
                className={`block text-[10px] ${
                  over ? "text-white/65" : "text-slate-500"
                }`}
              >
                {t.nav.callToBook}
              </span>
              <span
                className={`block text-sm font-bold font-mono tracking-tight ${
                  over ? "text-white" : "text-blue-700"
                }`}
              >
                {PHONES[0]}
              </span>
            </a>
            <Link
              href="/cars"
              className="px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-sm transition-colors"
            >
              {t.nav.bookNow}
            </Link>
          </div>

          {/* ปุ่มเมนูมือถือ + ปุ่มโหมดมืด (ภาษาอยู่ในเมนู) */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle lang={lang} />
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={t.nav.openMenu}
              aria-expanded={open}
              className={`w-10 h-10 grid place-items-center rounded-lg border transition-colors ${
                over
                  ? "border-white/25 text-white hover:bg-white/10"
                  : "border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
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
        </div>

        {/* ---------- เมนูมือถือ ---------- */}
        {open && (
          <div className="md:hidden pb-4 flex flex-col gap-1 border-t border-slate-100 pt-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive(item.href)
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            ))}

            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100">
              <LangToggle lang={lang} />
              {PHONES[0] && (
                <a
                  href={telHref(PHONES[0])}
                  className="text-xs font-medium text-slate-500"
                >
                  {t.footer.call} {PHONES[0]}
                </a>
              )}
            </div>

            <Link
              href="/my"
              className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {t.nav.my}
            </Link>
            <Link
              href="/line/connect"
              className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {t.nav.line}
            </Link>

            <div className="flex gap-2 mt-2">
              <Link
                href="/login"
                className="flex-1 text-center px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700"
              >
                {t.nav.admin}
              </Link>
              <Link
                href="/cars"
                className="flex-1 text-center px-3 py-2.5 rounded-lg bg-amber-500 text-white text-sm font-bold"
              >
                {t.nav.bookNow}
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
