export const dynamic = "force-dynamic";

import Link from "next/link";
import PublicShell from "@/components/PublicShell";
import { getSettings } from "@/lib/settings";
import { getPickupPoints } from "@/lib/pickup-points-server";

function buildSteps(bookingFee: number) {
  return [
    {
      title: "เลือกรถที่ต้องการ",
      desc: "ดูรถทั้งหมดที่ว่างอยู่ พร้อมราคาต่อวัน เลือกคันที่ถูกใจแล้วกด “จองรถ”",
    },
    {
      title: "แจ้งวันรับ-คืนรถ",
      desc: "เลือกวันและเวลาที่ต้องการใช้รถ ระบบจะเช็ควันว่างและคำนวณยอดรวมให้อัตโนมัติ",
    },
    {
      title: "ส่งข้อมูลลูกค้า",
      desc: "กรอกชื่อและเบอร์โทรสำหรับติดต่อ เพื่อให้เรายืนยันการจองกลับไปได้",
    },
    {
      title: `ชำระค่าจอง ${bookingFee.toLocaleString()} บาท`,
      desc: "ค่าจองเป็นการกันวันไว้ให้ก่อนรับรถ โอนแล้วอัปโหลดสลิปในหน้าสถานะการจอง ส่วนเงินประกันรถชำระวันรับรถและได้คืนหลังส่งรถ",
    },
    {
      title: "รอแอดมินยืนยันการจอง",
      desc: "แอดมินจะตรวจสอบสลิปและยืนยันการจอง สถานะจะเปลี่ยนเป็น “ยืนยันแล้ว” ทันที",
    },
  ];
}

const BASE_FAQ = [
  {
    q: "ต้องใช้เอกสารอะไรบ้างในการรับรถ?",
    a: `• บัตรประชาชน หรือ Passport
• ใบขับขี่ที่ยังไม่หมดอายุ
• เอกสารการจองการเดินทาง หรือเอกสารการจองที่พัก
• เบอร์โทรศัพท์สำหรับติดต่อ
• กรณีชาวต่างชาติ ใช้ Passport พร้อมใบขับขี่ที่ใช้ในประเทศไทยได้

อัปโหลดเอกสารล่วงหน้าได้ในหน้าสถานะการจอง จะได้รับรถเร็วขึ้นไม่ต้องรอกรอกหน้างาน
ก่อนรับรถ เจ้าหน้าที่จะตรวจสอบเอกสารและทำรายการเช่ารถให้เรียบร้อยครับ`,
  },
  {
    q: "ต้องมัดจำเท่าไหร่?",
    a: `แยกเป็น 2 ส่วนครับ

• ค่าจอง 500 บาท — จ่ายเพื่อยืนยันการจองรถ
• เงินประกันรถ 3,000 บาท — ชำระวันรับรถ และคืนให้หลังส่งคืนรถเรียบร้อย หากไม่มีความเสียหายหรือค่าใช้จ่ายเพิ่มเติม

รถบางรุ่นอาจมีเงินประกันแตกต่างกัน กรุณาสอบถามเจ้าหน้าที่ก่อนจองครับ`,
  },
  {
    q: "ยกเลิกการจองได้ไหม?",
    a: `สามารถแจ้งยกเลิกหรือเปลี่ยนแปลงวันรับรถได้ครับ

• ยกเลิกการจองทุกกรณี — ไม่คืนเงินค่าจอง
• เปลี่ยนวันรับรถได้ 1 ครั้ง ฟรี
• หากรถที่จองมีปัญหา ทางร้านจะจัดรถคันอื่นให้ทดแทน`,
  },
  {
    q: "ราคารวมค่าน้ำมันหรือไม่?",
    a: `ราคาค่าเช่าไม่รวมค่าน้ำมันครับ

ลูกค้ารับรถด้วยน้ำมันระดับไหน ให้เติมคืนในระดับเดียวกันตอนส่งรถ
ค่าน้ำมันลูกค้ารับผิดชอบตามการใช้งานจริง ทางร้านไม่มีการบวกค่าน้ำมันเพิ่มครับ`,
  },
  {
    q: "รับรถก่อนเวลา หรือคืนรถดึกได้ไหม?",
    a: `ได้ครับ ร้านประสานงานเรื่องรับ-คืนรถได้ตลอด 24 ชั่วโมง โดยขึ้นอยู่กับคิวและจุดรับ-ส่ง

• ช่วง 06.00-20.00 น. — ฟรี ไม่มีค่าใช้จ่าย
• นอกเหนือเวลานี้ — มีค่า OT 100-200 บาท`,
  },
  {
    q: "เช่ารถต้องมีบัตรเครดิตไหม?",
    a: `ไม่จำเป็นครับ

สอบถามช่องทางชำระเงินและเงื่อนไขการเช่ากับแอดมินได้เลย`,
  },
];

function placesAnswer(points: { name: string; fee: number }[]): string {
  if (points.length === 0) {
    return "ร้านมีบริการรับ-ส่งรถในเชียงใหม่ครับ สอบถามจุดรับ-ส่งกับแอดมินได้เลย";
  }

  const free = points.filter((p) => p.fee === 0).map((p) => p.name);
  const paid = points.filter((p) => p.fee > 0);

  const lines = ["ร้านมีบริการรับ-ส่งรถในเชียงใหม่ครับ", ""];
  if (free.length > 0) {
    lines.push("รับ-ส่งฟรี ไม่มีค่าใช้จ่าย", ...free.map((n) => `• ${n}`));
  }
  if (paid.length > 0) {
    if (free.length > 0) lines.push("");
    lines.push(
      "มีค่าบริการ",
      ...paid.map((p) => `• ${p.name} — ${p.fee.toLocaleString()} บาท`)
    );
  }
  lines.push("", "จุดรับ-ส่งนอกเหนือจากนี้ สอบถามแอดมินได้ครับ");
  return lines.join("\n");
}

export default async function HowToBookPage() {
  const [settings, points] = await Promise.all([getSettings(), getPickupPoints()]);
  const STEPS = buildSteps(settings.bookingFee);

  // จุดรับ-ส่งดึงจากที่แอดมินตั้งไว้ในหลังบ้าน จะได้ไม่ต้องมาแก้หน้านี้ทุกครั้ง
  const FAQ = [
    ...BASE_FAQ.slice(0, 4),
    { q: "รับรถและคืนรถที่ไหน?", a: placesAnswer(points) },
    ...BASE_FAQ.slice(4),
  ];

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
            จองเสร็จภายใน 5 ขั้นตอน ใช้เวลาไม่ถึง 5 นาที
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
                <p className="mt-3 text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
