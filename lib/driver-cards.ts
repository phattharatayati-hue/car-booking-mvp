/**
 * การ์ด LINE ของคนรับ-ส่งรถ — ฟังก์ชันล้วน ไม่แตะฐานข้อมูล
 *
 * แยกออกจาก lib/driver-jobs.ts เพื่อให้หน้าตั้งค่าการแจ้งเตือนวาดตัวอย่างได้
 * จากโค้ดตัวเดียวกับที่ส่งจริง (driver-jobs เตรียมข้อมูล แล้วเรียกฟังก์ชันในไฟล์นี้)
 * แก้หน้าตาการ์ดที่นี่ที่เดียว ตัวอย่างในหลังบ้านเปลี่ยนตามทันที
 */
import { formatBangkokDateTime, formatBangkokTime } from "@/lib/settings";
import { HANDOFF_LABEL, TRAVEL_BUFFER_MIN, type HandoffKind } from "@/lib/assignments";
import {
  card,
  kv,
  amountBox,
  noteBox,
  bullets,
  sectionTitle,
  btnGold,
  btn,
  line,
} from "@/lib/line-flex";
import { rentLineText, type RentLine } from "@/lib/rent-breakdown";

const GREEN = "#1E5841";

/** เวลาออกเดินทาง — ก่อนเวลานัดตามระยะเผื่อเดินทาง */
export function leaveAt(meetAt: Date): Date {
  return new Date(meetAt.getTime() - TRAVEL_BUFFER_MIN * 60000);
}

/** ลิงก์ค้นหาจุดนัดใน Google Maps */
export function mapsLink(place: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}

/** วันเวลาแบบสั้น "5 ธ.ค. 06:30" — การ์ดสรุปงานไม่ต้องมีปี อ่านเร็วกว่า */
export function shortWhen(d: Date): string {
  const date = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
  }).format(new Date(d));
  return `${date} ${formatBangkokTime(d)}`;
}

/** เบอร์โทรเหลือแต่ตัวเลข ใช้ทำลิงก์ tel: ให้กดโทรออกได้ */
function telUri(phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits.length >= 9 ? `tel:${digits}` : null;
}

/* ------------------------------------------------------------------ */
/* การ์ดงาน — ส่งตอนมอบหมาย / แก้ไข / ถอนงาน                            */
/* ------------------------------------------------------------------ */

export type JobCardInput = {
  jobId: string;
  kind: HandoffKind;
  meetAt: Date;
  carLabel: string;
  plate: string;
  customerName: string;
  customerPhone: string;
  place: string | null;
  note: string | null;
  /** ยอดเก็บหน้างาน — มีเฉพาะงานส่งรถ */
  money: { rental: number; deposit: number; total: number } | null;
  /** ข้อความนำ เช่น "🔁 แก้ไขรายละเอียดงาน" หรือข่าวถอนงาน — ไม่มีคืองานปกติ */
  headline?: string;
  ackedAt: Date | null;
  jobUrl: string;
  /** ข้อความล้วนสำหรับ altText (แสดงในการแจ้งเตือนบนมือถือ) */
  altText: string;
};

export function flexJobCard(d: JobCardInput) {
  /* สีแถบหัวบอกชนิดของข่าว
       ไม่มี headline = งานปกติ (เขียว)
       🔁 = แก้ไขรายละเอียด (ทอง/เตือน)
       อื่นๆ = ถอนงาน (แดง) */
  const tone: "green" | "warn" | "danger" = !d.headline
    ? "green"
    : d.headline.startsWith("🔁")
      ? "warn"
      : "danger";

  const ackButton = d.ackedAt
    ? {
        type: "box",
        layout: "vertical",
        paddingAll: "8px",
        contents: [
          {
            type: "text",
            text: `✓ รับทราบแล้ว ${formatBangkokTime(d.ackedAt)} น.`,
            size: "sm",
            color: "#067A4C",
            weight: "bold",
            align: "center",
          },
        ],
      }
    : {
        type: "button",
        style: "primary",
        color: GREEN,
        height: "sm",
        action: {
          type: "postback",
          label: "รับทราบ",
          data: `action=job_ack&id=${d.jobId}`,
          displayText: "รับทราบ",
        },
      };

  return card({
    altText: d.altText,
    title: HANDOFF_LABEL[d.kind],
    subtitle: `${formatBangkokDateTime(d.meetAt)} · ออกเดินทาง ${formatBangkokTime(
      leaveAt(d.meetAt)
    )} น.`,
    tone,
    body: [
      ...(d.headline ? [noteBox([d.headline], tone === "danger" ? "warn" : "cream")] : []),
      kv("รถ", d.carLabel),
      kv("ทะเบียน", d.plate),
      kv("ลูกค้า", d.customerName),
      kv("โทร", d.customerPhone),
      ...(d.place ? [kv("จุดนัด", d.place)] : []),
      ...(d.money
        ? [
            line,
            amountBox(
              "เก็บเงินหน้างาน",
              d.money.total,
              `ค่าเช่าคงเหลือ ${d.money.rental.toLocaleString()} + เงินประกัน ${d.money.deposit.toLocaleString()} บาท`
            ),
          ]
        : []),
      ...(d.note ? [noteBox([`หมายเหตุ: ${d.note}`])] : []),
      line,
      sectionTitle("ต้องทำหน้างาน"),
      bullets([
        "ขอดูบัตรประชาชนและใบขับขี่ตัวจริง",
        "ถ่ายรูปรอบคันก่อนส่งมอบ",
        "จดเลขไมล์และระดับน้ำมัน",
        "ส่งรูปและปิดงานที่ปุ่มด้านล่าง",
      ]),
    ],
    /* ปุ่มเดียวพาไปหน้างาน — ดูเอกสาร ส่งรูป จดเลขไมล์ ปิดงาน อยู่ที่นั่นทั้งหมด
       ลิงก์นี้ผูกกับงานชิ้นเดียว จึงไม่มีทางเข้าผิดใบ */
    buttons: [btnGold("เปิดหน้างาน (เอกสาร · ส่งรูป · ปิดงาน)", d.jobUrl), ackButton],
  });
}

