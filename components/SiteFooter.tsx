import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-lg bg-blue-600 text-white grid place-items-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                  <path
                    d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11m-14 0h14m-14 0a1 1 0 00-1 1v4h2m13-5a1 1 0 011 1v4h-2m0 0H7"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="font-bold">CM Car Rent</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              บริการเช่ารถคุณภาพในเชียงใหม่ รถสะอาด ราคาชัดเจน
              จองออนไลน์ได้ตลอด 24 ชั่วโมง
            </p>
          </div>

          <div>
            <p className="font-semibold text-sm mb-3">เมนู</p>
            <ul className="flex flex-col gap-2 text-sm text-slate-600">
              <li><Link href="/cars" className="hover:text-blue-700">รถทั้งหมด</Link></li>
              <li><Link href="/how-to-book" className="hover:text-blue-700">วิธีการจอง</Link></li>
              <li><Link href="/line/connect" className="hover:text-blue-700">เชื่อมต่อ LINE</Link></li>
              <li><Link href="/contact" className="hover:text-blue-700">ติดต่อเรา</Link></li>
              <li><Link href="/login" className="hover:text-blue-700">สำหรับแอดมิน</Link></li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-sm mb-3">ติดต่อ</p>
            <ul className="flex flex-col gap-2 text-sm text-slate-600">
              <li>โทร 053-000-000</li>
              <li>LINE: @cmcarrent</li>
              <li>อ.เมือง จ.เชียงใหม่</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-400">
          © {new Date().getFullYear()} CM Car Rent · เวอร์ชันทดลอง (MVP)
        </div>
      </div>
    </footer>
  );
}
