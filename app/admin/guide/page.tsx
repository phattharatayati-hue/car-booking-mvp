export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireStaff } from "@/lib/roles";
import {
  StatusFlow,
  DailyFlow,
  PriceFlow,
  HandoffFlow,
  LineLinkFlow,
} from "@/components/GuideDiagrams";
import { STATUS_LABEL, STATUS_CLASS } from "@/lib/booking-status";

const SECTIONS = [
  { id: "start", title: "เริ่มต้นใช้งาน" },
  { id: "daily", title: "งานประจำวัน" },
  { id: "bookings", title: "รายการจองและสถานะ" },
  { id: "handoff", title: "จัดคนไปรับ-ส่งรถ" },
  { id: "cars", title: "จัดการรถและราคา" },
  { id: "rates", title: "ราคาตามช่วงวัน" },
  { id: "afterhours", title: "ค่าบริการนอกเวลา" },
  { id: "line", title: "แจ้งเตือนทาง LINE" },
  { id: "calendar", title: "Google Calendar" },
  { id: "account", title: "บัญชีและสิทธิ์" },
  { id: "trouble", title: "แก้ปัญหาที่พบบ่อย" },
];

/** หัวข้อใหญ่พร้อมจุดยึดสำหรับสารบัญ */
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
    <section id={id} className="scroll-mt-24 pt-10 first:pt-0">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      {lead ? <p className="mt-1.5 text-slate-600">{lead}</p> : null}
      <div className="mt-4 flex flex-col gap-4 text-slate-700 leading-relaxed">{children}</div>
    </section>
  );
}

