import Link from "next/link";
import PublicShell from "@/components/PublicShell";
import { LINE_OA_ID, PHONES, OFFICE_HOURS, LOCATION, telHref } from "@/lib/contact";

const CHANNELS = [
  {
    label: "โทรศัพท์",
    value: PHONES.join("  ·  "),
    href: telHref(PHONES[0]),
    hint: OFFICE_HOURS.join(" · "),
    icon: (
      <path
        d="M3 5.5A2.5 2.5 0 015.5 3h1.6a1 1 0 01.96.73l.9 3.1a1 1 0 01-.28 1L7.4 9.1a12 12 0 007.5 7.5l1.27-1.28a1 1 0 011-.27l3.1.9a1 1 0 01.73.96v1.6a2.5 2.5 0 01-2.5 2.5A16.5 16.5 0 013 5.5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    label: "LINE",
    value: LINE_OA_ID,
    hint: "ตอบกลับเร็วที่สุด",
    icon: (
      <path
        d="M21 11.2c0 4-4 7.2-9 7.2-.9 0-1.8-.1-2.6-.3L4 21l1.2-3.4C3.8 16.2 3 13.8 3 11.2 3 7.2 7 4 12 4s9 3.2 9 7.2z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    label: "ที่ตั้ง",
    value: LOCATION,
    hint: "รับรถที่ร้านหรือนัดรับที่สนามบินได้",
    icon: (
      <>
        <path
          d="M12 21s7-5.2 7-10.4A7 7 0 005 10.6C5 15.8 12 21 12 21z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="10.5" r="2.5" stroke="currentColor" strokeWidth="1.7" />
      </>
    ),
  },
];

export default function ContactPage() {
  return (
    <PublicShell>
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <nav className="text-sm text-slate-500 mb-3">
            <Link href="/" className="hover:text-blue-700">หน้าแรก</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">ติดต่อเรา</span>
          </nav>
          <h1 className="text-3xl font-bold text-slate-900">ติดต่อเรา</h1>
          <p className="text-slate-500 mt-1.5">
            มีคำถามเรื่องการจองหรือต้องการความช่วยเหลือ ทักมาได้เลย
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid gap-5 sm:grid-cols-3">
          {CHANNELS.map((c) => (
            <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-6">
              <span className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 grid place-items-center mb-4">
                <svg viewBox="0 0 24 24" fill="none" className="w-[22px] h-[22px]">
                  {c.icon}
                </svg>
              </span>
              <p className="text-sm text-slate-500 mb-0.5">{c.label}</p>
              {c.href ? (
                <a href={c.href} className="font-semibold text-blue-700 hover:underline">
                  {c.value}
                </a>
              ) : (
                <p className="font-semibold text-slate-900">{c.value}</p>
              )}
              <p className="text-xs text-slate-500 mt-1.5">{c.hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-white rounded-2xl border border-slate-200 p-7">
          <h2 className="font-bold text-slate-900 text-lg mb-4">เวลาทำการ</h2>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <dt className="text-slate-600">จันทร์ - ศุกร์</dt>
              <dd className="font-medium text-slate-900">08:00 - 20:00 น.</dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <dt className="text-slate-600">เสาร์ - อาทิตย์</dt>
              <dd className="font-medium text-slate-900">09:00 - 18:00 น.</dd>
            </div>
          </dl>
          <p className="text-sm text-slate-500 mt-5">
            การจองผ่านเว็บไซต์ทำได้ตลอด 24 ชั่วโมง
            แอดมินจะตรวจสอบสลิปค่าจองในเวลาทำการ
          </p>
        </div>
      </div>
    </PublicShell>
  );
}
