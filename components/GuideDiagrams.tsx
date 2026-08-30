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

/* ─────────── ภาพสำหรับหน้าลูกค้า ─────────── */

/** เงินก้อนไหนจ่ายเมื่อไหร่ */
export function MoneyTimeline({
  bookingFee,
  deposit = 3000,
}: {
  bookingFee: number;
  deposit?: number;
}) {
  const stops = [
    {
      x: 40,
      t: "ตอนจอง",
      m: `ค่าจอง ${bookingFee.toLocaleString()} บาท`,
      s: "โอนแล้วแนบสลิป · กันรถไว้ให้",
      c: GOLD,
      tint: GOLD_TINT,
      line: GOLD_LINE,
      tx: "#8A6E12",
    },
    {
      x: 340,
      t: "วันรับรถ",
      m: "ค่าเช่าส่วนที่เหลือ",
      s: `+ เงินประกัน ${deposit.toLocaleString()} บาท`,
      c: NAVY,
      tint: TINT,
      line: NAVY_LINE,
      tx: NAVY,
    },
    {
      x: 640,
      t: "วันคืนรถ",
      m: `รับเงินประกันคืน ${deposit.toLocaleString()} บาท`,
      s: "ถ้ารถไม่มีความเสียหาย",
      c: OK,
      tint: OK_TINT,
      line: "#CDE8DD",
      tx: OK,
    },
  ];
  return (
    <Frame title="เงินก้อนไหนจ่ายเมื่อไหร่ และก้อนไหนได้คืน" viewBox="0 0 940 250">
      <Defs />
      <line x1={60} y1={70} x2={880} y2={70} stroke={LINE} strokeWidth="3" strokeLinecap="round" />
      {stops.map((s) => (
        <g key={s.t}>
          <circle cx={s.x + 120} cy={70} r={13} fill={s.c} />
          <circle cx={s.x + 120} cy={70} r={22} fill="none" stroke={s.line} strokeWidth="3" />
          <rect x={s.x} y={110} width={240} height={104} rx={20} fill={s.tint} stroke={s.line} strokeWidth="1.5" />
          <text x={s.x + 120} y={140} textAnchor="middle" fontSize="13" fill={MUTED}>
            {s.t}
          </text>
          <text x={s.x + 120} y={166} textAnchor="middle" fontSize="15.5" fontWeight="700" fill={s.tx}>
            {s.m}
          </text>
          <text x={s.x + 120} y={190} textAnchor="middle" fontSize="12.5" fill={MUTED}>
            {s.s}
          </text>
        </g>
      ))}
      <text x={470} y={38} textAnchor="middle" fontSize="13" fill={MUTED}>
        ค่าจองเป็นส่วนหนึ่งของค่าเช่า ไม่ใช่ค่าใช้จ่ายเพิ่ม
      </text>
    </Frame>
  );
}

