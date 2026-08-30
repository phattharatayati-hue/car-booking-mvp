/**
 * ภาพประกอบคู่มือ — SVG ล้วน ไม่มี state ไม่ต้องโหลดไลบรารี
 * ใช้สีจากระบบ (กรมท่า/ทอง/เขียว/แดง) และย่อขยายตามความกว้างของกล่อง
 */

const NAVY = "#26456E";
const NAVY_LINE = "#C3D6EC";
const TINT = "#EAF1FA";
const GOLD = "#C9A227";
const GOLD_TINT = "#FBF2DA";
const GOLD_LINE = "#EEDFB4";
const OK = "#2F8567";
const OK_TINT = "#E6F4EE";
const BAD = "#B34438";
const BAD_TINT = "#FBEBE9";
const MUTED = "#647388";
const LINE = "#E1E9F2";

function Frame({
  title,
  children,
  viewBox,
}: {
  title: string;
  viewBox: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="my-6">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <svg
          viewBox={viewBox}
          role="img"
          aria-label={title}
          className="w-full h-auto min-w-[520px]"
          fontFamily="var(--font-sans)"
        >
          <title>{title}</title>
          {children}
        </svg>
      </div>
      <figcaption className="mt-2 text-xs text-slate-500 text-center">{title}</figcaption>
    </figure>
  );
}

/** กล่องขั้นตอนแบบมุมมน */
function Box({
  x,
  y,
  w = 150,
  h = 62,
  fill = TINT,
  stroke = NAVY_LINE,
  color = NAVY,
  label,
  sub,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  fill?: string;
  stroke?: string;
  color?: string;
  label: string;
  sub?: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={16} fill={fill} stroke={stroke} strokeWidth="1.5" />
      <text
        x={x + w / 2}
        y={sub ? y + h / 2 - 3 : y + h / 2 + 5}
        textAnchor="middle"
        fontSize="15"
        fontWeight="600"
        fill={color}
      >
        {label}
      </text>
      {sub ? (
        <text x={x + w / 2} y={y + h / 2 + 17} textAnchor="middle" fontSize="12" fill={MUTED}>
          {sub}
        </text>
      ) : null}
    </g>
  );
}