/** ขั้นตอนแบบมีลำดับ */
function Steps({ items }: { items: { t: string; d: string }[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {items.map((s, i) => (
        <li key={s.t} className="flex gap-3.5">
          <span className="w-7 h-7 shrink-0 rounded-full bg-blue-50 border border-blue-100 text-blue-700 grid place-items-center text-xs font-bold tabular-nums">
            {i + 1}
          </span>
          <span className="pt-0.5">
            <b className="font-semibold text-slate-900">{s.t}</b>
            <span className="block text-sm text-slate-600 mt-0.5">{s.d}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Note({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warn" | "danger";
  title: string;
  children: React.ReactNode;
}) {
  const style = {
    info: "bg-blue-50 border-blue-100 text-blue-900",
    warn: "bg-amber-50 border-amber-200 text-amber-900",
    danger: "bg-red-50 border-red-200 text-red-900",
  }[tone];
  return (
    <div className={`rounded-2xl border p-5 ${style}`}>
      <p className="font-semibold mb-1">{title}</p>
      <div className="text-sm leading-relaxed opacity-90">{children}</div>
    </div>
  );
}

export default async function AdminGuidePage() {
  await requireStaff();

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">คู่มือการใช้งานระบบ</h1>
        <p className="text-slate-500 text-sm mt-1">
          สำหรับแอดมิน · อ่านครั้งเดียวจบ หรือกดหัวข้อที่ต้องการจากสารบัญ
        </p>
      </div>

      <nav className="bg-white rounded-2xl border border-slate-200 p-5 mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-amber-700 mb-3">สารบัญ</p>
        <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          {SECTIONS.map((s, i) => (
            <li key={s.id} className="flex gap-2">
              <span className="text-slate-400 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <a href={`#${s.id}`} className="text-slate-700 hover:text-blue-700">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="divide-y divide-slate-200">
        <Section
          id="start"
          title="1. เริ่มต้นใช้งาน"
          lead="สามอย่างที่ควรทำในวันแรกที่ได้บัญชี"
        >
          <Steps
            items={[
              {
                t: "เข้าสู่ระบบ",
                d: "ใช้ชื่อผู้ใช้และรหัสผ่านที่ผู้ดูแลระบบให้มา พิมพ์ตัวใหญ่ตัวเล็กยังไงก็เข้าได้",
              },
              {
                t: "เปลี่ยนรหัสผ่าน",
                d: "ไปที่ บัญชีของฉัน แล้วตั้งรหัสใหม่ที่คุณจำได้คนเดียว อย่างน้อย 8 ตัวอักษร",
              },
              {
                t: "ผูก LINE",
                d: "ทำที่หน้า บัญชีของฉัน เช่นกัน ถ้าไม่ผูก คุณจะไม่ได้รับแจ้งเตือนงานที่ได้รับมอบหมาย",
              },
            ]}
          />
          <Note title="เมนูซ้ายมือไม่เหมือนกันทุกคน">
            เมนู <b>ตั้งค่าระบบ</b> และ <b>จัดการแอดมิน</b> เปิดให้เฉพาะผู้ดูแลระบบ
            ถ้าคุณไม่เห็นสองเมนูนี้ถือว่าปกติ — ต้องแก้อะไรตรงนั้นให้แจ้งผู้ดูแลระบบ
          </Note>
        </Section>

        <Section
          id="daily"
          title="2. งานประจำวัน"
          lead="เปิดแดชบอร์ดตอนเช้าแล้วไล่ตามนี้ ไม่มีอะไรตกหล่น"
        >
          <DailyFlow />
          <p>
            แดชบอร์ดสรุปให้แล้วว่าวันนี้มีอะไรต้องทำ — สลิปที่รอตรวจ งานส่งรถ งานรับรถคืน
            และงานที่ยังไม่มีคนรับผิดชอบ กดตัวเลขบนการ์ดเพื่อกระโดดไปยังรายการนั้นได้เลย
          </p>
          <Note tone="warn" title="ตรวจสลิปก่อนเสมอ">
            ระหว่างที่ยังไม่ตรวจ ลูกค้าจะเห็นสถานะ &ldquo;รอตรวจสลิปค่าจอง&rdquo; ค้างอยู่
            และรถก็ถูกกันไว้ไม่ให้คนอื่นจอง ยิ่งช้ายิ่งเสียโอกาสขาย
          </Note>
        </Section>

        <Section
          id="bookings"
          title="3. รายการจองและสถานะ"
          lead="สถานะบอกว่าการจองนั้นเดินไปถึงไหนแล้ว และใครต้องทำอะไรต่อ"
        >
          <StatusFlow />
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_LABEL).map(([key, label]) => (
              <span
                key={key}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border ${STATUS_CLASS[key]}`}
              >
                {label}
              </span>
            ))}
          </div>
          <p>
            เปิดการ์ดของการจองแล้วจะเห็นข้อมูลลูกค้า สลิป เอกสาร และปุ่มเปลี่ยนสถานะ
            ทุกครั้งที่คุณเปลี่ยนสถานะ ระบบจะส่ง LINE แจ้งลูกค้าให้อัตโนมัติ ไม่ต้องพิมพ์บอกเอง
          </p>
          <Note tone="danger" title="ยกเลิกแล้วย้อนไม่ได้">
            การกดยกเลิกจะปล่อยรถคืนเข้าระบบทันที ถ้าลูกค้ากลับมาจองใหม่ต้องสร้างรายการใหม่
            และอาจไม่ได้รถคันเดิมถ้ามีคนจองตัดหน้าไปแล้ว
          </Note>
        </Section>

        <Section
          id="handoff"
          title="4. จัดคนไปรับ-ส่งรถ"
          lead="ระบุว่าใครไปส่ง ใครไปรับคืน แล้วระบบจะแจ้งคนนั้นให้เอง"
        >
          <HandoffFlow />
          <Steps
            items={[
              { t: "เปิดการ์ดของการจอง", d: "ในหน้ารายการจอง เลื่อนลงมาที่กล่อง ใครไปส่ง ใครไปรับ" },
              { t: "เลือกคนและเวลานัด", d: "ถ้าไม่แก้เวลา ระบบใช้เวลารับรถและคืนรถของการจองนั้นเป็นค่าตั้งต้น" },
              { t: "เพิ่มคนที่สองได้", d: "กดเลือกซ้ำอีกครั้ง งานส่งรถกับงานรับคืนเป็นคนละคนกันก็ได้" },
            ]}
          />
          <p>
            คนที่ได้รับงานจะได้ข้อความ LINE ทันที พร้อมทะเบียนรถ ชื่อและเบอร์ลูกค้า จุดนัด และเวลา
            ถ้าเขาเชื่อม Google Calendar ไว้ งานจะไปโผล่ในปฏิทินของเขาด้วย
          </p>
        </Section>

        <Section
          id="cars"
          title="5. จัดการรถและราคา"
          lead="เพิ่มรถ แก้ราคาปกติ และปิดรถชั่วคราวเมื่อเข้าซ่อม"
        >
          <p>
            หน้า <b>จัดการรถ</b> คือทะเบียนรถทั้งหมด ราคาที่กรอกในหน้านี้คือ
            <b> ราคาปกติต่อวัน</b> ที่ใช้กับทุกวันที่ไม่มีช่วงราคาพิเศษ
          </p>
          <Steps
            items={[
              { t: "สถานะรถ", d: "ตั้งเป็น ไม่พร้อมให้เช่า เมื่อรถเข้าซ่อม รถจะหายจากหน้าเว็บทันที" },
              { t: "รถพาร์ทเนอร์", d: "ผูกกับเจ้าของรถแล้วระบุราคาทุน การจองรถกลุ่มนี้จะขึ้นสถานะ รอเช็คกับเจ้าของรถ ก่อนเสมอ" },
              { t: "รูปรถ", d: "ใช้รูปแนวนอน เห็นทั้งคัน ลูกค้าตัดสินใจจากรูปเป็นหลัก" },
            ]}
          />
          <Note title="ปิดรถชั่วคราว กับ ปิดรับจองเป็นช่วง ต่างกัน">
            ตั้งสถานะ <b>ไม่พร้อมให้เช่า</b> คือปิดไม่มีกำหนด รถหายจากเว็บทั้งหมด ·
            ส่วน <b>ปิดรับจองเป็นช่วงวัน</b> (หัวข้อถัดไป) รถยังโชว์อยู่ แค่เลือกวันในช่วงนั้นไม่ได้
          </Note>
        </Section>

        <Section
          id="rates"
          title="6. ราคาตามช่วงวัน"
          lead="ตั้งราคาสูงช่วงเทศกาล ลดราคาช่วงโลว์ซีซั่น หรือปิดรับจองเมื่อรถติดงาน"
        >
          <PriceFlow />
          <Steps
            items={[
              { t: "เข้าหน้ารถคันนั้น", d: "จัดการรถ แล้วกดปุ่ม ราคาตามช่วงวัน และช่วงปิดรับจอง" },
              { t: "เลือกประเภท", d: "ตั้งราคาต่อวันใหม่ หรือ ปิดรับจอง อย่างใดอย่างหนึ่ง" },
              { t: "กรอกวันแรกและวันสุดท้าย", d: "นับรวมวันสุดท้ายด้วย — 13 ถึง 16 คือ 4 วัน" },
              { t: "กรอกราคาเต็มต่อวัน", d: "พิมพ์ 1,800 คือวันละ 1,800 บาท ไม่ใช่ส่วนต่างที่บวกเพิ่ม" },
            ]}
          />
          <Note tone="warn" title="ช่วงราคาห้ามทับกันเอง">
            ถ้าวันที่กรอกชนกับช่วงที่มีอยู่แล้ว ระบบจะไม่ให้บันทึกและบอกว่าทับกับช่วงชื่ออะไร
            ให้แก้วันที่ หรือลบช่วงเดิมก่อน · ส่วนช่วง <b>ปิดรับจอง</b> วางทับช่วงราคาได้และชนะเสมอ
          </Note>
          <Note title="แก้ราคาไม่กระทบบิลเก่า">
            การจองที่ยืนยันไปแล้วใช้ราคาที่บันทึกไว้ตอนจอง การแก้เรทวันนี้มีผลกับการจองใหม่เท่านั้น
            ลูกค้าเก่าจึงไม่โดนเรียกเก็บเพิ่มย้อนหลัง
          </Note>
        </Section>

        <Section
          id="afterhours"
          title="7. ค่าบริการนอกเวลา"
          lead="รับหรือคืนรถนอกเวลาทำการมีค่าบริการเพิ่ม ตั้งช่วงเวลาและราคาเองได้"
        >
          <p>
            หน้า <b>ค่าบริการนอกเวลา</b> มีแถบ 24 ชั่วโมงให้ดูภาพรวมว่าช่วงไหนคิดเงินเท่าไหร่
            ค่าบริการคิด <b>ทั้งตอนรับรถและตอนคืนรถ แล้วบวกกัน</b> เช่น รับตี 5 คืน 3 ทุ่ม
            ก็โดนสองครั้ง
          </p>
          <p>
            ช่วงเวลาข้ามเที่ยงคืนตั้งได้ตามปกติ เช่น 22:00–05:00 ระบบเข้าใจว่าเป็นช่วงเดียวกัน
            และเวลาที่ไม่ตกอยู่ในช่วงไหนเลยคือฟรี
          </p>
          <Note tone="warn" title="อย่าตั้งช่วงทับกัน">
            ระบบป้องกันให้แล้วตอนบันทึก แต่ถ้ามีข้อมูลเก่าที่ทับกันอยู่ ระบบจะเลือกช่วงที่
            <b>แพงที่สุด</b> เพื่อให้ผลลัพธ์คาดเดาได้
          </Note>
        </Section>

        <Section
          id="line"
          title="8. แจ้งเตือนทาง LINE"
          lead="ผูกครั้งเดียว แล้วรับงานและการแจ้งเตือนทั้งหมดในแชท"
        >
          <LineLinkFlow />
          <p>
            รหัส 6 หลักมีอายุ 10 นาที และใช้ได้ครั้งเดียว ถ้าหมดอายุให้กดขอใหม่ได้เรื่อย ๆ
            เมื่อผูกแล้วคุณจะได้รับ: งานรับ-ส่งที่ถูกมอบหมาย การแจ้งเตือนสลิปใหม่
            และข้อความทวงเมื่อมีงานที่ยังไม่มีคนรับ
          </p>
          <Note title="เปลี่ยนบัญชี LINE หรือมีคนลาออก">
            ผู้ดูแลระบบตัดการผูกให้ได้ที่หน้า จัดการแอดมิน แล้วให้เจ้าตัวผูกใหม่ด้วยรหัสใหม่
          </Note>
        </Section>

        <Section
          id="calendar"
          title="9. Google Calendar"
          lead="ให้งานรับ-ส่งรถไปโผล่ในปฏิทินส่วนตัวของคุณ"
        >
          <p>
            เชื่อมที่หน้า <b>บัญชีของฉัน</b> ระบบจะสร้างปฏิทินแยกชื่อ <b>งานรับส่งรถ</b> ให้
            ไม่ปนกับปฏิทินส่วนตัว และจะเห็นเฉพาะงานที่มอบหมายให้คุณเท่านั้น
          </p>
          <p>
            งานนัด 09:00 จะลงปฏิทินเป็น <b>08:30–09:30</b> เผื่อเวลาเดินทางไว้ 30 นาที
            เพื่อกันไม่ให้คุณเผลอรับนัดอื่นชนช่วงที่ต้องออกรถ
          </p>
          <Note tone="warn" title="ถ้าขึ้นว่า ปฏิทินไม่ผ่าน">
            แปลว่าซิงก์ล้มเหลว กด <b>ซิงก์ใหม่</b> ที่การ์ดงานนั้น ถ้ายังไม่ได้ ให้ตัดการเชื่อม
            แล้วเชื่อมใหม่ที่หน้าบัญชีของฉัน · การจองยังทำงานปกติแม้ปฏิทินจะซิงก์ไม่ได้
          </Note>
        </Section>

        <Section
          id="account"
          title="10. บัญชีและสิทธิ์"
          lead="ใครทำอะไรได้บ้าง"
        >
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-3 font-medium">ทำอะไรได้</th>
                  <th className="px-5 py-3 font-medium">แอดมิน</th>
                  <th className="px-5 py-3 font-medium">ผู้ดูแลระบบ</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["ตรวจสลิป เปลี่ยนสถานะการจอง", true, true],
                  ["จัดคนไปรับ-ส่งรถ", true, true],
                  ["เพิ่ม/แก้รถ และตั้งราคาตามช่วงวัน", true, true],
                  ["ตั้งค่าบริการนอกเวลา", true, true],
                  ["ตั้งค่าระบบ (เวลาเตือนคืนรถ ค่ามัดจำ)", false, true],
                  ["สร้างบัญชีแอดมิน ตั้งรหัสผ่านใหม่", false, true],
                  ["ตัดการผูก LINE / ปฏิทิน ของคนอื่น", false, true],
                ].map(([t, a, d]) => (
                  <tr key={t as string} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3 text-slate-700">{t as string}</td>
                    <td className="px-5 py-3">
                      {a ? <span className="text-emerald-600 font-semibold">ได้</span> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {d ? <span className="text-emerald-600 font-semibold">ได้</span> : <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="trouble" title="11. แก้ปัญหาที่พบบ่อย">
          <dl className="flex flex-col divide-y divide-slate-100">
            {[
              {
                q: "ลูกค้าบอกว่าโอนแล้ว แต่ไม่เห็นสลิปในระบบ",
                a: "ให้ลูกค้าส่งรูปสลิปเข้าแชท LINE ของร้านโดยตรง ระบบจะจับคู่กับการจองล่าสุดของเบอร์นั้นให้อัตโนมัติ ถ้ายังไม่ขึ้น แปลว่าเขายังไม่ได้ผูกเบอร์กับ LINE — ให้เขาไปที่หน้าเชื่อมต่อ LINE บนเว็บก่อน",
              },
              {
                q: "จองไม่ได้ ขึ้นว่ารถถูกจองแล้ว ทั้งที่ปฏิทินดูว่าง",
                a: "ปฏิทินดูเป็นรายวัน แต่ระบบเช็คถึงระดับชั่วโมง เช่น รถคืน 13:00 วันนั้นจึงรับได้หลัง 13:00 เท่านั้น ลองเลื่อนเวลารับรถให้ช้าลง หรือดูข้อความสีเหลืองใต้ปฏิทินที่บอกช่วงที่ไม่ว่าง",
              },
              {
                q: "ราคาที่ลูกค้าเห็นไม่ตรงกับที่คิดไว้",
                a: "ไล่ดู 3 อย่างตามลำดับ — ราคาปกติของรถ, ช่วงราคาตามวันที่ตั้งไว้, และค่าบริการนอกเวลาของเวลารับและเวลาคืน หน้าจองแยกบรรทัดให้เห็นครบทุกก้อนอยู่แล้ว",
              },
              {
                q: "ไม่ได้รับแจ้งเตือน LINE เลย",
                a: "เช็คว่าผูก LINE แล้วหรือยังที่หน้าบัญชีของฉัน ถ้าผูกแล้วให้กดส่งข้อความทดสอบ ถ้ายังเงียบ อาจเผลอบล็อกบัญชี LINE ของร้านไว้ ให้ปลดบล็อกแล้วผูกใหม่",
              },
              {
                q: "ลูกค้าขอเลื่อนวันคืนรถ",
                a: "แก้วันเวลาในการ์ดของการจองได้เลย ระบบจะคิดราคาใหม่ตามจำนวนวันจริงและช่วงราคาที่เกี่ยวข้อง อย่าลืมแจ้งส่วนต่างให้ลูกค้าทราบก่อนบันทึก",
              },
            ].map((f) => (
              <div key={f.q} className="py-4">
                <dt className="font-semibold text-slate-900">{f.q}</dt>
                <dd className="mt-1 text-sm text-slate-600 leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>

      <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-slate-600 text-sm">
          หาสิ่งที่ต้องการไม่เจอ หรือระบบทำงานไม่เหมือนในคู่มือ
        </p>
        <Link
          href="/admin"
          className="inline-block mt-3 px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
        >
          กลับไปแดชบอร์ด
        </Link>
      </div>
    </div>
  );
}
