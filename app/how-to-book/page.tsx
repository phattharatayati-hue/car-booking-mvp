export const dynamic = "force-dynamic";

import Link from "next/link";
import PublicShell from "@/components/PublicShell";
import { getSettings } from "@/lib/settings";
import { getPickupPoints } from "@/lib/pickup-points-server";
import { getAfterHoursRates } from "@/lib/after-hours-server";
import { BANK_ACCOUNT, PHONES, OFFICE_HOURS, telHref } from "@/lib/contact";
import {
  CustomerFlow,
  MoneyTimeline,
  AfterHoursClock,
  CalendarLegendDiagram,
  DocumentsDiagram,
  SlipDiagram,
  HandoverChecklist,
  CustomerStatusFlow,
} from "@/components/GuideDiagrams";

const SECTIONS = [
  { id: "overview", t: "ภาพรวม 4 ขั้นตอน" },
  { id: "step1", t: "1. เลือกรถและวันเวลา" },
  { id: "step2", t: "2. กรอกข้อมูลและจุดรับรถ" },
  { id: "step3", t: "3. โอนค่าจองและแนบสลิป" },
  { id: "step4", t: "4. รอยืนยันและติดตามสถานะ" },
  { id: "money", t: "เรื่องเงิน จ่ายอะไรบ้าง" },
  { id: "afterhours", t: "รับ-คืนรถนอกเวลา" },
  { id: "documents", t: "เอกสารที่ต้องเตรียม" },
  { id: "places", t: "จุดรับ-ส่งรถ" },
  { id: "handover", t: "วันรับรถและวันคืนรถ" },
  { id: "faq", t: "คำถามที่พบบ่อย" },
];

function Section({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 pt-12 first:pt-0">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      {lead ? <p className="mt-2 text-slate-600 leading-relaxed">{lead}</p> : null}
      <div className="mt-5 flex flex-col gap-4 text-slate-700 leading-relaxed">{children}</div>
    </section>
  );
}

function Tips({ items, tone = "info" }: { items: string[]; tone?: "info" | "warn" }) {
  const style =
    tone === "warn"
      ? "bg-amber-50 border-amber-200 text-amber-900"
      : "bg-blue-50 border-blue-100 text-blue-900";
  return (
    <ul className={`rounded-2xl border p-5 flex flex-col gap-2 text-sm ${style}`}>
      {items.map((t) => (
        <li key={t} className="flex gap-2.5">
          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-60" />
          <span className="leading-relaxed">{t}</span>
        </li>
      ))}
    </ul>
  );
}

const FAQ = [
  {
    q: "ยกเลิกการจองได้ไหม เงินคืนไหม",
    a: `แจ้งยกเลิกหรือขอเปลี่ยนวันรับรถได้ครับ

• ยกเลิกการจองทุกกรณี — ไม่คืนค่าจอง
• เปลี่ยนวันรับรถได้ 1 ครั้ง ฟรี (แจ้งล่วงหน้า)
• ถ้ารถที่จองมีปัญหา ทางร้านจัดรถคันอื่นให้ทดแทน`,
  },
  {
    q: "ราคารวมค่าน้ำมันไหม",
    a: `ไม่รวมครับ รับรถมาด้วยน้ำมันระดับไหน เติมคืนระดับเดียวกันตอนส่งรถ
ค่าน้ำมันจ่ายตามการใช้งานจริง ร้านไม่บวกเพิ่ม`,
  },
  {
    q: "ต้องมีบัตรเครดิตไหม",
    a: "ไม่จำเป็นครับ ใช้การโอนเงินได้ สอบถามช่องทางชำระเงินอื่นกับแอดมินได้เลย",
  },
  {
    q: "จองล่วงหน้าได้นานแค่ไหน",
    a: "จองล่วงหน้าได้ถึง 3 เดือน ช่วงเทศกาลอย่างสงกรานต์และปีใหม่แนะนำให้จองเร็ว รถหมดไวและราคาช่วงนั้นจะสูงกว่าปกติ ระบบแสดงให้เห็นก่อนกดยืนยันเสมอ",
  },
  {
    q: "คืนรถช้ากว่าเวลานัดได้ไหม",
    a: `แจ้งล่วงหน้าได้ครับ ระบบจะคิดค่าเช่าตามจำนวนวันจริง
ถ้าเลยเวลานัดโดยไม่แจ้ง อาจกระทบลูกค้าคิวถัดไปและมีค่าปรับ`,
  },
  {
    q: "ขับออกนอกจังหวัดได้ไหม",
    a: "ได้ครับ แต่รบกวนแจ้งแอดมินก่อนออกเดินทาง เผื่อกรณีต้องช่วยเหลือฉุกเฉินระหว่างทาง",
  },
  {
    q: "รถเสียระหว่างเช่าทำอย่างไร",
    a: `โทรหาร้านทันทีที่เบอร์ในหน้าติดต่อเรา อย่าเพิ่งนำรถเข้าอู่เอง
ร้านจะประสานงานและจัดรถทดแทนให้ตามความเหมาะสม`,
  },
  {
    q: "ผูก LINE แล้วได้อะไร",
    a: `ได้รับแจ้งเตือนอัตโนมัติทุกครั้งที่สถานะเปลี่ยน — สลิปผ่าน ยืนยันการจอง
และเตือนก่อนถึงเวลาคืนรถ พร้อมชื่อและเบอร์คนที่จะไปรับรถ ไม่ต้องคอยเปิดเว็บเช็คเอง`,
  },
];