/** วงกลม 24 ชั่วโมง บอกช่วงที่มีค่าบริการนอกเวลา */
export function AfterHoursClock({
  rates,
}: {
  rates: { label: string; startMinute: number; endMinute: number; fee: number }[];
}) {
  const cx = 200;
  const cy = 200;
  const rOut = 150;
  const rIn = 96;

  // 00:00 อยู่บนสุด แล้วเดินตามเข็มนาฬิกา
  const pt = (minute: number, r: number) => {
    const a = ((minute / 1440) * 360 - 90) * (Math.PI / 180);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };

  const arc = (from: number, to: number) => {
    const span = (to - from + 1440) % 1440 || 1440;
    const [x1, y1] = pt(from, rOut);
    const [x2, y2] = pt(to, rOut);
    const [x3, y3] = pt(to, rIn);
    const [x4, y4] = pt(from, rIn);
    const big = span > 720 ? 1 : 0;
    return `M${x1} ${y1} A${rOut} ${rOut} 0 ${big} 1 ${x2} ${y2} L${x3} ${y3} A${rIn} ${rIn} 0 ${big} 0 ${x4} ${y4} Z`;
  };

  const hhmm = (m: number) =>
    `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  const sorted = [...rates].sort((a, b) => a.startMinute - b.startMinute);

  return (
    <Frame title="นาฬิกา 24 ชั่วโมง — ช่วงสีทองคือรับหรือคืนรถแล้วมีค่าบริการเพิ่ม" viewBox="0 0 940 400">
      <Defs />
      <circle cx={cx} cy={cy} r={rOut} fill="#fff" stroke={LINE} strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={rIn} fill="#fff" stroke={LINE} strokeWidth="1.5" />

      {sorted.map((r) => (
        <path
          key={`${r.startMinute}-${r.endMinute}`}
          d={arc(r.startMinute, r.endMinute)}
          fill={r.fee >= 200 ? "#F6E3B0" : GOLD_TINT}
          stroke={GOLD_LINE}
          strokeWidth="1.5"
        />
      ))}

      {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => {
        const [x, y] = pt(h * 60, rOut + 22);
        return (
          <text key={h} x={x} y={y + 4} textAnchor="middle" fontSize="12.5" fill={MUTED}>
            {String(h).padStart(2, "0")}:00
          </text>
        );
      })}

      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="14" fontWeight="700" fill={OK}>
        ช่วงสีขาว
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize="13" fill={MUTED}>
        ไม่มีค่าบริการ
      </text>

      <text x={430} y={70} fontSize="14" fontWeight="700" fill={NAVY}>
        ช่วงที่มีค่าบริการ
      </text>
      {sorted.map((r, i) => (
        <g key={r.label + i}>
          <rect
            x={430}
            y={90 + i * 46}
            width={16}
            height={16}
            rx={5}
            fill={r.fee >= 200 ? "#F6E3B0" : GOLD_TINT}
            stroke={GOLD_LINE}
            strokeWidth="1.5"
          />
          <text x={458} y={104 + i * 46} fontSize="13.5" fontWeight="600" fill={NAVY}>
            {hhmm(r.startMinute)}–{hhmm(r.endMinute)} น.
          </text>
          <text x={458} y={122 + i * 46} fontSize="12.5" fill={MUTED}>
            {r.label} · เพิ่ม {r.fee.toLocaleString()} บาท
          </text>
        </g>
      ))}

      <rect
        x={430}
        y={96 + sorted.length * 46}
        width={480}
        height={72}
        rx={18}
        fill={TINT}
        stroke={NAVY_LINE}
        strokeWidth="1.5"
      />
      <text x={452} y={124 + sorted.length * 46} fontSize="13" fill={NAVY}>
        คิดทั้งตอนรับรถและตอนคืนรถ แล้วบวกกัน
      </text>
      <text x={452} y={146 + sorted.length * 46} fontSize="12.5" fill={MUTED}>
        เช่น รับ 05:30 คืน 21:00 จะมีค่าบริการสองครั้ง
      </text>
    </Frame>
  );
}

/** วิธีอ่านปฏิทินเลือกวัน */
export function CalendarLegendDiagram() {
  const cells = [
    { d: "12", k: "free" },
    { d: "13", k: "free" },
    { d: "14", k: "part" },
    { d: "15", k: "full" },
    { d: "16", k: "sel" },
    { d: "17", k: "free" },
    { d: "18", k: "free" },
  ] as const;
  const style = {
    free: { fill: "#fff", stroke: LINE, color: MUTED },
    part: { fill: GOLD_TINT, stroke: GOLD_LINE, color: "#8A6E12" },
    full: { fill: "#EDF2F8", stroke: LINE, color: "#94A2B4" },
    sel: { fill: NAVY, stroke: NAVY, color: "#fff" },
  };
  return (
    <Frame title="วิธีอ่านปฏิทินตอนเลือกวัน" viewBox="0 0 940 300">
      <Defs />
      {cells.map((c, i) => {
        const s = style[c.k];
        return (
          <g key={c.d}>
            <rect x={20 + i * 76} y={40} width={64} height={64} rx={18} fill={s.fill} stroke={s.stroke} strokeWidth="1.8" />
            <text x={52 + i * 76} y={80} textAnchor="middle" fontSize="18" fontWeight="600" fill={s.color}>
              {c.d}
            </text>
            {c.k === "full" ? (
              <line x1={32 + i * 76} y1={72} x2={72 + i * 76} y2={72} stroke="#94A2B4" strokeWidth="2" />
            ) : null}
          </g>
        );
      })}

      {[
        { y: 140, fill: "#fff", stroke: LINE, t: "ว่างทั้งวัน", s: "เลือกได้ทุกเวลา" },
        { y: 190, fill: GOLD_TINT, stroke: GOLD_LINE, t: "ว่างบางเวลา", s: "มีคนเช่าอยู่บางช่วง — ระบบจะบอกใต้ปฏิทินว่าว่างตั้งแต่กี่โมง" },
        { y: 240, fill: "#EDF2F8", stroke: LINE, t: "ไม่ว่าง", s: "รถติดทั้งวัน หรือร้านปิดรับจองช่วงนั้น" },
      ].map((r) => (
        <g key={r.t}>
          <rect x={20} y={r.y} width={26} height={26} rx={8} fill={r.fill} stroke={r.stroke} strokeWidth="1.8" />
          <text x={60} y={r.y + 12} fontSize="14" fontWeight="600" fill={NAVY}>
            {r.t}
          </text>
          <text x={60} y={r.y + 30} fontSize="12.5" fill={MUTED}>
            {r.s}
          </text>
        </g>
      ))}

      <rect x={600} y={130} width={320} height={140} rx={20} fill={TINT} stroke={NAVY_LINE} strokeWidth="1.5" />
      <text x={622} y={160} fontSize="14" fontWeight="700" fill={NAVY}>
        เลือกเวลาไม่ได้ใช่ไหม
      </text>
      <text x={622} y={186} fontSize="12.5" fill={MUTED}>
        เวลาที่รถยังอยู่กับลูกค้าคนอื่น
      </text>
      <text x={622} y={205} fontSize="12.5" fill={MUTED}>
        จะถูกปิดไว้ในช่องเลือกเวลา
      </text>
      <text x={622} y={230} fontSize="12.5" fill={MUTED}>
        ระบบจะเลื่อนไปเวลาว่างแรก
      </text>
      <text x={622} y={249} fontSize="12.5" fill={MUTED}>
        ของวันนั้นให้อัตโนมัติ
      </text>
    </Frame>
  );
}

/** เอกสารที่ต้องเตรียม */
export function DocumentsDiagram() {
  const docs = [
    { t: "บัตรประชาชน", s: "หรือ Passport", req: true },
    { t: "ใบขับขี่", s: "ต้องยังไม่หมดอายุ", req: true },
    { t: "เอกสารการเดินทาง", s: "ตั๋วเครื่องบิน หรือที่พัก", req: true },
    { t: "เบอร์โทรติดต่อ", s: "ที่ติดต่อได้จริงระหว่างเช่า", req: true },
  ];
  return (
    <Frame title="เอกสารที่ต้องเตรียม — อัปโหลดล่วงหน้าได้ ไม่ต้องรอกรอกหน้างาน" viewBox="0 0 940 250">
      <Defs />
      {docs.map((d, i) => (
        <g key={d.t}>
          <rect x={20 + i * 232} y={40} width={210} height={130} rx={22} fill="#fff" stroke={NAVY_LINE} strokeWidth="1.8" />
          <rect x={44 + i * 232} y={64} width={58} height={42} rx={9} fill={TINT} stroke={NAVY_LINE} strokeWidth="1.5" />
          <circle cx={62 + i * 232} cy={80} r={7} fill={NAVY_LINE} />
          <line x1={78 + i * 232} y1={78} x2={94 + i * 232} y2={78} stroke={NAVY_LINE} strokeWidth="3" strokeLinecap="round" />
          <line x1={52 + i * 232} y1={96} x2={94 + i * 232} y2={96} stroke={NAVY_LINE} strokeWidth="3" strokeLinecap="round" />
          <text x={44 + i * 232} y={135} fontSize="15" fontWeight="700" fill={NAVY}>
            {d.t}
          </text>
          <text x={44 + i * 232} y={156} fontSize="12.5" fill={MUTED}>
            {d.s}
          </text>
        </g>
      ))}
      <rect x={20} y={188} width={900} height={46} rx={16} fill={OK_TINT} stroke="#CDE8DD" strokeWidth="1.5" />
      <text x={44} y={216} fontSize="13" fill={OK}>
        ชาวต่างชาติ ใช้ Passport พร้อมใบขับขี่สากลหรือใบขับขี่ที่ใช้ในประเทศไทยได้
      </text>
    </Frame>
  );
}

/** ส่งสลิปได้ 2 ทาง */
export function SlipDiagram() {
  return (
    <Frame title="ส่งสลิปได้ 2 ทาง เลือกทางไหนก็ได้" viewBox="0 0 940 230">
      <Defs />
      <Box x={20} y={80} w={200} h={76} label="โอนเงินแล้ว" sub="เก็บสลิปไว้ในเครื่อง" fill="#fff" stroke={LINE} color={NAVY} />
      <Arrow x1={222} y1={100} x2={280} y2={62} />
      <Arrow x1={222} y1={136} x2={280} y2={174} />

      <Box x={284} y={28} w={250} h={70} label="อัปโหลดในหน้าสถานะการจอง" sub="กดลิงก์ที่ได้หลังจอง" />
      <Box x={284} y={140} w={250} h={70} label="ส่งรูปเข้าแชท LINE ของร้าน" sub="ระบบจับคู่ให้อัตโนมัติ" />

      <Arrow x1={536} y1={62} x2={600} y2={100} />
      <Arrow x1={536} y1={174} x2={600} y2={136} />

      <Box x={604} y={80} w={200} h={76} label="แอดมินตรวจสลิป" sub="ปกติไม่เกิน 30 นาที" fill={GOLD_TINT} stroke={GOLD_LINE} color="#8A6E12" />
      <Arrow x1={806} y1={118} x2={856} y2={118} />
      <circle cx={888} cy={118} r={28} fill={OK_TINT} stroke="#CDE8DD" strokeWidth="2" />
      <path d="M876 118l8 9 15-17" stroke={OK} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

/** วันรับรถและวันคืนรถ ต้องเช็คอะไร */
export function HandoverChecklist() {
  return (
    <Frame title="วันรับรถ และวันคืนรถ ต้องดูอะไรบ้าง" viewBox="0 0 940 280">
      <Defs />
      <rect x={20} y={30} width={440} height={228} rx={24} fill={TINT} stroke={NAVY_LINE} strokeWidth="1.5" />
      <text x={48} y={66} fontSize="16" fontWeight="700" fill={NAVY}>
        วันรับรถ
      </text>
      {[
        "ตรวจสภาพรอบคัน ถ่ายรูปเก็บไว้",
        "จำระดับน้ำมันตอนรับ",
        "เช็คยางอะไหล่และอุปกรณ์",
        "ชำระค่าเช่าส่วนที่เหลือและเงินประกัน",
      ].map((t, i) => (
        <g key={t}>
          <circle cx={58} cy={96 + i * 38} r={9} fill="#fff" stroke={NAVY_LINE} strokeWidth="2" />
          <path
            d={`M53 ${96 + i * 38}l4 4 7-8`}
            stroke={NAVY}
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text x={80} y={101 + i * 38} fontSize="13.5" fill={NAVY}>
            {t}
          </text>
        </g>
      ))}

      <rect x={480} y={30} width={440} height={228} rx={24} fill={OK_TINT} stroke="#CDE8DD" strokeWidth="1.5" />
      <text x={508} y={66} fontSize="16" fontWeight="700" fill={OK}>
        วันคืนรถ
      </text>
      {[
        "เติมน้ำมันให้เท่าระดับตอนรับ",
        "เก็บของส่วนตัวออกให้หมด",
        "ส่งรถตามเวลานัด ไม่งั้นคิดเพิ่ม",
        "รับเงินประกันคืนหลังตรวจสภาพ",
      ].map((t, i) => (
        <g key={t}>
          <circle cx={518} cy={96 + i * 38} r={9} fill="#fff" stroke="#CDE8DD" strokeWidth="2" />
          <path
            d={`M513 ${96 + i * 38}l4 4 7-8`}
            stroke={OK}
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text x={540} y={101 + i * 38} fontSize="13.5" fill={OK}>
            {t}
          </text>
        </g>
      ))}
    </Frame>
  );
}

/** สถานะที่ลูกค้าจะเห็น */
export function CustomerStatusFlow() {
  return (
    <Frame title="สถานะที่คุณจะเห็นในหน้าติดตามการจอง" viewBox="0 0 940 200">
      <Defs />
      {[
        { x: 20, t: "รอตรวจสลิป", s: "เราได้รับสลิปแล้ว", f: GOLD_TINT, st: GOLD_LINE, c: "#8A6E12" },
        { x: 260, t: "ยืนยันแล้ว", s: "รถถูกกันไว้ให้คุณ", f: OK_TINT, st: "#CDE8DD", c: OK },
        { x: 500, t: "เสร็จสิ้น", s: "คืนรถเรียบร้อย", f: "#EDF2F8", st: LINE, c: MUTED },
      ].map((c, i) => (
        <g key={c.t}>
          <Box x={c.x} y={60} w={210} h={76} label={c.t} sub={c.s} fill={c.f} stroke={c.st} color={c.c} />
          {i < 2 ? <Arrow x1={c.x + 212} y1={98} x2={c.x + 238} y2={98} /> : null}
        </g>
      ))}
      <rect x={730} y={60} width={190} height={76} rx={16} fill={BAD_TINT} stroke="#F3D5D1" strokeWidth="1.5" />
      <text x={825} y={92} textAnchor="middle" fontSize="15" fontWeight="600" fill={BAD}>
        ยกเลิกแล้ว
      </text>
      <text x={825} y={112} textAnchor="middle" fontSize="12" fill={MUTED}>
        สลิปไม่ผ่าน หรือคุณแจ้งยกเลิก
      </text>
      <text x={470} y={176} textAnchor="middle" fontSize="12.5" fill={MUTED}>
        ทุกครั้งที่สถานะเปลี่ยน ระบบส่ง LINE แจ้งให้ทันที ถ้าคุณผูกบัญชี LINE ไว้
      </text>
    </Frame>
  );
}