/** ลูกศรพร้อมคำกำกับ */
function Arrow({
  x1,
  y1,
  x2,
  y2,
  label,
  color = MUTED,
  dashed = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  color?: string;
  dashed?: boolean;
}) {
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth="1.8"
        markerEnd="url(#ar)"
        strokeDasharray={dashed ? "5 4" : undefined}
      />
      {label ? (
        <text
          x={(x1 + x2) / 2}
          y={y1 === y2 ? y1 - 9 : (y1 + y2) / 2 - 6}
          textAnchor="middle"
          fontSize="12"
          fill={color}
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}

function Defs() {
  return (
    <defs>
      <marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0L10 5L0 10z" fill={MUTED} />
      </marker>
    </defs>
  );
}

/** 1. เส้นทางสถานะของการจอง */
export function StatusFlow() {
  return (
    <Frame title="เส้นทางสถานะของการจอง — จากลูกค้ากดจอง จนถึงคืนรถ" viewBox="0 0 940 330">
      <Defs />
      <Box x={10} y={130} label="ลูกค้ากดจอง" sub="เว็บ / LINE" fill="#fff" stroke={LINE} />
      <Arrow x1={162} y1={161} x2={205} y2={161} />

      <Box x={210} y={40} w={160} label="รอเช็คกับเจ้าของรถ" sub="รถพาร์ทเนอร์" fill="#F3EFFB" stroke="#DDD2F2" color="#5B45A8" />
      <Box x={210} y={220} w={160} label="รอตรวจสลิปค่าจอง" sub="รถของร้านเอง" fill={GOLD_TINT} stroke={GOLD_LINE} color="#8A6E12" />

      <Arrow x1={205} y1={150} x2={208} y2={80} dashed />
      <Arrow x1={205} y1={175} x2={208} y2={245} />

      <Arrow x1={372} y1={71} x2={420} y2={110} label="แอดมินรับ" />
      <Arrow x1={372} y1={251} x2={420} y2={200} label="สลิปผ่าน" color={OK} />

      <Box x={425} y={130} w={150} label="ยืนยันแล้ว" sub="รถถูกกันไว้" fill={OK_TINT} stroke="#CDE8DD" color={OK} />
      <Arrow x1={577} y1={161} x2={625} y2={161} label="ส่งรถ · รับคืน" />

      <Box x={630} y={130} w={150} label="เสร็จสิ้น" sub="คืนมัดจำแล้ว" fill="#EDF2F8" stroke={LINE} color={MUTED} />

      <Box x={630} y={30} w={150} h={52} label="รถไม่ว่าง" fill={BAD_TINT} stroke="#F3D5D1" color={BAD} />
      <Box x={630} y={252} w={150} h={52} label="ยกเลิกแล้ว" fill={BAD_TINT} stroke="#F3D5D1" color={BAD} />
      <Arrow x1={372} y1={58} x2={628} y2={56} label="เจ้าของรถปฏิเสธ" color={BAD} />
      <Arrow x1={372} y1={278} x2={628} y2={278} label="สลิปไม่ผ่าน / ลูกค้ายกเลิก" color={BAD} />

      <text x={800} y={140} fontSize="12" fill={MUTED}>สถานะ 3 อันแรก</text>
      <text x={800} y={158} fontSize="12" fill={MUTED}>กันรถไว้ไม่ให้</text>
      <text x={800} y={176} fontSize="12" fill={MUTED}>คนอื่นจองซ้ำ</text>
    </Frame>
  );
}

/** 2. งานประจำวันของแอดมิน */
export function DailyFlow() {
  return (
    <Frame title="งานประจำวันของแอดมิน — เปิดแดชบอร์ดแล้วไล่จากซ้ายไปขวา" viewBox="0 0 940 230">
      <Defs />
      {[
        { x: 10, t: "1 ตรวจสลิป", s: "รายการจอง" },
        { x: 200, t: "2 จัดคนรับ-ส่ง", s: "ในการ์ดการจอง" },
        { x: 390, t: "3 ส่งรถ", s: "ถ่ายรูปสภาพรถ" },
        { x: 580, t: "4 รับรถคืน", s: "เช็คน้ำมัน/รอยขีด" },
        { x: 770, t: "5 คืนมัดจำ", s: "ปิดงาน" },
      ].map((c, i) => (
        <g key={c.x}>
          <Box
            x={c.x}
            y={70}
            w={160}
            h={70}
            label={c.t}
            sub={c.s}
            fill={i === 0 ? GOLD_TINT : TINT}
            stroke={i === 0 ? GOLD_LINE : NAVY_LINE}
            color={i === 0 ? "#8A6E12" : NAVY}
          />
          {i < 4 ? <Arrow x1={c.x + 162} y1={105} x2={c.x + 188} y2={105} /> : null}
        </g>
      ))}
      <text x={90} y={175} fontSize="12" fill={MUTED} textAnchor="middle">ทำก่อนเสมอ</text>
      <text x={90} y={192} fontSize="12" fill={MUTED} textAnchor="middle">ลูกค้ารออยู่</text>
      <text x={280} y={175} fontSize="12" fill={MUTED} textAnchor="middle">ระบบทวงถ้าลืม</text>
      <text x={470} y={40} fontSize="13" fill={NAVY} textAnchor="middle" fontWeight="600">
        ทุกขั้นตอนระบบแจ้ง LINE ให้ลูกค้าอัตโนมัติ
      </text>
    </Frame>
  );
}

/** 3. การคิดราคา */
export function PriceFlow() {
  return (
    <Frame title="ระบบคิดราคาอย่างไร — ค่าเช่ารายวัน บวกค่านอกเวลา" viewBox="0 0 940 300">
      <Defs />
      <text x={20} y={30} fontSize="14" fontWeight="600" fill={NAVY}>
        ตัวอย่าง: จอง 11–16 เม.ย. · ราคาปกติ 1,200 · ช่วงสงกรานต์ 13–16 เม.ย. วันละ 1,800
      </text>

      {[
        { d: "11", p: "1,200", hi: false },
        { d: "12", p: "1,200", hi: false },
        { d: "13", p: "1,800", hi: true },
        { d: "14", p: "1,800", hi: true },
        { d: "15", p: "1,800", hi: true },
        { d: "16", p: "1,800", hi: true },
      ].map((c, i) => (
        <g key={c.d}>
          <rect
            x={20 + i * 96}
            y={55}
            width={86}
            height={78}
            rx={16}
            fill={c.hi ? GOLD_TINT : "#fff"}
            stroke={c.hi ? GOLD_LINE : LINE}
            strokeWidth="1.5"
          />
          <text x={63 + i * 96} y={82} textAnchor="middle" fontSize="13" fill={MUTED}>
            {c.d} เม.ย.
          </text>
          <text
            x={63 + i * 96}
            y={110}
            textAnchor="middle"
            fontSize="16"
            fontWeight="700"
            fill={c.hi ? "#8A6E12" : NAVY}
          >
            {c.p}
          </text>
        </g>
      ))}

      <line x1={20} y1={155} x2={596} y2={155} stroke={LINE} strokeWidth="1.5" />
      <text x={20} y={180} fontSize="14" fill={MUTED}>ค่าเช่ารวม 6 วัน</text>
      <text x={596} y={180} textAnchor="end" fontSize="16" fontWeight="700" fill={NAVY}>9,600</text>

      <text x={20} y={210} fontSize="14" fill="#8A6E12">
        + ค่ารับรถนอกเวลา (05:30 อยู่ในช่วง 05:00–07:00)
      </text>
      <text x={596} y={210} textAnchor="end" fontSize="16" fontWeight="700" fill="#8A6E12">100</text>

      <line x1={20} y1={228} x2={596} y2={228} stroke={NAVY_LINE} strokeWidth="2" />
      <text x={20} y={256} fontSize="15" fontWeight="700" fill={NAVY}>ยอดที่ลูกค้าจ่าย</text>
      <text x={596} y={256} textAnchor="end" fontSize="20" fontWeight="700" fill={NAVY}>9,700</text>

      <rect x={630} y={55} width={290} height={200} rx={20} fill={TINT} stroke={NAVY_LINE} strokeWidth="1.5" />
      <text x={650} y={85} fontSize="14" fontWeight="700" fill={NAVY}>จำง่าย ๆ</text>
      <text x={650} y={112} fontSize="13" fill={MUTED}>• คิดทีละวัน ไม่ใช่เหมาทั้งก้อน</text>
      <text x={650} y={136} fontSize="13" fill={MUTED}>• วันไหนไม่มีช่วงพิเศษ</text>
      <text x={662} y={155} fontSize="13" fill={MUTED}>ใช้ราคาปกติของรถ</text>
      <text x={650} y={180} fontSize="13" fill={MUTED}>• ค่านอกเวลาคิดทั้งตอนรับ</text>
      <text x={662} y={199} fontSize="13" fill={MUTED}>และตอนคืน แล้วบวกกัน</text>
      <text x={650} y={224} fontSize="13" fill={MUTED}>• มัดจำแยกจากค่าเช่า</text>
      <text x={662} y={243} fontSize="13" fill={MUTED}>คืนให้เมื่อส่งรถเรียบร้อย</text>
    </Frame>
  );
}

/** 4. งานรับ-ส่งรถและปฏิทิน */
export function HandoffFlow() {
  return (
    <Frame title="มอบหมายงานรับ-ส่งรถ แล้วงานไปโผล่ที่ไหนบ้าง" viewBox="0 0 940 280">
      <Defs />
      <Box x={20} y={100} w={190} h={76} label="แอดมินจัดคน" sub="ในการ์ดของการจอง" fill={GOLD_TINT} stroke={GOLD_LINE} color="#8A6E12" />
      <Arrow x1={212} y1={138} x2={268} y2={138} />

      <Box x={272} y={100} w={190} h={76} label="ระบบบันทึกงาน" sub="ใครไปส่ง ใครไปรับ กี่โมง" />
      <Arrow x1={464} y1={120} x2={520} y2={62} />
      <Arrow x1={464} y1={138} x2={520} y2={138} />
      <Arrow x1={464} y1={156} x2={520} y2={214} />

      <Box x={524} y={30} w={200} h={64} label="แจ้ง LINE คนรับงาน" sub="พร้อมเบอร์ลูกค้าและจุดนัด" fill={OK_TINT} stroke="#CDE8DD" color={OK} />
      <Box x={524} y={106} w={200} h={64} label="ลง Google Calendar" sub="กันเวลาเดินทาง 30 นาที" fill={OK_TINT} stroke="#CDE8DD" color={OK} />
      <Box x={524} y={182} w={200} h={64} label="ขึ้นในแดชบอร์ด" sub="คิวงานของวันนี้" fill={OK_TINT} stroke="#CDE8DD" color={OK} />

      <rect x={750} y={78} width={172} height={120} rx={20} fill={BAD_TINT} stroke="#F3D5D1" strokeWidth="1.5" />
      <text x={836} y={108} textAnchor="middle" fontSize="14" fontWeight="700" fill={BAD}>ถ้าลืมจัดคน</text>
      <text x={836} y={134} textAnchor="middle" fontSize="12.5" fill={BAD}>ระบบทวงทาง LINE</text>
      <text x={836} y={154} textAnchor="middle" fontSize="12.5" fill={BAD}>ก่อนถึงวันงาน</text>
      <text x={836} y={178} textAnchor="middle" fontSize="12.5" fill={MUTED}>ไม่มีใครตกหล่น</text>

      <text x={470} y={272} textAnchor="middle" fontSize="12.5" fill={MUTED}>
        นัด 09:00 จะลงปฏิทินเป็น 08:30–09:30 เพื่อกันคนรับงานตั้งนัดอื่นชนช่วงเดินทาง
      </text>
    </Frame>
  );
}

/** 5. ผูก LINE ของแอดมิน */
export function LineLinkFlow() {
  return (
    <Frame title="ผูก LINE เพื่อรับแจ้งเตือน — ทำครั้งเดียว ใช้ได้ตลอด" viewBox="0 0 940 170">
      <Defs />
      {[
        { x: 20, t: "เพิ่มเพื่อน", s: "LINE ของร้าน" },
        { x: 250, t: "ขอรหัส 6 หลัก", s: "หน้า บัญชีของฉัน" },
        { x: 480, t: "พิมพ์รหัสในแชท", s: "ภายใน 10 นาที" },
        { x: 710, t: "ผูกสำเร็จ", s: "รับแจ้งเตือนได้เลย" },
      ].map((c, i) => (
        <g key={c.x}>
          <Box
            x={c.x}
            y={50}
            w={200}
            h={72}
            label={`${i + 1}. ${c.t}`}
            sub={c.s}
            fill={i === 3 ? OK_TINT : TINT}
            stroke={i === 3 ? "#CDE8DD" : NAVY_LINE}
            color={i === 3 ? OK : NAVY}
          />
          {i < 3 ? <Arrow x1={c.x + 202} y1={86} x2={c.x + 228} y2={86} /> : null}
        </g>
      ))}
    </Frame>
  );
}

/** 6. ขั้นตอนของลูกค้า (ใช้ในหน้าเว็บสาธารณะ) */
export function CustomerFlow() {
  return (
    <Frame title="จองรถ 4 ขั้นตอน ใช้เวลาไม่ถึง 5 นาที" viewBox="0 0 940 190">
      <Defs />
      {[
        { x: 20, t: "เลือกรถ", s: "และวันเวลารับ-คืน" },
        { x: 250, t: "กรอกข้อมูล", s: "ชื่อ เบอร์ จุดรับรถ" },
        { x: 480, t: "โอนค่าจอง", s: "แล้วแนบสลิป" },
        { x: 710, t: "รอยืนยัน", s: "แจ้งผลทาง LINE" },
      ].map((c, i) => (
        <g key={c.x}>
          <Box
            x={c.x}
            y={60}
            w={200}
            h={72}
            label={`${i + 1}. ${c.t}`}
            sub={c.s}
            fill={i === 3 ? OK_TINT : TINT}
            stroke={i === 3 ? "#CDE8DD" : NAVY_LINE}
            color={i === 3 ? OK : NAVY}
          />
          {i < 3 ? <Arrow x1={c.x + 202} y1={96} x2={c.x + 228} y2={96} /> : null}
        </g>
      ))}
      <text x={470} y={168} textAnchor="middle" fontSize="12.5" fill={MUTED}>
        ราคาที่เห็นก่อนกดยืนยันคือราคาที่จ่ายจริง ไม่มีค่าใช้จ่ายเพิ่มทีหลัง
      </text>
    </Frame>
  );
}
