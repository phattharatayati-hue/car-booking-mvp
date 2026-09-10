"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Brand from "@/components/Brand";
import ThemeToggle from "@/components/ThemeToggle";
import AccountMenu from "@/components/AccountMenu";
import { PHONES, telHref } from "@/lib/contact";

/**
 * หัวเว็บ 2 ชั้น
 *   ชั้นบน  แถบบาง — เบอร์โทร เวลาทำการ ปุ่มโหมดสว่าง/มืด
 *   ชั้นล่าง แถบหลัก — ตราบริษัท เมนู ปุ่มจองรถ
 *
 * บนหน้าที่มีรูปใหญ่ (hero) หัวเว็บจะลอยทับรูปแบบโปร่งใสตัวอักษรขาว
 * พอเลื่อนลงเกิน 16px จะเปลี่ยนเป็นพื้นทึบ เพื่อให้อ่านออกเมื่อทับเนื้อหา
 *
 * ใช้ fixed ไม่ใช่ sticky เพราะ sticky จะกินที่ด้านบนเสมอ
 * ทำให้รูป hero ถูกดันลงมา ทับไม่ได้จริง
 */
export default function SiteHeader({
  hero = false,
  customerName = null,
}: {
  hero?: boolean;
  /** ชื่อลูกค้าที่เข้าสู่ระบบอยู่ — null คือยังไม่ได้เข้าสู่ระบบ
      อ่านมาจากฝั่งเซิร์ฟเวอร์ใน PublicShell เพราะคอมโพเนนต์นี้อยู่ฝั่งเบราว์เซอร์ */
  customerName?: string | null;
}) {
  // ชื่อยาวๆ ทำให้แถบบนล้น ตัดให้พอดีแล้วเก็บชื่อเต็มไว้ใน title
  const shortName =
    customerName && customerName.length > 14
      ? `${customerName.slice(0, 14)}…`
      : customerName;
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
    { href: "/", label: "หน้าแรก" },
    { href: "/cars", label: "รถทั้งหมด" },
    { href: "/how-to-book", label: "คู่มือการจอง" },
    { href: "/fees", label: "ค่าปรับ" },
    { href: "/contact", label: "ติดต่อเรา" },
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
            ส่งรถฟรีในเขตเมืองเชียงใหม่ · จองออนไลน์ได้ตลอดคืน
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle tone={over ? "white" : "navy"} size="sm" />
            {customerName ? (
              <AccountMenu name={customerName} tone={over ? "white" : "navy"} />
            ) : (
              /* ยิงไป LINE ตรงๆ ไม่ต้องแวะหน้า /my ก่อน แล้วกลับมาหน้าเดิมที่กดมา */
              <a
                href={`/api/line/login?next=${encodeURIComponent(pathname || "/")}`}
                className={`ml-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                  over
                    ? "text-white/75 hover:text-white"
                    : "text-slate-500 hover:text-blue-700"
                }`}
              >
                เข้าสู่ระบบ
              </a>
            )}
            <Link
              href="/login"
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                over
                  ? "text-white/75 hover:text-white"
                  : "text-slate-500 hover:text-blue-700"
              }`}
            >
              สำหรับแอดมิน
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
                โทรจองรถ
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
              className="px-5 py-2.5 rounded-full bg-gold-fixed hover:bg-amber-200 text-ink text-sm font-bold shadow-sm transition-colors"
            >
              จองรถเลย
            </Link>
          </div>

          {/* ปุ่มเมนูมือถือ + ปุ่มโหมดมืด (ภาษาอยู่ในเมนู) */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle tone={over ? "white" : "navy"} />
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label="เปิดเมนู"
              aria-expanded={open}
              className={`w-10 h-10 min-h-0 grid place-items-center rounded-lg border transition-colors ${
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
              {PHONES[0] && (
                <a
                  href={telHref(PHONES[0])}
                  className="text-xs font-medium text-slate-500"
                >
                  โทร {PHONES[0]}
                </a>
              )}
            </div>

            {customerName ? (
              <>
                <Link
                  href="/my"
                  className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  ประวัติการจอง · {shortName}
                </Link>
                <MobileLogout />
              </>
            ) : (
              <a
                href={`/api/line/login?next=${encodeURIComponent(pathname || "/")}`}
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                เข้าสู่ระบบด้วย LINE
              </a>
            )}

            <div className="flex gap-2 mt-2">
              <Link
                href="/login"
                className="flex-1 text-center px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700"
              >
                สำหรับแอดมิน
              </Link>
              <Link
                href="/cars"
                className="flex-1 text-center px-3 py-2.5 rounded-lg bg-gold-fixed text-ink text-sm font-bold"
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

/** ออกจากระบบจากเมนูมือถือ — ไม่ต้องมี dropdown ซ้อนในเมนูที่เปิดอยู่แล้ว */
function MobileLogout() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/my/logout", { method: "POST" });
        router.push("/?logout=1");
        router.refresh();
      }}
      className="px-3 py-2.5 min-h-0 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 text-left disabled:opacity-60"
    >
      {busy ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
    </button>
  );
}
