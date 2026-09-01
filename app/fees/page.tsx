export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import PublicShell from "@/components/PublicShell";
import FeeIcon from "@/components/FeeIcon";
import { FEE_ITEMS, FEE_TERMS, SECURITY_DEPOSIT } from "@/lib/fees";
import { getSettings } from "@/lib/settings";
import { PHONES, telHref } from "@/lib/contact";

export const metadata = {
  title: "ค่าปรับและค่าบริการเพิ่มเติม · PHUPING CORPORATION",
  description:
    "อัตราค่าปรับและค่าบริการเพิ่มเติมของรถเช่า ภูพิงค์ คอร์ปอเรชั่น — อ่านก่อนจองเพื่อความเข้าใจตรงกัน",
};

export default async function FeesPage() {
  const settings = await getSettings();

  return (
    <PublicShell>
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <nav className="text-sm text-slate-500 mb-3">
            <Link href="/" className="hover:text-blue-700">หน้าแรก</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">ค่าปรับและค่าบริการเพิ่มเติม</span>
          </nav>
          <h1 className="text-3xl font-bold text-slate-900">
            ค่าปรับและค่าบริการเพิ่มเติม
          </h1>
          <p className="text-slate-500 mt-2 max-w-2xl leading-relaxed">
            เปิดเผยไว้ตรงนี้ทั้งหมดก่อนคุณจอง เพื่อให้เข้าใจตรงกันตั้งแต่ต้น
            ทุกรายการเกิดขึ้นเฉพาะเมื่อมีเหตุจริง ถ้าคืนรถเรียบร้อยจะไม่มีค่าใช้จ่ายเหล่านี้เลย
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* โปสเตอร์ฉบับทางการของบริษัท — แตะเพื่อดูขนาดเต็ม */}
        <a
          href="/fees-poster.jpg"
          target="_blank"
          rel="noreferrer"
          className="block rounded-3xl overflow-hidden border border-slate-200 bg-white hover:border-slate-300 transition-colors"
        >
          <Image
            src="/fees-poster.jpg"
            alt="ตารางค่าปรับและค่าบริการเพิ่มเติม รถเช่า ภูพิงค์ คาร์ เร้นท์"
            width={1080}
            height={1935}
            priority
            className="w-full h-auto"
          />
        </a>
        <p className="mt-2 mb-8 text-center text-xs text-slate-500">
          แตะที่ภาพเพื่อดูขนาดเต็ม · ด้านล่างเป็นข้อมูลเดียวกันในรูปแบบข้อความ อ่านง่ายบนมือถือ
        </p>

        {/* เงินประกัน — สิ่งที่ลูกค้าอยากรู้ที่สุด อยู่บนสุด */}
        <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6 sm:p-8">
          <div className="flex items-start gap-5 flex-wrap">
            <span className="w-14 h-14 shrink-0 rounded-2xl bg-blue-600 text-white grid place-items-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
                <rect x="4" y="10" width="16" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
                <path d="M8 10V7a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <circle cx="12" cy="15.5" r="1.6" fill="currentColor" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-mono uppercase tracking-widest text-blue-700/70">
                Security Deposit
              </p>
              <p className="mt-1 font-display text-3xl font-bold text-blue-900 tabular-nums">
                {SECURITY_DEPOSIT.amount.toLocaleString()} บาท
              </p>
              <p className="text-blue-900/80 text-sm mt-1">
                เงินประกันความเสียหาย ชำระวันรับรถ และ<b>ได้คืนเต็มจำนวน</b> เมื่อ
              </p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {SECURITY_DEPOSIT.conditions.map((c) => (
                  <li key={c} className="flex gap-2.5 text-sm text-blue-900">
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 shrink-0 text-emerald-600">
                      <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-900 mt-10 mb-1">รายการค่าปรับและค่าบริการ</h2>
        <p className="text-slate-500 text-sm mb-5">
          หักจากเงินประกันก่อน ส่วนที่เหลือคืนให้ ถ้าเกินจะแจ้งยอดพร้อมหลักฐานให้ทราบ
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          {FEE_ITEMS.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-4"
            >
              <span
                className={`w-11 h-11 shrink-0 rounded-xl grid place-items-center ${
                  f.highlight
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <FeeIcon name={f.icon} className="w-6 h-6" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 text-[15px]">{f.title}</p>
                <p
                  className={`font-display font-bold text-lg tabular-nums ${
                    f.amount.includes("ไม่คืน") ? "text-red-700" : "text-slate-900"
                  }`}
                >
                  {f.amount}
                </p>
                {f.note ? (
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{f.note}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="font-semibold text-amber-900 mb-3">เงื่อนไขและข้อกำหนด</h2>
          <ul className="flex flex-col gap-2">
            {FEE_TERMS.map((t) => (
              <li key={t} className="flex gap-2.5 text-sm text-amber-900/90">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-60" />
                <span className="leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900 mb-2">วิธีเลี่ยงค่าปรับทั้งหมด</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            ไม่สูบบุหรี่ในรถ · เติมน้ำมันคืนตามระดับที่รับไป · เก็บกุญแจให้ดี ·
            ถ่ายรูปสภาพรถตอนรับไว้เป็นหลักฐาน · คืนรถตามเวลานัด ·
            ถ้าเกิดอุบัติเหตุหรือยางแตก โทรแจ้งร้านก่อนดำเนินการเอง
            ทำครบเท่านี้ได้เงินประกัน {SECURITY_DEPOSIT.amount.toLocaleString()} บาทคืนเต็มจำนวน
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3 justify-center">
          <Link
            href="/cars"
            className="px-7 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
          >
            ดูรถทั้งหมด
          </Link>
          <Link
            href="/how-to-book"
            className="px-7 py-3 rounded-full bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-sm transition-colors"
          >
            คู่มือการจองรถ
          </Link>
          {PHONES.slice(0, 1).map((p) => (
            <a
              key={p}
              href={telHref(p)}
              className="px-7 py-3 rounded-full bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-sm transition-colors"
            >
              สอบถาม {p}
            </a>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          ค่ามัดจำการจอง {settings.bookingFee.toLocaleString()} บาท เป็นส่วนหนึ่งของค่าเช่า
          คิดแยกจากเงินประกันความเสียหาย
        </p>
      </div>
    </PublicShell>
  );
}
