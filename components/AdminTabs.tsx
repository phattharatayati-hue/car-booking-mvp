"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * แถบแท็บสำหรับหน้าที่เป็นเรื่องเดียวกันแต่แยก route กัน
 *
 * เดิมหน้าพวกนี้แยกเป็นเมนูของตัวเองในแถบซ้าย ทำให้เมนูยาว 14 บรรทัด
 * และแอดมินต้องจำว่า "แก้ราคารถพาร์ทเนอร์อยู่หน้าไหน" ทั้งที่เป็นรถชุดเดียวกัน
 * รวมเป็นแท็บทำให้เดินไปมาได้โดยไม่ต้องกลับไปหาในเมนู
 */
export type TabItem = { href: string; label: string };

export default function AdminTabs({ tabs }: { tabs: TabItem[] }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 pb-3">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
              active
                ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