export default async function HowToBookPage() {
  const [settings, points, rates] = await Promise.all([
    getSettings(),
    getPickupPoints(),
    getAfterHoursRates(),
  ]);

  const fee = settings.bookingFee;
  const freePoints = points.filter((p) => p.fee === 0);
  const paidPoints = points.filter((p) => p.fee > 0);

  return (
    <PublicShell>
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <nav className="text-sm text-slate-500 mb-3">
            <Link href="/" className="hover:text-blue-700">หน้าแรก</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">คู่มือการจองรถ</span>
          </nav>
          <h1 className="text-3xl font-bold text-slate-900">คู่มือการจองรถ</h1>
          <p className="text-slate-500 mt-2 max-w-2xl leading-relaxed">
            อ่านครั้งเดียวรู้ครบ ตั้งแต่เลือกรถจนถึงคืนรถและได้เงินประกันคืน
            มีภาพประกอบทุกขั้นตอน
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <nav className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
          <p className="text-xs font-mono uppercase tracking-widest text-amber-700 mb-3">สารบัญ</p>
          <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-slate-700 hover:text-blue-700">
                  {s.t}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="divide-y divide-slate-200">
          <Section
            id="overview"
            title="ภาพรวม 4 ขั้นตอน"
            lead="ทั้งหมดทำผ่านเว็บหรือ LINE ได้ ไม่ต้องโทรมาก็จองได้ ใช้เวลาไม่ถึง 5 นาที"
          >
            <CustomerFlow />
          </Section>

          <Section
            id="step1"
            title="1. เลือกรถและวันเวลา"
            lead="เลือกคันที่ถูกใจ แล้วเลือกวันรับ-คืนบนปฏิทิน ระบบคำนวณราคาให้ทันทีที่เลือก"
          >
            <CalendarLegendDiagram />
            <Tips
              items={[
                "ราคาที่ขึ้นบนการ์ดรถคือราคาปกติต่อวัน ช่วงเทศกาลอาจสูงกว่านี้ ระบบจะแยกบรรทัดให้เห็นตอนเลือกวันแล้ว",
                "วันที่เป็นสีทองคือรถว่างแค่บางช่วง อ่านข้อความใต้ปฏิทินจะบอกว่าว่างตั้งแต่กี่โมง",
                "เลือกวันคืนรถได้ถึง 24:00 ของวันนั้น รับ-คืนได้ทุกเวลา แต่บางช่วงมีค่าบริการเพิ่ม",
                "ถ้าจองคร่อมช่วงเทศกาล ระบบคิดราคาทีละวันแล้วบวกรวม ไม่ได้เหมาราคาเดียวทั้งทริป",
              ]}
            />
          </Section>

          <Section
            id="step2"
            title="2. กรอกข้อมูลและจุดรับรถ"
            lead="ใช้แค่ชื่อกับเบอร์โทร ไม่ต้องสมัครสมาชิก"
          >
            <Tips
              items={[
                "เบอร์โทรสำคัญที่สุด ระบบใช้เบอร์นี้จับคู่การจองกับ LINE ของคุณ และแอดมินใช้ติดต่อกลับ",
                "เลือกจุดรับรถและจุดคืนรถแยกกันได้ ไม่จำเป็นต้องที่เดิม",
                "ถ้าจุดที่ต้องการไม่มีในรายการ เลือก อื่น ๆ แล้วพิมพ์บอกได้เลย แอดมินจะติดต่อยืนยัน",
              ]}
            />
            <p>
              กดยืนยันแล้วระบบจะสร้างรายการจองให้ทันที พร้อมลิงก์หน้าติดตามสถานะ
              <b> เก็บลิงก์นี้ไว้</b> ใช้ดูสถานะ อัปโหลดสลิป และอัปโหลดเอกสารได้ตลอด
            </p>
          </Section>

          <Section
            id="step3"
            title={`3. โอนค่าจอง ${fee.toLocaleString()} บาท แล้วแนบสลิป`}
            lead="ค่าจองคือการกันรถไว้ให้คุณ ยังไม่ใช่ค่าเช่าทั้งหมด"
          >
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <p className="text-xs font-mono uppercase tracking-widest text-blue-700/70 mb-1.5">
                บัญชีรับโอน
              </p>
              <p className="font-semibold text-blue-900 text-lg">{BANK_ACCOUNT}</p>
            </div>
            <SlipDiagram />
            <Tips
              tone="warn"
              items={[
                "ถ่ายสลิปให้เห็นยอดเงิน วันที่ และเวลาโอนชัดเจน สลิปที่อ่านไม่ออกจะถูกตีกลับ",
                "โอนแล้วต้องแนบสลิปด้วย ระบบไม่ได้เช็คยอดเงินเข้าบัญชีอัตโนมัติ",
                "ถ้าไม่แนบสลิปภายในเวลาที่กำหนด รถจะถูกปล่อยให้คนอื่นจองได้",
              ]}
            />
          </Section>

          <Section
            id="step4"
            title="4. รอยืนยันและติดตามสถานะ"
            lead="แอดมินตรวจสลิปแล้วเปลี่ยนสถานะให้ ปกติไม่เกิน 30 นาทีในเวลาทำการ"
          >
            <CustomerStatusFlow />
            <p>
              ถ้าคุณ<b>ผูกบัญชี LINE</b> ไว้ ทุกครั้งที่สถานะเปลี่ยนจะมีข้อความเข้าแชททันที
              รวมถึงข้อความเตือนก่อนถึงเวลาคืนรถ พร้อมชื่อและเบอร์ของคนที่จะไปรับรถ
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/line/connect"
                className="px-6 py-3 rounded-full bg-[#06C755] hover:bg-[#05b34c] text-white text-sm font-semibold transition-colors"
              >
                ผูกบัญชี LINE
              </Link>
              <Link
                href="/my"
                className="px-6 py-3 rounded-full bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-semibold transition-colors"
              >
                ดูการจองของฉัน
              </Link>
            </div>
          </Section>

          <Section
            id="money"
            title="เรื่องเงิน จ่ายอะไรบ้าง"
            lead="มีเงิน 3 ก้อน และหนึ่งในนั้นได้คืน"
          >
            <MoneyTimeline bookingFee={fee} />
            <Tips
              items={[
                `ค่าจอง ${fee.toLocaleString()} บาท เป็นส่วนหนึ่งของค่าเช่า ไม่ใช่ค่าใช้จ่ายเพิ่ม`,
                "เงินประกันรถ 3,000 บาท ชำระวันรับรถ และได้คืนเต็มจำนวนหลังส่งรถถ้าไม่มีความเสียหาย",
                "รถบางรุ่นเงินประกันอาจต่างจากนี้ สอบถามแอดมินก่อนจองได้",
                "ราคาที่เห็นก่อนกดยืนยันคือราคาที่จ่ายจริง ไม่มีค่าใช้จ่ายงอกทีหลัง",
              ]}
            />
          </Section>

          <Section
            id="afterhours"
            title="รับ-คืนรถนอกเวลา"
            lead="ร้านรับ-ส่งได้ 24 ชั่วโมง แต่บางช่วงมีค่าบริการเพิ่ม"
          >
            {rates.length > 0 ? (
              <AfterHoursClock rates={rates} />
            ) : (
              <p>ตอนนี้ไม่มีค่าบริการนอกเวลา รับ-คืนรถได้ทุกเวลาโดยไม่มีค่าใช้จ่ายเพิ่ม</p>
            )}
            <Tips
              items={[
                "ค่าบริการคิดทั้งตอนรับและตอนคืน แล้วบวกกัน — รับตี 5 คืน 3 ทุ่ม โดนสองครั้ง",
                "ระบบเตือนให้เห็นทันทีตอนเลือกเวลา ไม่ใช่ไปโผล่ตอนสรุปยอด",
                "อยากประหยัด เลือกรับ-คืนในช่วงที่ไม่มีค่าบริการ",
              ]}
            />
          </Section>

          <Section
            id="documents"
            title="เอกสารที่ต้องเตรียม"
            lead="อัปโหลดล่วงหน้าในหน้าติดตามการจองได้ จะได้รับรถเร็วขึ้น ไม่ต้องยืนกรอกหน้างาน"
          >
            <DocumentsDiagram />
            <p>
              วันรับรถ เจ้าหน้าที่จะตรวจเอกสารตัวจริงอีกครั้งและทำสัญญาเช่าให้เรียบร้อย
              กรุณาพกเอกสารตัวจริงมาด้วยทุกครั้ง
            </p>
          </Section>

          <Section
            id="places"
            title="จุดรับ-ส่งรถ"
            lead="ส่งรถถึงที่ในเชียงใหม่ เลือกจุดรับและจุดคืนแยกกันได้"
          >
            {points.length === 0 ? (
              <p>สอบถามจุดรับ-ส่งกับแอดมินได้เลยครับ</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {freePoints.length > 0 && (
                  <div className="bg-white rounded-2xl border border-emerald-200 p-5">
                    <p className="font-semibold text-emerald-700 mb-3">รับ-ส่งฟรี</p>
                    <ul className="flex flex-col gap-1.5 text-sm text-slate-700">
                      {freePoints.map((p) => (
                        <li key={p.name}>• {p.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {paidPoints.length > 0 && (
                  <div className="bg-white rounded-2xl border border-amber-200 p-5">
                    <p className="font-semibold text-amber-800 mb-3">มีค่าบริการ</p>
                    <ul className="flex flex-col gap-1.5 text-sm text-slate-700">
                      {paidPoints.map((p) => (
                        <li key={p.name} className="flex justify-between gap-3">
                          <span>• {p.name}</span>
                          <span className="font-semibold tabular-nums">
                            {p.fee.toLocaleString()} ฿
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <p className="text-sm text-slate-600">
              จุดอื่นนอกเหนือจากนี้สอบถามแอดมินได้ ส่วนใหญ่จัดให้ได้ถ้าอยู่ในตัวเมืองเชียงใหม่
            </p>
          </Section>

          <Section
            id="handover"
            title="วันรับรถและวันคืนรถ"
            lead="สองวันนี้ใช้เวลาไม่เกิน 15 นาที ถ้าเตรียมของครบ"
          >
            <HandoverChecklist />
            <Tips
              tone="warn"
              items={[
                "ถ่ายรูปสภาพรถรอบคันตอนรับไว้เสมอ เป็นหลักฐานของทั้งสองฝ่าย",
                "จำระดับน้ำมันตอนรับ แล้วเติมคืนระดับเดียวกัน",
                "ถ้าจะคืนช้ากว่านัด โทรแจ้งล่วงหน้า ระบบคิดค่าเช่าตามวันจริง",
              ]}
            />
          </Section>

          <Section id="faq" title="คำถามที่พบบ่อย">
            <dl className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
              {FAQ.map((f) => (
                <div key={f.q} className="p-5 sm:p-6">
                  <dt className="font-semibold text-slate-900">{f.q}</dt>
                  <dd className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {f.a}
                  </dd>
                </div>
              ))}
            </dl>
          </Section>
        </div>

        <div className="mt-12 rounded-3xl bg-blue-600 text-white p-8 text-center">
          <h2 className="text-2xl font-bold">พร้อมจองแล้วใช่ไหม</h2>
          <p className="mt-2 text-blue-100 text-sm">
            ยังไม่แน่ใจ โทรถามได้เลย {OFFICE_HOURS[0]}
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link
              href="/cars"
              className="px-7 py-3 rounded-full bg-white text-blue-700 font-semibold text-sm hover:bg-blue-50 transition-colors"
            >
              ดูรถทั้งหมด
            </Link>
            {PHONES.slice(0, 1).map((p) => (
              <a
                key={p}
                href={telHref(p)}
                className="px-7 py-3 rounded-full border border-white/40 text-white font-semibold text-sm hover:bg-white/10 transition-colors"
              >
                โทร {p}
              </a>
            ))}
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
