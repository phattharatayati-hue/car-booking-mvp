"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  {
    href: "/admin",
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
    href: "/admin/calendar",
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
    href: "/admin/partners",
    label: "คลังรถพาร์ทเนอร์",
    icon: (
      <>
        <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M3.5 19a5.5 5.5 0 0111 0M17 3.5a2.5 2.5 0 010 5M19 19a5 5 0 00-2-4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    href: "/admin/pickup-points",
    label: "จุดรับ-ส่งรถ",
    icon: (
      <>
        <path
          d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.7" />
      </>
    ),
  },
  {
    href: "/admin/after-hours",
    label: "ค่าบริการนอกเวลา",
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
        <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    href: "/admin/storage",
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
    label: "ตั้งค่าระบบ",
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
    href: "/admin/account",
    label: "บัญชีของฉัน",
    icon: (
      <>
        <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.7" />
        <path d="M4.5 20a7.5 7.5 0 0115 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/admin/users",
    label: "จัดการแอดมิน",
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
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
      {ITEMS.map((item) => {
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
      })}
    </nav>
  );
}
