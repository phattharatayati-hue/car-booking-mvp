import Link from "next/link";
import Brand from "@/components/Brand";
import {
  COMPANY,
  LINE_OA_ID,
  PHONES,
  OFFICE_HOURS,
  LOCATION,
  telHref,
} from "@/lib/contact";

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <div className="mb-3">
              <Brand href={null} size="md" />
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              {COMPANY.nameTh} — บริการเช่ารถคุณภาพในเชียงใหม่ รถสะอาด ราคาชัดเจน
              จองออนไลน์ได้ตลอด 24 ชั่วโมง
            </p>
          </div>

          <div>
            <p className="font-semibold text-sm mb-3">เมนู</p>
            <ul className="flex flex-col gap-2 text-sm text-slate-600">
              <li><Link href="/cars" className="hover:text-blue-700">รถทั้งหมด</Link></li>
              <li><Link href="/how-to-book" className="hover:text-blue-700">คู่มือการจอง</Link></li>
              <li><Link href="/fees" className="hover:text-blue-700">ค่าปรับและค่าบริการ</Link></li>
              <li><Link href="/terms" className="hover:text-blue-700">ข้อกำหนดการใช้บริการ</Link></li>
              <li><Link href="/privacy" className="hover:text-blue-700">นโยบายความเป็นส่วนตัว</Link></li>
              <li><Link href="/my" className="hover:text-blue-700">ประวัติการจอง</Link></li>
              <li><Link href="/line/connect" className="hover:text-blue-700">เชื่อมต่อ LINE</Link></li>
              <li><Link href="/contact" className="hover:text-blue-700">ติดต่อเรา</Link></li>
              <li><Link href="/login" className="hover:text-blue-700">สำหรับแอดมิน</Link></li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-sm mb-3">ติดต่อ</p>
            <ul className="flex flex-col gap-2 text-sm text-slate-600">
              {PHONES.map((phone) => (
                <li key={phone}>
                  <a href={telHref(phone)} className="hover:text-blue-700">
                    โทร {phone}
                  </a>
                </li>
              ))}
              <li>LINE: {LINE_OA_ID}</li>
              {OFFICE_HOURS.map((h) => (
                <li key={h} className="text-slate-500">{h}</li>
              ))}
              <li>{LOCATION}</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-400">
          © {new Date().getFullYear()} {COMPANY.name} · {COMPANY.nameTh}
        </div>
      </div>
    </footer>
  );
}
