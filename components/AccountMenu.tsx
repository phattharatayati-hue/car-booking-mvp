"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * ป้ายชื่อลูกค้าในหัวเว็บ กดแล้วเปิดเมนูเล็ก — ประวัติการจอง / ออกจากระบบ
 *
 * ทำไมต้องเป็นเมนู ไม่ใช่ลิงก์สองอันวางเรียงกัน
 *   แถบบนสูง 36px และมีเบอร์โทร ปุ่มโหมด ปุ่มแอดมินอยู่แล้ว
 *   ถ้าเพิ่ม "ออกจากระบบ" เปลือยๆ เข้าไปอีกจะแน่นจนอ่านไม่ออกบนจอ 13 นิ้ว
 *
 * ปิดเมนูเมื่อคลิกนอกกล่องหรือกด Esc ตามพฤติกรรมเมนูมาตรฐาน
 */
export default function AccountMenu({
  name,
  tone = "navy",
}: {
  name: string;
  tone?: "navy" | "white";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const short = name.length > 14 ? `${name.slice(0, 14)}…` : name;

  useEffect(() => {
    if (!open) return;

    function onClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function logout() {
    setBusy(true);
    await fetch("/api/my/logout", { method: "POST" });
    setOpen(false);
    setBusy(false);
    // กลับหน้าแรกเสมอ — ถ้ารีเฟรชอยู่กับที่ หน้าที่ต้องล็อกอินจะกลายเป็นหน้า login
    // ซึ่งดูเหมือนระบบพัง มากกว่าจะรู้สึกว่าออกจากระบบสำเร็จ
    router.push("/?logout=1");
    router.refresh();
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`เข้าสู่ระบบอยู่: ${name}`}
        className={`ml-1 min-h-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium transition-colors ${
          tone === "white"
            ? "bg-white/15 text-white hover:bg-white/25"
            : "bg-blue-50 text-blue-700 hover:bg-blue-100"
        }`}
      >
        {/* จุดเขียว = ยังเข้าสู่ระบบอยู่ กวาดตาผ่านก็รู้ ไม่ต้องอ่าน */}
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        {short}
        <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3 shrink-0">
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-slate-200 bg-surface shadow-pop overflow-hidden z-50"
        >
          <p className="px-4 pt-3 pb-2 text-xs text-slate-500 border-b border-slate-100 break-all">
            {name}
          </p>
          <Link
            href="/my"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            ประวัติการจอง
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={logout}
            className="w-full min-h-0 text-left px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            {busy ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
          </button>
        </div>
      )}
    </div>
  );
}