/** ข้อความนำบนการ์ดงานตามชนิดการส่ง — ใช้ทั้งตอนส่งจริงและในหน้าตัวอย่าง */
export const JOB_HEADLINE = {
  updated: "⚠️ งานนี้มีการเปลี่ยนแปลง",
  resend: "🔁 ส่งซ้ำ — รายละเอียดเหมือนเดิม",
} as const;

/** ถอนงาน / ยกเลิกการจอง — ส่งเป็นข้อความสั้น ไม่ใช่การ์ดงาน */
export function jobCancelledText(d: {
  kind: HandoffKind;
  meetAt: Date;
  carLabel: string;
  plate: string;
  bookingId: string;
}): string {
  return [
    "❌ งานนี้ถูกยกเลิก ไม่ต้องไปแล้วครับ",
    "",
    `${HANDOFF_LABEL[d.kind]} ${formatBangkokDateTime(d.meetAt)}`,
    `รถ: ${d.carLabel} (${d.plate})`,
    `รหัสจอง: ${d.bookingId.slice(0, 8).toUpperCase()}`,
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* การ์ดตอบกลับตอนกด "รับทราบ"                                          */
/* ------------------------------------------------------------------ */

export type JobAckInput = {
  kind: HandoffKind;
  meetAt: Date;
  carLabel: string;
  plate: string;
  customerName: string;
  customerPhone: string;
  start: Date;
  end: Date;
  pickupPlace: string | null;
  returnPlace: string | null;
  /** ค่าเช่าแยกช่วงราคา — null คือคำนวณไม่ได้ จะแสดงยอดจองรวมแทน */
  rent: { days: number; segments: RentLine[]; rentTotal: number } | null;
  /** ยอดจองทั้งหมดที่บันทึกไว้ */
  totalPrice: number;
  deposit: number;
  /** จุดนัดที่ไม่ใช่จุดประจำ — ใส่แล้วจะมีปุ่มเปิดแผนที่ */
  mapPlace: string | null;
};

/**
 * เรียงตามที่หน้างานต้องใช้: รถ → ลูกค้า+เบอร์ → รับ/คืน → ค่าเช่า ประกัน
 * ปุ่มโทรหาลูกค้าอยู่ในการ์ดเลย ไม่ต้องเลื่อนกลับขึ้นไปหาการ์ดงาน
 */
export function flexJobAck(d: JobAckInput) {
  const placeText = (when: Date, place: string | null) =>
    place ? `${shortWhen(when)} · ${place}` : shortWhen(when);

  /* ค่าเช่า "1,000 × 2 = 2,000" ต่อช่วงราคา — จองคร่อมหลายช่วงขึ้นหลายบรรทัด
     ถ้ายอดจองไม่เท่าค่าเช่าล้วน (มีค่าส่งรถ ค่านอกเวลา แผนเดินทาง หรือส่วนลด)
     ใส่ส่วนต่างเป็นบรรทัดแยก ยอดรวมท้ายการ์ดจะได้บวกกันลงตัวทุกครั้ง */
  const money: unknown[] = [];
  if (d.rent && d.rent.segments.length) {
    d.rent.segments.forEach((seg, i) => {
      // ข้อความว่างใน Flex ถูก LINE ปฏิเสธทั้งการ์ด จึงใช้ "+" แทนช่องว่าง
      money.push(kv(i === 0 ? "ค่าเช่าต่อวัน" : "+", rentLineText(seg)));
    });
    const other = d.totalPrice - d.rent.rentTotal;
    if (other > 0) money.push(kv("ค่าบริการอื่น", other.toLocaleString()));
    if (other < 0) money.push(kv("ส่วนลด", `-${Math.abs(other).toLocaleString()}`));
  } else {
    money.push(kv("ค่าเช่า", d.totalPrice.toLocaleString()));
  }
  money.push(kv("ประกัน", d.deposit.toLocaleString()));
  money.push(kv("รวม", `${(d.totalPrice + d.deposit).toLocaleString()} บาท`));

  const tel = telUri(d.customerPhone);
  const buttons: unknown[] = [];
  if (tel) buttons.push(btn("โทรหาลูกค้า", tel));
  if (d.mapPlace) buttons.push(btnGold("เปิดแผนที่", mapsLink(d.mapPlace)));

  return card({
    altText: `รับทราบงาน${HANDOFF_LABEL[d.kind]} — ${d.carLabel} ${shortWhen(d.meetAt)}`,
    title: `✅ รับทราบงาน${HANDOFF_LABEL[d.kind]}แล้ว`,
    subtitle: `${d.plate} · ${d.customerName} · ออกเดินทาง ${formatBangkokTime(leaveAt(d.meetAt))} น.`,
    tone: d.kind === "PICKUP" ? "danger" : "ok",
    body: [
      /* บรรทัดแรก "รถ (เบอร์ลูกค้า)" — คนส่งรถเห็นเบอร์ทันทีโดยไม่ต้องอ่านต่อ
         ทะเบียนย้ายไปอยู่บรรทัดรองใต้หัวการ์ดแทน */
      {
        type: "text",
        text: `${d.carLabel} (${d.customerPhone})`,
        weight: "bold",
        size: "md",
        wrap: true,
      },
      line,
      kv("รับ", placeText(d.start, d.pickupPlace)),
      kv("คืน", placeText(d.end, d.returnPlace)),
      ...(d.rent ? [kv("รวม", `${d.rent.days} วัน`)] : []),
      line,
      ...money,
      line,
      {
        type: "text",
        text: "เมื่อทำงานเสร็จ กดปุ่มปิดงานที่การ์ดงานได้เลยครับ",
        size: "xs",
        color: "#8B8577",
        wrap: true,
      },
    ],
    buttons,
  });
}

/* ------------------------------------------------------------------ */
/* ข้อความตอนกดปิดงาน                                                  */
/* ------------------------------------------------------------------ */

export function jobClosedText(d: {
  kind: HandoffKind;
  carLabel: string;
  plate: string;
  bookingId: string;
}): string {
  return [
    `✅ ปิดงาน${HANDOFF_LABEL[d.kind]}เรียบร้อย`,
    "",
    `รถ: ${d.carLabel} (${d.plate})`,
    `รหัสจอง: ${d.bookingId.slice(0, 8).toUpperCase()}`,
    "",
    "ส่งรูปสภาพรถได้ที่หน้างาน (ปุ่มในการ์ดงาน) ระบบจะเก็บแนบไว้กับงานนี้ให้",
    // งานรับรถคืนเสร็จ = จบการเช่า ระบบปิดสถานะการจองให้เอง
    ...(d.kind === "PICKUP" ? ["", "สถานะการจองเปลี่ยนเป็น “เสร็จสิ้น” แล้ว"] : []),
  ].join("\n");
}

/**
 * สรุปงานแบบตัวหนังสือ — ชุดเดียวกับการ์ดรับทราบงาน (flexJobAck) ทุกบรรทัด
 * ใช้ใส่ในโน้ตของ Google Calendar คนส่งรถจะเห็นข้อมูลเดียวกันทั้งใน LINE และปฏิทิน
 */
export function jobSummaryLines(d: Omit<JobAckInput, "kind" | "meetAt" | "mapPlace">): string[] {
  const placeText = (when: Date, place: string | null) =>
    place ? `${shortWhen(when)} · ${place}` : shortWhen(when);

  const money: string[] = [];
  if (d.rent && d.rent.segments.length) {
    d.rent.segments.forEach((seg, i) => {
      money.push(`${i === 0 ? "ค่าเช่าต่อวัน" : "+"} ${rentLineText(seg)}`);
    });
    const other = d.totalPrice - d.rent.rentTotal;
    if (other > 0) money.push(`ค่าบริการอื่น ${other.toLocaleString()}`);
    if (other < 0) money.push(`ส่วนลด -${Math.abs(other).toLocaleString()}`);
  } else {
    money.push(`ค่าเช่า ${d.totalPrice.toLocaleString()}`);
  }
  money.push(`ประกัน ${d.deposit.toLocaleString()}`);
  money.push(`รวม ${(d.totalPrice + d.deposit).toLocaleString()} บาท`);

  return [
    `${d.carLabel} (${d.customerPhone})`,
    `รับ ${placeText(d.start, d.pickupPlace)}`,
    `คืน ${placeText(d.end, d.returnPlace)}`,
    ...(d.rent ? [`รวม ${d.rent.days} วัน`] : []),
    "",
    ...money,
  ];
}
