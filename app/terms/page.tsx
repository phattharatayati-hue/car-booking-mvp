export const dynamic = "force-dynamic";

import Link from "next/link";
import PublicShell from "@/components/PublicShell";
import { getSettings } from "@/lib/settings";
import { SECURITY_DEPOSIT, FEE_TERMS } from "@/lib/fees";
import { PHONES, OFFICE_HOURS, telHref } from "@/lib/contact";

export const metadata = {
  title: "ข้อกำหนดการใช้บริการ · PHUPING CORPORATION",
  description:
    "ข้อกำหนดและเงื่อนไขการเช่ารถของ ภูพิงค์ คอร์ปอเรชั่น — คุณสมบัติผู้เช่า การจอง การชำระเงิน และความรับผิดชอบ",
};

export default async function TermsPage() {
  const settings = await getSettings();

  const SECTIONS = [
    {
      h: "1. คุณสมบัติผู้เช่า",
      body: [
        "ผู้เช่าต้องมีอายุครบ 20 ปีบริบูรณ์ขึ้นไป และมีใบอนุญาตขับขี่ที่ยังไม่หมดอายุ",
        "ต้องแสดงบัตรประชาชนหรือหนังสือเดินทางฉบับจริงในวันรับรถ",
        "ผู้ขับขี่ต้องเป็นผู้เช่าตามสัญญา หากมีผู้ขับขี่ร่วม ต้องแจ้งและแสดงเอกสารต่อบริษัทฯ ก่อนรับรถ",
      ],
    },
    {
      h: "2. การจองและการยืนยัน",
      body: [
        `การจองสมบูรณ์เมื่อชำระค่าจอง ${settings.bookingFee.toLocaleString()} บาท และบริษัทฯ ตรวจสอบหลักฐานการชำระเงินเรียบร้อยแล้ว`,
        "บริษัทฯ ขอสงวนสิทธิ์ปฏิเสธการจองที่ข้อมูลไม่ครบถ้วนหรือไม่สามารถยืนยันตัวตนได้",
        "กรณีรถที่จองเกิดเหตุขัดข้อง บริษัทฯ จะจัดรถประเภทเทียบเท่าให้ทดแทน",
      ],
    },
    {
      h: "3. การชำระเงิน",
      body: [
        `ค่าจองเป็นส่วนหนึ่งของค่าเช่า ชำระล่วงหน้าเพื่อกันรถและวันที่ให้ผู้เช่า`,
        "ค่าเช่าส่วนที่เหลือชำระในวันรับรถ",
        `เงินประกันความเสียหาย ${SECURITY_DEPOSIT.amount.toLocaleString()} บาท ชำระในวันรับรถ และคืนให้เต็มจำนวนเมื่อส่งคืนรถเรียบร้อยตามเงื่อนไข`,
        "การรับหรือคืนรถนอกเวลาทำการมีค่าบริการเพิ่มเติมตามอัตราที่แสดงในหน้าจอง",
      ],
    },
    {
      h: "4. การยกเลิกและเปลี่ยนแปลง",
      body: [
        "ยกเลิกการจองทุกกรณี บริษัทฯ ขอสงวนสิทธิ์ไม่คืนค่าจอง",
        "เปลี่ยนแปลงวันรับรถได้ 1 ครั้งโดยไม่มีค่าใช้จ่าย โดยแจ้งล่วงหน้าและขึ้นอยู่กับคิวรถที่ว่าง",
        "คืนรถก่อนกำหนด บริษัทฯ คิดค่าเช่าเต็มตามช่วงเวลาที่จองไว้",
      ],
    },
    {
      h: "5. การใช้รถ",
      body: [
        "ใช้รถในเขตจังหวัดเชียงใหม่เป็นหลัก หากประสงค์ออกนอกจังหวัด กรุณาแจ้งบริษัทฯ ล่วงหน้า และอาจมีค่าใช้จ่ายเพิ่มเติม",
        "ห้ามนำรถไปใช้ในทางผิดกฎหมาย ใช้แข่งขัน ลากจูง ให้เช่าช่วง หรือใช้เป็นหลักประกันหนี้",
        "ห้ามสูบบุหรี่ในรถทุกกรณี รวมถึงบุหรี่ไฟฟ้า",
        "ห้ามขับขี่ขณะมึนเมาสุราหรืออยู่ภายใต้ฤทธิ์สารเสพติด",
        "ผู้เช่ารับผิดชอบค่าน้ำมัน ค่าทางด่วน ค่าที่จอดรถ และค่าปรับจราจรที่เกิดขึ้นระหว่างการเช่า",
      ],
    },
    {
      h: "6. การส่งมอบและคืนรถ",
      body: [
        "ผู้เช่าและพนักงานตรวจสภาพรถร่วมกันก่อนรับรถ และบันทึกภาพถ่ายหรือวิดีโอไว้เป็นหลักฐานของทั้งสองฝ่าย",
        "คืนรถตามวันเวลาและสถานที่ที่ตกลงกันไว้ พร้อมเติมน้ำมันคืนตามระดับที่รับไป",
        "คืนรถล่าช้าเกินเวลานัดโดยไม่แจ้งล่วงหน้า บริษัทฯ คิดค่าเช่าเพิ่มตามระยะเวลาที่เกิดขึ้นจริง",
      ],
    },
    {
      h: "7. อุบัติเหตุและความเสียหาย",
      body: [
        "เมื่อเกิดอุบัติเหตุ ให้แจ้งบริษัทฯ และเจ้าหน้าที่ตำรวจทันที ห้ามเคลื่อนย้ายหรือซ่อมรถเองก่อนได้รับความยินยอม",
        `กรณีผู้เช่าเป็นฝ่ายผิดหรือไม่มีคู่กรณี ผู้เช่ารับผิดชอบค่าเสียหายส่วนแรกตามอัตราที่ประกาศไว้`,
        "ความเสียหายที่เกิดจากการใช้ผิดเงื่อนไขในข้อ 5 ไม่อยู่ในความคุ้มครองของกรมธรรม์ ผู้เช่ารับผิดชอบเต็มจำนวน",
      ],
    },
    {
      h: "8. ค่าปรับและค่าบริการเพิ่มเติม",
      body: [
        "อัตราค่าปรับและค่าบริการเพิ่มเติมเป็นไปตามที่ประกาศในหน้าค่าปรับของเว็บไซต์",
        ...FEE_TERMS,
      ],
    },
  ];

  return (
    <PublicShell>
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <nav className="text-sm text-slate-500 mb-3">
            <Link href="/" className="hover:text-blue-700">หน้าแรก</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">ข้อกำหนดการใช้บริการ</span>
          </nav>
          <h1 className="text-3xl font-bold text-slate-900">ข้อกำหนดการใช้บริการ</h1>
          <p className="text-slate-500 mt-2 leading-relaxed">
            บริษัท ภูพิงค์ คอร์ปอเรชั่น จำกัด — เงื่อนไขการเช่ารถขับเอง
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col gap-8">
          {SECTIONS.map((s) => (
            <section key={s.h}>
              <h2 className="text-lg font-bold text-slate-900 mb-3">{s.h}</h2>
              <ul className="flex flex-col gap-2">
                {s.body.map((b) => (
                  <li key={b} className="flex gap-3 text-slate-700 leading-relaxed">
                    <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/fees"
            className="px-6 py-3 rounded-full bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-semibold transition-colors"
          >
            ดูอัตราค่าปรับ
          </Link>
          <Link
            href="/privacy"
            className="px-6 py-3 rounded-full bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-semibold transition-colors"
          >
            นโยบายความเป็นส่วนตัว
          </Link>
        </div>

        <p className="mt-8 text-sm text-slate-500 leading-relaxed">
          สอบถามเพิ่มเติม โทร{" "}
          {PHONES.map((p, i) => (
            <span key={p}>
              {i > 0 ? " หรือ " : ""}
              <a href={telHref(p)} className="text-blue-700 hover:underline">
                {p}
              </a>
            </span>
          ))}{" "}
          · {OFFICE_HOURS[0]}
        </p>
      </div>
    </PublicShell>
  );
}
