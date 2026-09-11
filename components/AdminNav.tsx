"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  {
    href: "/admin",
    group: "daily",
    label: "แดชบอร์ด",
    icon: (
      <path
        d="M4 13h6V4H4v9zm10 7h6v-9h-6v9zM4 20h6v-4H4v4zm10-11h6V4h-6v5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    href: "/admin/bookings",
    group: "daily",
    label: "รายการจอง",
    icon: (
      <>
        <rect x="4" y="5" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M8 3v4M16 3v4M4 10h16M9 14l2 2 4-4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  {
    href: "/admin/schedule",
    group: "daily",
    label: "ตารางรับ-ส่งรถ",
    driver: true,
    icon: (
      <>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M12 7.5V12l3 2"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  {
    href: "/admin/refunds",
    group: "daily",
    label: "คืนเงินประกัน",
    icon: (
      <>
        <rect x="2.5" y="6" width="19" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.7" />
        <path d="M6 12h.01M18 12h.01" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/admin/handoffs",
    group: "daily",
    label: "ภาพสภาพรถ",
    icon: (
      <>
        <rect x="3" y="6" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M8.5 6l1.2-2h4.6L15.5 6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  {
    href: "/admin/calendar",
    group: "daily",
    label: "ปฏิทินการจอง",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M8 3v4M16 3v4M3 10h18M7 14h3M7 17.5h7"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    href: "/admin/cars",
    group: "fleet",
    label: "จัดการรถ",
    icon: (
      <path
        d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11m-14 0h14m-14 0a1 1 0 00-1 1v4h2m13-5a1 1 0 011 1v4h-2m0 0H7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    href: "/admin/storage",
    group: "system",
    label: "พื้นที่เก็บไฟล์",
    icon: (
      <>
        <ellipse cx="12" cy="6" rx="7" ry="3" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M5 6v6c0 1.66 3.13 3 7 3s7-1.34 7-3V6M5 12v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    href: "/admin/settings",
    group: "system",
    label: "ตั้งค่าระบบ",
    devOnly: true,
    icon: (
      <>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.56V21a2 2 0 11-4 0v-.09A1.7 1.7 0 008 19.4a1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.7 1.7 0 003.6 15a1.7 1.7 0 00-1.56-1H2a2 2 0 110-4h.09A1.7 1.7 0 003.6 9a1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06A1.7 1.7 0 008 4.6 1.7 1.7 0 009 3.04V3a2 2 0 114 0v.09a1.7 1.7 0 001 1.56 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06A1.7 1.7 0 0019.4 9v0a1.7 1.7 0 001.56 1H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.56 1z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  {
    href: "/admin/guide",
    group: "help",
    label: "คู่มือการใช้งาน",
    icon: (
      <>
        <path
          d="M4 5.5A1.5 1.5 0 015.5 4H10a2 2 0 012 2v13a2 2 0 00-2-2H5.5A1.5 1.5 0 014 15.5v-10z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M20 5.5A1.5 1.5 0 0018.5 4H14a2 2 0 00-2 2v13a2 2 0 012-2h4.5a1.5 1.5 0 001.5-1.5v-10z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  {
    href: "/admin/users",
    group: "system",
    label: "จัดการแอดมิน",
    devOnly: true,
    icon: (
      <>
        <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M3.5 19a5.5 5.5 0 0111 0M17 11.5a2.5 2.5 0 100-5M18 19a4.5 4.5 0 00-2-3.7"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  {
    href: "/admin/audit",
    group: "system",
    label: "ประวัติการใช้งาน",
    devOnly: true,
    icon: (
      <>
        <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M12 7.5V12l3 2"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
];

/** ลำดับกลุ่มในเมนู — เรียงตามความถี่ที่ใช้จริง งานประจำวันอยู่บนสุด */
const GROUP_ORDER = ["daily", "fleet", "system", "help"] as const;

const GROUP_LABEL: Record<string, string> = {
  daily: "งานประจำวัน",
  fleet: "รถและราคา",
  system: "ระบบ",
  help: "ช่วยเหลือ",
};

export default function AdminNav({
  isDev = false,
  isDriver = false,
}: {
  isDev?: boolean;
  isDriver?: boolean;
}) {
  const pathname = usePathname();

  /* คนรับ-ส่งรถเห็นเฉพาะเมนูที่ติดธง driver ไว้ — ตอนนี้คือตารางคิวของตัวเอง
     ที่เหลือยังทำงานผ่านแชท LINE เหมือนเดิม */
  const items = isDriver
    ? ITEMS.filter((item) => "driver" in item && item.driver)
    : ITEMS.filter((item) => isDev || !("devOnly" in item && item.devOnly));

  /* จัดกลุ่มเมนู — 14 บรรทัดเรียงแบนทำให้เมนูที่ใช้ทุกวันปนกับเมนูที่ตั้งครั้งเดียวจบ
     แอดมินใหม่เปิดมาแล้วไม่รู้ว่าเริ่มตรงไหน หัวข้อคั่นช่วยได้มากโดยไม่ต้องพับเก็บ
     บนมือถือแถบเลื่อนแนวนอน จึงซ่อนหัวข้อไว้ (md:block) ไม่งั้นกินที่โดยเปล่าประโยชน์ */
  const grouped = GROUP_ORDER.map((key) => ({
    key,
    label: GROUP_LABEL[key],
    items: items.filter((item) => item.group === key),
  })).filter((g) => g.items.length > 0);

  const renderItem = (item: (typeof ITEMS)[number]) => {
    const active =
      item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
          active
            ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 shrink-0">
          {item.icon}
        </svg>
        {item.label}
      </Link>
    );
  };

  return (
    <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
      {grouped.map((g, i) => (
        <div key={g.key} className="contents md:block">
          {g.label && (
            <p
              className={`hidden md:block px-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 ${
                i === 0 ? "mb-1.5" : "mt-5 mb-1.5"
              }`}
            >
              {g.label}
            </p>
          )}
          <div className="contents md:flex md:flex-col md:gap-1">
            {g.items.map(renderItem)}
          </div>
        </div>
      ))}

      {isDriver && (
        <div className="mt-3 rounded-xl bg-blue-50 border border-blue-100 px-3.5 py-3 text-xs text-blue-900 leading-relaxed">
          <p className="font-semibold mb-1">งานของคุณอยู่ในแชท LINE</p>
          ระบบส่งคิวงานให้ทางแชท พิมพ์ <b>งานของฉัน</b> เพื่อดูคิวได้ตลอด
        </div>
      )}
    </nav>
  );
}
