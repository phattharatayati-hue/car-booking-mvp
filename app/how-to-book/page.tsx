import Link from "next/link";
import PublicShell from "@/components/PublicShell";

const STEPS = [
  {
    title: "เลือกรถที่ต้องการ",
    desc: "ดูรถทั้งหมดที่ว่างอยู่ พร้อมราคาต่อวัน เลือกคันที่ถูกใจแล้วกด “จองรถ”",
  },
  {
    title: "ระบุวันรับ-คืนรถ และข้อมูลติดต่อ",
    desc: "กรอกวันที่ต้องการใช้รถ ระบบจะคำนวณยอดรวมให้อัตโนมัติ จากนั้นกรอกชื่อและเบอร์โทร",
  },
  {
    title: "โอนมัดจำ 30% แล้วอัปโหลดสลิป",
    desc: "หลังจองสำเร็จ ระบบจะแสดงยอดมัดจำ ให้โอนแล้วอัปโหลดสลิปในหน้าสถานะการจอง",
  },
  {
    title: "รอแอดมินยืนยัน",
    desc: "แอดมินจะตรวจสอบสลิปและยืนยันการจอง สถานะจะเปลี่ยนเป็น “ยืนยันแล้ว” ทันที",
  },
];

const FAQ = [
  {
    q: "ต้องใช้เอกสารอะไรบ้างในการรับรถ?",
    a: "บัตรประชาชนและใบขับขี่ตัวจริงที่ยังไม่หมดอายุ กรุณาเตรียมมาในวันรับรถ",
  },
  {
    q: "ต้องมัดจำเท่าไหร่?",
    a: "ค่ามัดจำอยู่ที่ 30% ของยอดรวม โดยระบบจะคำนวณและแสดงให้อัตโนมัติหลังจองสำเร็จ",
  },
  {
    q: "ยกเลิกการจองได้ไหม?",
    a: "สามารถติดต่อแอดมินเพื่อขอยกเลิกได้ เงื่อนไขการคืนมัดจำขึ้นอยู่กับระยะเวลาที่แจ้งล่วงหน้า",
  },
  {
    q: "ราคารวมน้ำมันหรือไม่?",
    a: "ราคาที่แสดงเป็นค่าเช่ารถเท่านั้น ผู้เช่ารับผิดชอบค่าน้ำมันเอง โดยรับรถและคืนรถที่ระดับน้ำมันเท่ากัน",
  },
];

export default function HowToBookPage() {
  return (
    <PublicShell>
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <nav className="text-sm text-slate-500 mb-3">
            <Link href="/" className="hover:text-blue-700">หน้าแรก</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">วิธีการจอง</span>
          </nav>
          <h1 className="text-3xl font-bold text-slate-900">วิธีการจองรถ</h1>
          <p className="text-slate-500 mt-1.5">
            จองเสร็จภายใน 4 ขั้นตอน ใช้เวลาไม่ถึง 5 นาที
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col gap-5">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="flex gap-5 bg-white rounded-2xl border border-slate-200 p-6"
            >
              <span className="shrink-0 w-10 h-10 rounded-xl bg-blue-600 text-white grid place-items-center font-bold">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">{s.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 bg-blue-600 rounded-2xl p-8 text-center text-white">
          <h2 className="text-xl font-bold mb-2">พร้อมจองแล้วใช่ไหม?</h2>
          <p className="text-blue-100 text-sm mb-6">
            เลือกรถที่ถูกใจแล้วเริ่มจองได้เลย
          </p>
          <Link
            href="/cars"
            className="inline-block px-6 py-3 rounded-xl bg-white text-blue-700 font-semibold hover:bg-blue-50 transition-colors"
          >
            ดูรถทั้งหมด
          </Link>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-5">คำถามที่พบบ่อย</h2>
          <div className="flex flex-col gap-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group bg-white rounded-xl border border-slate-200 px-5 py-4"
              >
                <summary className="cursor-pointer font-medium text-slate-900 list-none flex items-center justify-between gap-4">
                  {item.q}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="w-5 h-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                  >
                    <path
                      d="M6 9l6 6 6-6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
