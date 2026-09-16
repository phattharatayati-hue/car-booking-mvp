/**
 * ข้อความแบบ Flex สำหรับการจองรถผ่านแชท LINE
 */

import { formatRateRange, type RentSegment } from "@/lib/car-rates";

export type FlexCar = {
  id: string;
  brand: string;
  name: string;
  pricePerDay: number;
  photoUrl: string | null;
  source: string;
};

/* ---------- โทนสีแบรนด์ ----------
   ยกมาจาก BRAND-COLORS.md ที่บริษัทอนุมัติ
   Flex ไม่มีโหมดมืด สีจึงตายตัวชุดเดียว เลือกคู่ที่ผ่าน contrast บนพื้นขาว/เขียวเข้ม
   ทองห้ามใช้เป็นสีตัวอักษรบนพื้นสว่าง (ได้แค่ 3.09:1) จึงใช้เป็นพื้นและเส้นคาดเท่านั้น */
const GREEN = "#1E5841";      // สีหลัก — แถบหัว ปุ่มหลัก
const GREEN_DEEP = "#123A28"; // เข้มกว่าหัว ใช้เป็นแถบสรุปยอด
const GOLD = "#B08D57";       // เส้นคาด ไอคอน พื้นปุ่มรอง
const GOLD_PALE = "#D9C29B";  // ตัวอักษรทองบนพื้นเขียวเข้ม (4.80:1)
const CREAM = "#F5F0E1";      // พื้นกล่องเน้น
const INK = "#0D2B1F";        // ตัวอักษรหลัก
const MUTED = "#6B7B72";      // ตัวอักษรรอง
const OK = "#067A4C";
const WARN = "#9A7A48";
const DANGER = "#B34438";
const WHITE = "#FFFFFF";

// ชื่อเดิมที่การ์ดรถใช้อยู่ — ชี้มาที่สีแบรนด์แทนสีน้ำเงินเดิม
const BLUE = GREEN;
const SLATE = INK;

/** รูป fallback เวลารถไม่มีรูป (LINE ต้องการ URL แบบ https เท่านั้น) */
const PLACEHOLDER =
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80";

function absoluteUrl(url: string | null, site: string): string {
  if (!url) return PLACEHOLDER;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${site}${url.startsWith("/") ? "" : "/"}${url}`;
}

/** ลิงก์ LIFF สำหรับเปิดปฏิทินจองในแอป LINE (ถ้าตั้งค่าไว้) */
function bookingAction(car: FlexCar) {
  const liffId = process.env.NEXT_PUBLIC_LIFF_BOOKING_ID;

  if (liffId) {
    return {
      type: "uri",
      label: "เลือกวัน",
      uri: `https://liff.line.me/${liffId}?car=${car.id}`,
    };
  }

  // ไม่มี LIFF — ใช้ขั้นตอนถาม-ตอบในแชทแทน
  return {
    type: "postback",
    label: "เลือกคันนี้",
    data: `action=pick_car&carId=${car.id}`,
    displayText: `เลือก ${car.brand} ${car.name}`,
  };
}

/** การ์ดรถ 1 ใบ */
function carBubble(car: FlexCar, site: string) {
  return {
    type: "bubble",
    size: "kilo",
    hero: {
      type: "image",
      url: absoluteUrl(car.photoUrl, site),
      size: "full",
      aspectRatio: "4:3",
      aspectMode: "cover",
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        { type: "text", text: car.brand, size: "xs", color: MUTED },
        {
          type: "text",
          text: car.name,
          weight: "bold",
          size: "lg",
          color: SLATE,
          wrap: true,
        },
        {
          type: "box",
          layout: "baseline",
          spacing: "xs",
          contents: [
            {
              type: "text",
              text: `${car.pricePerDay.toLocaleString()}`,
              weight: "bold",
              size: "xl",
              color: BLUE,
              flex: 0,
            },
            { type: "text", text: "บาท / วัน", size: "sm", color: MUTED },
          ],
        },
        ...(car.source === "PARTNER"
          ? [{ type: "text", text: "รถพาร์ทเนอร์", size: "xxs", color: MUTED }]
          : []),
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          color: BLUE,
          height: "sm",
          action: bookingAction(car),
        },
      ],
    },
  };
}

/** รถหลายคันแบบเลื่อนแนวนอน (LINE จำกัด 12 ใบ) */
export function carCarousel(cars: FlexCar[], site: string) {
  return {
    type: "flex",
    altText: "เลือกรถที่ต้องการจอง",
    contents: {
      type: "carousel",
      contents: cars.slice(0, 12).map((c) => carBubble(c, site)),
    },
  };
}

import { formatBangkokDateTime } from "@/lib/settings";

function fmtDate(d: Date) {
  return formatBangkokDateTime(d);
}

/** สรุปก่อนยืนยันการจอง */
export function bookingSummary(opts: {
  carLabel: string;
  start: Date;
  end: Date;
  days: number;
  pricePerDay: number;
  /** ค่าเช่าแยกตามช่วงราคา — ถ้ามีหลายช่วงจะแสดงทีละบรรทัด */
  segments?: RentSegment[];
  total: number;
  serviceNote?: string;
}) {
  const row = (label: string, value: string, bold = false) => ({
    type: "box",
    layout: "horizontal",
    contents: [
      { type: "text", text: label, size: "sm", color: MUTED, flex: 2 },
      {
        type: "text",
        text: value,
        size: bold ? "lg" : "sm",
        color: bold ? BLUE : SLATE,
        weight: bold ? "bold" : "regular",
        align: "end",
        flex: 3,
        wrap: true,
      },
    ],
  });

  return {
    type: "flex",
    altText: "ยืนยันการจอง",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          { type: "text", text: "ตรวจสอบการจอง", weight: "bold", size: "lg", color: SLATE },
          { type: "separator", margin: "md" },
          row("รถ", opts.carLabel),
          row("วันรับรถ", fmtDate(opts.start)),
          row("วันคืนรถ", fmtDate(opts.end)),
          row("จำนวนวัน", `${opts.days} วัน`),
          ...(opts.segments && opts.segments.length > 1
            ? opts.segments.map((seg) =>
                row(
                  seg.label ?? "ราคาปกติ",
                  `${formatRateRange({ startDate: seg.from, endDate: seg.to })}\n${seg.days} วัน × ${seg.pricePerDay.toLocaleString()} = ${seg.total.toLocaleString()} บาท`
                )
              )
            : [row("ราคา/วัน", `${opts.pricePerDay.toLocaleString()} บาท`)]),
          { type: "separator", margin: "md" },
          row("ยอดรวม", `${opts.total.toLocaleString()} บาท`, true),
          ...(opts.serviceNote?.trim()
            ? [
                { type: "separator", margin: "md" },
                {
                  type: "text",
                  text: opts.serviceNote.trim(),
                  size: "xs",
                  color: MUTED,
                  wrap: true,
                  margin: "sm",
                },
              ]
            : []),
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: BLUE,
            action: {
              type: "postback",
              label: "ยืนยันการจอง",
              data: "action=confirm",
              displayText: "ยืนยันการจอง",
            },
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "postback",
              label: "ยกเลิก",
              data: "action=cancel",
              displayText: "ยกเลิก",
            },
          },
        ],
      },
    },
  };
}

/** ปุ่มเลือกวันที่ (ปฏิทินในตัว LINE) */
export function datePicker(opts: {
  title: string;
  description: string;
  label: string;
  action: "pick_start" | "pick_end";
  min: string; // YYYY-MM-ddTHH:mm
}) {
  return {
    type: "flex",
    altText: opts.title,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          { type: "text", text: opts.title, weight: "bold", size: "lg", color: SLATE },
          { type: "text", text: opts.description, size: "sm", color: MUTED, wrap: true },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            color: BLUE,
            action: {
              type: "datetimepicker",
              label: opts.label,
              data: `action=${opts.action}`,
              mode: "datetime",
              min: opts.min,
            },
          },
        ],
      },
    },
  };
}

/**
 * ข้อความยืนยันหลังจองสำเร็จในแชท
 * ใช้โครงการ์ดกลางเดียวกับใบที่ส่งจากเว็บ ลูกค้าจะได้เห็นหน้าตาเดียวกันทุกช่องทาง
 */
export function bookingDone(opts: {
  bookingId: string;
  carLabel: string;
  total: number;
  deposit: number;
  bankInfo: string;
  bookingUrl?: string;
  /** เงินประกันของรถคันนี้ — ใส่เฉพาะคันที่ตั้งแยกจากค่ากลาง */
  specialDeposit?: number | null;
}) {
  const url = opts.bookingUrl;
  return card({
    altText: `จองสำเร็จ ${code(opts.bookingId)} — โอนค่าจอง ${opts.deposit.toLocaleString()} บาท`,
    title: "จองสำเร็จ",
    subtitle: `รหัสจอง ${code(opts.bookingId)}`,
    body: [
      { type: "text", text: opts.carLabel, weight: "bold", size: "md", color: INK, wrap: true },
      kv("ยอดรวม", `${opts.total.toLocaleString()} บาท`),
      ...(opts.specialDeposit
        ? [kv("เงินประกันรถคันนี้", `${opts.specialDeposit.toLocaleString()} บาท (ชำระวันรับรถ)`)]
        : []),
      line,
      amountBox("โอนค่าจองเพื่อกันวันให้คุณ", opts.deposit, opts.bankInfo),
      noteBox([
        "โอนแล้วกดปุ่มด้านล่างเพื่อแนบสลิป",
        "อย่าลืมเลือกจุดรับ-ส่งรถ และส่งเอกสาร (บัตรประชาชน ใบขับขี่ เอกสารการเดินทาง/ที่พัก)",
      ]),
    ],
    buttons: url
      ? [btn("แนบสลิปค่าจอง", `${url}#slip`), btnGold("จุดรับ-ส่ง / เอกสาร", `${url}#docs`)]
      : [],
  });
}

/* ==========================================================================
   ชุดออกแบบกลางของข้อความ Flex ทั้งระบบ
   ทุกใบใช้โครงเดียวกัน: แถบหัวสีเขียว → เส้นทองคาด → เนื้อหา → ปุ่ม
   เพิ่มข้อความใหม่ให้ประกอบจากชิ้นส่วนด้านล่าง อย่าเขียน bubble ดิบเอง
   ไม่งั้นอีกหกเดือนจะกลับไปมีหน้าตาคนละแบบเหมือนก่อนหน้านี้
   ========================================================================== */

/* eslint-disable @typescript-eslint/no-explicit-any */

type Tone = "green" | "gold" | "ok" | "warn" | "danger";

const TONE_BG: Record<Tone, string> = {
  green: GREEN,
  gold: GREEN,      // หัวการ์ดใช้เขียวเสมอ ทองอยู่ที่เส้นคาดและตัวอักษรรอง
  ok: OK,
  warn: WARN,
  danger: DANGER,
};

/** แถบหัวการ์ด — ชื่อเรื่องขาวบนพื้นเข้ม + บรรทัดรองสีทองอ่อน */
function header(title: string, subtitle?: string, tone: Tone = "green") {
  return {
    type: "box",
    layout: "vertical",
    backgroundColor: TONE_BG[tone],
    paddingAll: "16px",
    paddingBottom: "14px",
    spacing: "xs",
    contents: [
      { type: "text", text: title, color: WHITE, weight: "bold", size: "lg", wrap: true },
      ...(subtitle
        ? [{ type: "text", text: subtitle, color: GOLD_PALE, size: "xs", wrap: true }]
        : []),
    ],
  };
}

/** เส้นทองคาดใต้แถบหัว — ลายเซ็นของแบรนด์ ใช้ทุกใบ */
const goldRule = {
  type: "box",
  layout: "vertical",
  height: "3px",
  backgroundColor: GOLD,
  contents: [{ type: "filler" }],
};

/** บรรทัดข้อมูล ป้ายซ้าย–ค่าขวา */
export function kv(label: string, value: string) {
  return {
    type: "box",
    layout: "horizontal",
    spacing: "sm",
    contents: [
      { type: "text", text: label, size: "sm", color: MUTED, flex: 4 },
      {
        type: "text",
        text: value,
        size: "sm",
        color: INK,
        align: "end",
        flex: 6,
        wrap: true,
      },
    ],
  };
}

/** กล่องยอดเงินสำคัญ — พื้นเขียวเข้ม ตัวเลขทองอ่อน อ่านออกแน่นอน */
export function amountBox(label: string, amount: number, note?: string) {
  return {
    type: "box",
    layout: "vertical",
    backgroundColor: GREEN_DEEP,
    cornerRadius: "10px",
    paddingAll: "14px",
    spacing: "xs",
    contents: [
      { type: "text", text: label, size: "xs", color: GOLD_PALE },
      {
        type: "text",
        text: `${amount.toLocaleString()} บาท`,
        size: "xxl",
        weight: "bold",
        color: WHITE,
      },
      ...(note ? [{ type: "text", text: note, size: "xxs", color: GOLD_PALE, wrap: true }] : []),
    ],
  };
}

/** กล่องหมายเหตุพื้นครีม สำหรับข้อความที่ต้องอ่าน แต่ไม่ใช่ตัวเลขหลัก */
export function noteBox(lines: string[], tone: "cream" | "warn" = "cream") {
  return {
    type: "box",
    layout: "vertical",
    backgroundColor: tone === "cream" ? CREAM : "#FAF3E4",
    cornerRadius: "10px",
    paddingAll: "12px",
    spacing: "xs",
    contents: lines.map((t) => ({
      type: "text",
      text: t,
      size: "xs",
      color: tone === "cream" ? INK : WARN,
      wrap: true,
    })),
  };
}

/** หัวข้อย่อยในเนื้อหา */
export function sectionTitle(text: string) {
  return { type: "text", text, size: "sm", weight: "bold", color: GREEN, margin: "md" };
}

export function bullets(items: string[]) {
  return {
    type: "box",
    layout: "vertical",
    spacing: "xs",
    contents: items.map((t) => ({
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: [
        { type: "text", text: "•", size: "xs", color: GOLD, flex: 0 },
        { type: "text", text: t, size: "xs", color: INK, wrap: true, flex: 1 },
      ],
    })),
  };
}

export const line = { type: "separator", margin: "md", color: "#E3DBC7" };

/** ปุ่มหลัก — เขียวเข้มตัวอักษรขาว */
export function btn(label: string, uri: string) {
  return {
    type: "button",
    style: "primary",
    color: GREEN,
    height: "sm",
    action: { type: "uri", label: label.slice(0, 20), uri },
  };
}

/** ปุ่มรอง — พื้นทอง ตัวอักษรเข้ม (ทองบนพื้นขาวเป็นตัวอักษรไม่ได้ แต่เป็นพื้นได้) */
export function btnGold(label: string, uri: string) {
  return {
    type: "button",
    style: "primary",
    color: GOLD,
    height: "sm",
    action: { type: "uri", label: label.slice(0, 20), uri },
  };
}

/**
 * ประกอบเป็นข้อความ Flex หนึ่งใบ
 * altText คือข้อความที่โผล่ในรายการแชทและการแจ้งเตือนบนล็อกสกรีน — ต้องอ่านรู้เรื่องเอง
 */
export function card(opts: {
  altText: string;
  title: string;
  subtitle?: string;
  tone?: Tone;
  body: any[];
  buttons?: any[];
}) {
  return {
    type: "flex",
    altText: opts.altText.slice(0, 400),
    contents: {
      type: "bubble",
      header: header(opts.title, opts.subtitle, opts.tone ?? "green"),
      hero: goldRule,
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: opts.body,
      },
      ...(opts.buttons?.length
        ? {
            footer: {
              type: "box",
              layout: "vertical",
              spacing: "sm",
              paddingAll: "16px",
              paddingTop: "0px",
              contents: opts.buttons,
            },
          }
        : {}),
      styles: { header: { separator: false }, footer: { separator: false } },
    },
  };
}

/** รหัสจองแบบสั้นที่ลูกค้าอ่านออกเสียงได้ */
export function code(bookingId: string) {
  return bookingId.slice(0, 8).toUpperCase();
}

/* ==========================================================================
   ข้อความจริงที่ระบบส่งออก — ฝั่งลูกค้า
   ========================================================================== */

/** จองสำเร็จ รอโอนค่าจอง — ใบที่ลูกค้าเห็นบ่อยที่สุด */
export function flexBookingCreated(d: {
  bookingId: string;
  carLabel: string;
  start: Date;
  end: Date;
  total: number;
  afterHoursTotal?: number;
  bookingFee: number;
  bankAccount: string;
  pickupPlace?: string | null;
  returnPlace?: string | null;
  bookingUrl: string;
}) {
  return card({
    altText: `จองสำเร็จ ${code(d.bookingId)} — โอนค่าจอง ${d.bookingFee.toLocaleString()} บาท`,
    title: "จองสำเร็จ",
    subtitle: `รหัสจอง ${code(d.bookingId)}`,
    body: [
      { type: "text", text: d.carLabel, weight: "bold", size: "md", color: INK, wrap: true },
      kv("รับรถ", fmtDate(d.start)),
      kv("คืนรถ", fmtDate(d.end)),
      ...(d.pickupPlace ? [kv("จุดรับรถ", d.pickupPlace)] : []),
      ...(d.returnPlace ? [kv("จุดคืนรถ", d.returnPlace)] : []),
      kv("ยอดรวม", `${d.total.toLocaleString()} บาท`),
      ...(d.afterHoursTotal
        ? [kv("รวมค่านอกเวลา", `${d.afterHoursTotal.toLocaleString()} บาท`)]
        : []),
      line,
      amountBox("ขั้นต่อไป — โอนค่าจองเพื่อกันวันให้คุณ", d.bookingFee, d.bankAccount),
      noteBox([
        "โอนแล้วกดปุ่มด้านล่างเพื่อแนบสลิป ระบบจะถามยอดที่โอนจริงด้วย",
        "อย่าลืมส่งเอกสาร — บัตรประชาชน ใบขับขี่ เอกสารการเดินทาง/ที่พัก",
      ]),
    ],
    buttons: [
      btn("แนบสลิปค่าจอง", `${d.bookingUrl}#slip`),
      btnGold("ส่งเอกสาร", `${d.bookingUrl}#docs`),
    ],
  });
}

/** ส่งคำขอจองรถพาร์ทเนอร์ — ยังไม่ต้องโอน */
export function flexBookingRequested(d: {
  bookingId: string;
  carLabel: string;
  start: Date;
  end: Date;
  total: number;
  bookingUrl: string;
}) {
  return card({
    altText: `ส่งคำขอจองแล้ว ${code(d.bookingId)} — รอร้านเช็ควันว่าง`,
    title: "ส่งคำขอจองแล้ว",
    subtitle: `รหัสจอง ${code(d.bookingId)}`,
    tone: "warn",
    body: [
      { type: "text", text: d.carLabel, weight: "bold", size: "md", color: INK, wrap: true },
      kv("รับรถ", fmtDate(d.start)),
      kv("คืนรถ", fmtDate(d.end)),
      kv("ยอดรวม", `${d.total.toLocaleString()} บาท`),
      line,
      noteBox(
        [
          "รถคันนี้เป็นรถจากพาร์ทเนอร์ เราจะเช็ควันว่างกับเจ้าของรถแล้วแจ้งผลกลับทางแชทนี้",
          "ยังไม่ต้องโอนค่าจองจนกว่าจะได้รับการยืนยัน",
        ],
        "warn"
      ),
    ],
    buttons: [btn("ดูสถานะการจอง", d.bookingUrl)],
  });
}

/** สลิปผ่านแล้วแต่เอกสารยังไม่ครบ */
export function flexDepositConfirmed(d: {
  bookingId: string;
  missing: string[];
  bookingUrl: string;
}) {
  return card({
    altText: `ยืนยันการจอง ${code(d.bookingId)} — ยังขาดเอกสาร ${d.missing.length} รายการ`,
    title: "ยืนยันการจองแล้ว",
    subtitle: `รหัสจอง ${code(d.bookingId)}`,
    tone: "ok",
    body: [
      {
        type: "text",
        text: "ตรวจสอบหลักฐานการชำระค่าจองของท่านเรียบร้อยแล้ว",
        size: "sm",
        color: INK,
        wrap: true,
      },
      line,
      sectionTitle(`ยังขาดเอกสารอีก ${d.missing.length} รายการ`),
      bullets(d.missing),
      noteBox([
        "อัปโหลดให้ครบแล้วเราจะส่งสรุปรายละเอียดการรับรถให้อีกครั้งครับ",
      ]),
    ],
    buttons: [btn("ส่งเอกสาร", `${d.bookingUrl}#docs`)],
  });
}

/** พร้อมรับรถ — ใบสรุปยาวที่สุด แยกเป็นหัวข้อ */
export function flexReadyForPickup(d: {
  bookingId: string;
  carLabel: string;
  plate: string;
  start: Date;
  end: Date;
  total: number;
  paid: number;
  rentalBalance: number;
  securityDeposit: number;
  dueOnPickup: number;
  fees: { title: string; amount: string }[];
  feesUrl: string;
  bookingUrl: string;
}) {
  return card({
    altText: `พร้อมรับรถ ${code(d.bookingId)} — ชำระวันรับรถ ${d.dueOnPickup.toLocaleString()} บาท`,
    title: "พร้อมรับรถแล้ว",
    subtitle: `รหัสจอง ${code(d.bookingId)}`,
    tone: "ok",
    body: [
      { type: "text", text: d.carLabel, weight: "bold", size: "md", color: INK, wrap: true },
      kv("ทะเบียน", d.plate),
      kv("รับรถ", fmtDate(d.start)),
      kv("คืนรถ", fmtDate(d.end)),
      line,
      amountBox(
        "ยอดที่ต้องชำระในวันรับรถ",
        d.dueOnPickup,
        `ค่าเช่าคงเหลือ ${d.rentalBalance.toLocaleString()} + เงินประกัน ${d.securityDeposit.toLocaleString()} บาท`
      ),
      kv("ค่าเช่ารวม", `${d.total.toLocaleString()} บาท`),
      kv("ชำระค่าจองแล้ว", `${d.paid.toLocaleString()} บาท`),
      {
        type: "text",
        text: `เงินประกันได้คืนเต็มจำนวนเมื่อส่งคืนรถเรียบร้อย`,
        size: "xxs",
        color: MUTED,
        wrap: true,
      },
      line,
      sectionTitle("เตรียมไปในวันรับรถ"),
      bullets([
        "บัตรประชาชนและใบขับขี่ฉบับจริง",
        "ถ่ายภาพและวิดีโอรอบคันก่อนนำรถออก เก็บเป็นหลักฐานทั้งสองฝ่าย",
        "ตรวจสภาพรถร่วมกับพนักงาน พบรอยขีดข่วนแจ้งทันทีก่อนรับรถ",
      ]),
      sectionTitle("ค่าปรับที่พบบ่อย"),
      bullets(d.fees.map((f) => `${f.title} — ${f.amount}`)),
    ],
    buttons: [btn("ดูการจองของฉัน", d.bookingUrl), btnGold("ค่าปรับทั้งหมด", d.feesUrl)],
  });
}

/** เตือนก่อนถึงกำหนดคืนรถ */
export function flexReturnReminder(d: {
  bookingId: string;
  carLabel: string;
  plate: string;
  end: Date;
  headline: string;
  securityDeposit: number;
  feesUrl: string;
  bookingUrl: string;
}) {
  return card({
    altText: `แจ้งเตือนคืนรถ ${code(d.bookingId)} — ${d.headline}`,
    title: "แจ้งเตือนคืนรถ",
    subtitle: d.headline,
    tone: "warn",
    body: [
      { type: "text", text: d.carLabel, weight: "bold", size: "md", color: INK, wrap: true },
      kv("ทะเบียน", d.plate),
      kv("กำหนดคืนรถ", fmtDate(d.end)),
      kv("รหัสจอง", code(d.bookingId)),
      line,
      sectionTitle(`เช็คก่อนคืนรถ เพื่อได้เงินประกันคืนเต็ม ${d.securityDeposit.toLocaleString()} บาท`),
      bullets([
        "เติมน้ำมันให้เท่าระดับตอนรับรถ",
        "เก็บของส่วนตัวออกจากรถให้หมด",
        "กุญแจครบชุด และไม่มีคราบสกปรกในห้องโดยสาร",
      ]),
      noteBox(["ต้องการต่อระยะเวลาเช่า ทักแชทนี้ได้เลยครับ"]),
    ],
    buttons: [btn("ดูการจอง", d.bookingUrl), btnGold("รายละเอียดค่าปรับ", d.feesUrl)],
  });
}

/* ==========================================================================
   ฝั่งแอดมิน — เน้นอ่านเร็วบนมือถือ ปุ่มเดียวพาไปหลังบ้าน
   ========================================================================== */

export function flexNewBookingAdmin(d: {
  bookingId: string;
  carLabel: string;
  customerName: string;
  phone: string;
  start: Date;
  end: Date;
  total: number;
  afterHoursTotal?: number;
  pickupPlace?: string | null;
  returnPlace?: string | null;
  isRequest: boolean;
  partnerName?: string;
  partnerPhone?: string;
  adminUrl: string;
}) {
  return card({
    altText: d.isRequest
      ? `คำขอจองรถพาร์ทเนอร์ ${code(d.bookingId)} — ${d.carLabel}`
      : `จองใหม่ ${code(d.bookingId)} — ${d.carLabel}`,
    title: d.isRequest ? "คำขอจองรถพาร์ทเนอร์" : "มีการจองใหม่",
    subtitle: `รหัสจอง ${code(d.bookingId)}`,
    tone: d.isRequest ? "warn" : "green",
    body: [
      { type: "text", text: d.carLabel, weight: "bold", size: "md", color: INK, wrap: true },
      kv("ลูกค้า", d.customerName),
      kv("เบอร์", d.phone),
      kv("รับรถ", fmtDate(d.start)),
      kv("คืนรถ", fmtDate(d.end)),
      ...(d.pickupPlace ? [kv("จุดรับรถ", d.pickupPlace)] : []),
      ...(d.returnPlace ? [kv("จุดคืนรถ", d.returnPlace)] : []),
      kv("ยอดรวม", `${d.total.toLocaleString()} บาท`),
      ...(d.afterHoursTotal
        ? [kv("รวมค่านอกเวลา", `${d.afterHoursTotal.toLocaleString()} บาท`)]
        : []),
      line,
      ...(d.isRequest
        ? [
            ...(d.partnerName
              ? [kv("เจ้าของรถ", d.partnerName), ...(d.partnerPhone ? [kv("โทร", d.partnerPhone)] : [])]
              : []),
            noteBox(
              ["ติดต่อเจ้าของรถเพื่อเช็ครถว่าง แล้วกดอนุมัติหรือปฏิเสธในหลังบ้าน"],
              "warn"
            ),
          ]
        : [noteBox(["สถานะ: รอลูกค้าโอนค่าจอง"])]),
    ],
    buttons: [btn("เปิดหลังบ้าน", d.adminUrl)],
  });
}

export function flexSlipUploadedAdmin(d: {
  bookingId: string;
  carLabel: string;
  customerName: string;
  amount: number;
  adminUrl: string;
}) {
  return card({
    altText: `ลูกค้าส่งสลิป ${code(d.bookingId)} — ${d.amount.toLocaleString()} บาท`,
    title: "ลูกค้าอัปโหลดสลิปแล้ว",
    subtitle: `รหัสจอง ${code(d.bookingId)}`,
    body: [
      { type: "text", text: d.carLabel, weight: "bold", size: "md", color: INK, wrap: true },
      kv("ลูกค้า", d.customerName),
      line,
      amountBox("ยอดที่ลูกค้าแจ้ง", d.amount, "กรุณาตรวจสอบกับรายการเดินบัญชี"),
    ],
    buttons: [btn("ตรวจสลิป", d.adminUrl)],
  });
}

/**
 * ลูกค้าแนบสลิปบนเว็บแล้ว — ส่งต่อทันทีให้ส่งเอกสาร ไม่ต้องรอแอดมินตรวจสลิปก่อน
 * missing ว่าง = เอกสารครบแล้ว ไม่ต้องมีปุ่ม
 */
export function flexSlipReceived(d: {
  bookingId: string;
  carLabel: string;
  missing: string[];
  bookingUrl: string;
  /** เงินประกันของรถคันนี้ — ใส่เฉพาะคันที่ตั้งแยกจากค่ากลาง */
  specialDeposit?: number | null;
}) {
  const needDocs = d.missing.length > 0;
  return card({
    altText: needDocs
      ? `ได้รับสลิปแล้ว ${code(d.bookingId)} — กรุณาอัปโหลดเอกสาร ${d.missing.length} รายการ`
      : `ได้รับสลิปแล้ว ${code(d.bookingId)} — รอแอดมินตรวจสอบ`,
    title: "ได้รับสลิปแล้ว",
    subtitle: `รหัสจอง ${code(d.bookingId)}`,
    body: [
      { type: "text", text: d.carLabel, weight: "bold", size: "md", color: INK, wrap: true },
      ...(d.specialDeposit
        ? [kv("เงินประกันรถคันนี้", `${d.specialDeposit.toLocaleString()} บาท (ชำระวันรับรถ)`)]
        : []),
      {
        type: "text",
        text: needDocs
          ? "แอดมินกำลังตรวจสอบสลิป ระหว่างนี้อัปโหลดเอกสารต่อได้เลยครับ"
          : "แอดมินกำลังตรวจสอบ เราจะแจ้งผลกลับมาทางแชทนี้ครับ",
        size: "sm",
        color: INK,
        wrap: true,
      },
      ...(needDocs
        ? [
            line,
            sectionTitle(`เอกสารที่ต้องส่ง ${d.missing.length} รายการ`),
            bullets(d.missing),
            noteBox(["ถ่ายรูปให้ชัด เห็นข้อมูลครบ อัปโหลดผ่านปุ่มด้านล่าง"]),
          ]
        : []),
    ],
    buttons: needDocs
      ? [btn("อัปโหลดเอกสาร", `${d.bookingUrl}#docs`)]
      : [btn("ดูการจอง", d.bookingUrl)],
  });
}

/**
 * ลูกค้าส่งรูปเข้าแชท — ระบบไม่รับสลิปหรือเอกสารทางแชทแล้ว
 * ตอบครั้งเดียวพร้อมปุ่มพาไปหน้าที่ต้องทำ
 */
export function flexUploadOnWeb(d: {
  bookingId: string;
  target: "slip" | "docs";
  bookingUrl: string;
}) {
  const isSlip = d.target === "slip";
  const label = isSlip ? "สลิปค่าจอง" : "เอกสาร";
  return card({
    altText: `กรุณาแนบ${label}ผ่านปุ่มในข้อความนี้`,
    title: `แนบ${label}ผ่านปุ่มนี้ครับ`,
    subtitle: `รหัสจอง ${code(d.bookingId)}`,
    tone: "gold",
    body: [
      {
        type: "text",
        text: `ระบบไม่ได้บันทึกรูปที่ส่งในแชทเป็น${label} กรุณากดปุ่มด้านล่างแล้วแนบในหน้าการจองอีกครั้ง`,
        size: "sm",
        color: INK,
        wrap: true,
      },
    ],
    buttons: [
      btn(isSlip ? "แนบสลิปค่าจอง" : "อัปโหลดเอกสาร", `${d.bookingUrl}#${d.target}`),
    ],
  });
}

export function flexUnassignedAdmin(d: {
  count: number;
  jobs: string[];
  more: number;
  adminUrl: string;
}) {
  return card({
    altText: `มีงานรับ-ส่งรถที่ยังไม่มีคนรับ ${d.count} งาน`,
    title: "งานรับ-ส่งรถยังไม่มีคนรับ",
    subtitle: `ภายใน 24 ชั่วโมงข้างหน้า ${d.count} งาน`,
    tone: "danger",
    body: [
      bullets(d.jobs),
      ...(d.more > 0
        ? [{ type: "text", text: `และอีก ${d.more} งาน`, size: "xs", color: MUTED }]
        : []),
    ],
    buttons: [btn("มอบหมายงาน", d.adminUrl)],
  });
}

/**
 * รับคืนรถเรียบร้อย + ขอเลขบัญชีเพื่อคืนเงินประกัน
 *
 * ส่งครั้งเดียวตอนคนไปรับรถคืนกดปิดงาน — เป็นข้อความสุดท้ายของการเช่ารอบนั้น
 * จึงรวมทั้งคำขอบคุณ ปุ่มรีวิว และปุ่มแจ้งบัญชีไว้ในใบเดียว ไม่ยิงหลายข้อความ
 */
export function flexReturnComplete(d: {
  bookingId: string;
  carLabel: string;
  plate: string;
  refundAmount: number;
  reviewedHours: number;
  normalHours: number;
  openHour: number;
  closeHour: number;
  reviewUrl: string;
  refundUrl: string;
}) {
  const hours = (h: number) => (h === 1 ? "1 ชั่วโมง" : `${h} ชั่วโมง`);
  const office = `${String(d.openHour).padStart(2, "0")}:00-${String(d.closeHour).padStart(2, "0")}:00 น.`;

  return card({
    altText: `รับคืนรถ ${code(d.bookingId)} เรียบร้อย — แจ้งบัญชีเพื่อรับเงินประกัน ${d.refundAmount.toLocaleString()} บาทคืน`,
    title: "รับคืนรถเรียบร้อยแล้ว",
    subtitle: `รหัสจอง ${code(d.bookingId)}`,
    tone: "ok",
    body: [
      { type: "text", text: d.carLabel, weight: "bold", size: "md", color: INK, wrap: true },
      kv("ทะเบียน", d.plate),
      {
        type: "text",
        text: "ตรวจสภาพรถเรียบร้อย ไม่พบความเสียหาย ขอบคุณที่ใช้บริการครับ",
        size: "sm",
        color: INK,
        wrap: true,
      },
      line,
      amountBox("เงินประกันที่จะคืนให้", d.refundAmount, "กดปุ่มด้านล่างเพื่อแจ้งพร้อมเพย์หรือเลขบัญชี"),
      sectionTitle("คืนเงินเร็วแค่ไหน"),
      bullets([
        `รีวิวให้ร้านแล้วแจ้งบัญชี — โอนคืนภายใน ${hours(d.reviewedHours)}`,
        `ไม่สะดวกรีวิว — โอนคืนตามลำดับคิว ไม่เกิน ${hours(d.normalHours)}`,
      ]),
      noteBox([
        `นับเฉพาะเวลาทำการ ${office} — แจ้งนอกเวลาทำการจะเริ่มนับตอนเปิดทำการวันถัดไปครับ`,
      ]),
    ],
    buttons: [
      btn("แจ้งบัญชีรับเงินคืน", d.refundUrl),
      btnGold("รีวิวให้ร้าน", d.reviewUrl),
    ],
  });
}

/** โอนเงินประกันคืนแล้ว */
export function flexRefundPaid(d: {
  bookingId: string;
  amount: number;
  deductAmount: number;
  deductReason?: string | null;
  accountTail: string;
  bookingUrl: string;
}) {
  return card({
    altText: `โอนเงินประกันคืนแล้ว ${d.amount.toLocaleString()} บาท (${code(d.bookingId)})`,
    title: "โอนเงินประกันคืนแล้ว",
    subtitle: `รหัสจอง ${code(d.bookingId)}`,
    tone: "ok",
    body: [
      amountBox("โอนคืนแล้ว", d.amount, `เข้าบัญชีลงท้าย ${d.accountTail}`),
      ...(d.deductAmount > 0
        ? [
            line,
            sectionTitle("รายการที่หักไว้"),
            kv("หักทั้งหมด", `${d.deductAmount.toLocaleString()} บาท`),
            ...(d.deductReason
              ? [{ type: "text", text: d.deductReason, size: "xs", color: INK, wrap: true }]
              : []),
          ]
        : []),
      noteBox([
        "เงินอาจเข้าบัญชีช้ากว่านี้เล็กน้อยตามระบบของธนาคาร ถ้าเกิน 24 ชั่วโมงแล้วยังไม่เข้า ทักมาได้เลยครับ",
      ]),
    ],
    buttons: [btn("ดูรายละเอียดการจอง", d.bookingUrl)],
  });
}

/**
 * ใบเสร็จพร้อมแล้ว
 *
 * LINE ส่งไฟล์ PDF เข้าแชทไม่ได้ — ฝั่ง push ไม่มี message type สำหรับไฟล์
 * จึงส่งการ์ดพร้อมปุ่มเปิดใบเสร็จบนเว็บแทน ลูกค้ากดแล้วเซฟหรือแชร์ต่อได้เอง
 */
export function flexReceipt(d: {
  number: string;
  carLabel: string;
  total: number;
  totalText: string;
  url: string;
  pdfUrl: string;
}) {
  return card({
    altText: `ใบเสร็จ ${d.number} — ${d.total.toLocaleString()} บาท`,
    title: "ใบเสร็จรับเงิน",
    subtitle: d.number,
    tone: "ok",
    body: [
      { type: "text", text: d.carLabel, weight: "bold", size: "md", color: INK, wrap: true },
      amountBox("จำนวนเงินรวมทั้งสิ้น", d.total, d.totalText),
      noteBox([
        "กดปุ่มด้านล่างเพื่อเปิดใบเสร็จ เซฟเก็บไว้หรือส่งต่อให้ฝ่ายบัญชีได้เลยครับ",
      ]),
    ],
    buttons: [btn("ดาวน์โหลด PDF", d.pdfUrl), btnGold("เปิดดูในเว็บ", d.url)],
  });
}

/* ==========================================================================
   ตอบคำสั่งจากเมนู Rich menu — เดิมเป็นข้อความเปล่า อ่านยากและกดอะไรไม่ได้
   ========================================================================== */

/** สถานะการจองที่ลูกค้าขอดูเอง (เมนู "เช็คสถานะ" หรือพิมพ์รหัสจอง) */
export function flexBookingStatus(d: {
  code: string;
  carLabel: string;
  pickupText: string;
  returnText: string;
  total: number;
  statusLabel: string;
  /** ข้อความบอกขั้นถัดไป เช่น ยังไม่ได้ส่งสลิป */
  note: string;
  tone: Tone;
  url: string;
}) {
  return card({
    altText: `การจอง ${d.code} — ${d.statusLabel}`,
    title: "สถานะการจอง",
    subtitle: d.code,
    tone: d.tone,
    body: [
      { type: "text", text: d.carLabel, weight: "bold", size: "md", color: INK, wrap: true },
      { type: "separator", margin: "md", color: "#E8E2D4" },
      kv("รับรถ", d.pickupText),
      kv("คืนรถ", d.returnText),
      kv("สถานะ", d.statusLabel),
      amountBox("ยอดรวม", d.total),
      noteBox([d.note]),
    ],
    buttons: [btn("เปิดหน้าการจอง", d.url)],
  });
}

/** ยังไม่มีการจอง — ชวนจองหรือใส่รหัส แทนที่จะทิ้งลูกค้าไว้เฉย ๆ */
export function flexStatusEmpty(d: { carsUrl: string }) {
  return card({
    altText: "ยังไม่พบการจองของคุณ",
    title: "เช็คสถานะการจอง",
    tone: "warn",
    body: [
      {
        type: "text",
        text: "ยังไม่พบการจองที่ผูกกับบัญชี LINE นี้ครับ",
        size: "sm",
        color: INK,
        wrap: true,
      },
      noteBox([
        "ถ้าเคยจองไว้แล้ว พิมพ์รหัสจอง 8 หลักเข้ามาได้เลย",
        "รหัสอยู่ในข้อความยืนยันการจอง และในหน้าติดตามการจอง",
      ]),
    ],
    buttons: [btn("ดูรถทั้งหมดและจอง", d.carsUrl)],
  });
}

/** ค่าปรับและเงินประกัน — เมนู "ค่าบริการ" */
/**
 * กล่องเงื่อนไขคืนเงินประกัน — หัวข้อ / ✓ เงื่อนไขทีละบรรทัด / ผลลัพธ์ตัวหนา
 * ทำแยกจาก noteBox เพราะข้อความยาวต่อกันบรรทัดเดียวจะตัดคำกลางวลีบนมือถือ
 */
function refundBox(lines: string[]) {
  const [title, ...rest] = lines;
  const result = rest[rest.length - 1];
  const conditions = rest.slice(0, -1);
  return {
    type: "box",
    layout: "vertical",
    backgroundColor: CREAM,
    cornerRadius: "10px",
    paddingAll: "12px",
    spacing: "sm",
    contents: [
      { type: "text", text: title, size: "sm", weight: "bold", color: INK, wrap: true },
      ...conditions.map((c) => ({
        type: "box",
        layout: "baseline",
        spacing: "sm",
        contents: [
          { type: "text", text: "✓", size: "sm", color: OK, flex: 0 },
          { type: "text", text: c, size: "sm", color: INK, wrap: true, flex: 1 },
        ],
      })),
      { type: "separator", margin: "sm", color: GOLD_PALE },
      {
        type: "text",
        text: `→ ${result}`,
        size: "sm",
        weight: "bold",
        color: OK,
        wrap: true,
        margin: "sm",
      },
    ],
  };
}

export function flexFees(d: {
  lines: string[];
  /** "เงินประกันความเสียหาย 3,000 บาท · เฉพาะ Fortuner 5,000 บาท" */
  depositText: string;
  /** กล่องล่าง — หนึ่งรายการต่อบรรทัด */
  depositNote: string | string[];
  url: string;
}) {
  return card({
    altText: `เงินประกันและค่าปรับ — ${d.depositText}`,
    title: "เงินประกันและค่าปรับ",
    subtitle: d.depositText,
    tone: "warn",
    body: [
      {
        type: "text",
        text: "ค่าปรับเกิดขึ้นเฉพาะเมื่อมีเหตุจริง",
        size: "xs",
        color: MUTED,
        wrap: true,
      },
      {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: d.lines.map((line) => ({
          type: "text",
          text: `• ${line}`,
          size: "sm",
          color: INK,
          wrap: true,
        })),
      },
      Array.isArray(d.depositNote) && d.depositNote.length >= 3
        ? refundBox(d.depositNote)
        : noteBox(Array.isArray(d.depositNote) ? d.depositNote : [d.depositNote]),
    ],
    buttons: [btn("ดูรายการทั้งหมด", d.url)],
  });
}

/** ติดต่อร้าน — เมนู "ติดต่อเรา" ปุ่มโทรกดได้จากการ์ดเลย */
export function flexContact(d: {
  phones: string[];
  hours: string[];
  url: string;
}) {
  return card({
    altText: "ติดต่อ PHUPING CORPORATION",
    title: "ติดต่อเรา",
    subtitle: "โทรหาแอดมินได้ในเวลาทำการ",
    body: [
      {
        type: "box",
        layout: "vertical",
        spacing: "xs",
        contents: d.hours.map((h) => ({
          type: "text",
          text: h,
          size: "sm",
          color: MUTED,
          wrap: true,
        })),
      },
      noteBox(["นอกเวลาทำการพิมพ์คำถามทิ้งไว้ได้เลย แอดมินจะติดต่อกลับครับ"]),
    ],
    buttons: [
      ...d.phones.map((phone) => btn(`โทร ${phone}`, `tel:${phone.replace(/-/g, "")}`)),
      btnGold("เปิดหน้าติดต่อเรา", d.url),
    ],
  });
}

/* ==========================================================================
   แปลงข้อความธรรมดาเป็นการ์ด — ใช้กับทุกจุดที่ยังตอบเป็นข้อความอยู่
   ========================================================================== */

/** ตั้งชื่อปุ่มจากลิงก์ ให้ลูกค้ารู้ว่ากดแล้วไปไหน ดีกว่าคำว่า "เปิดลิงก์" ลอย ๆ */
function labelForUrl(url: string): string {
  if (url.includes("/booking/")) return "เปิดหน้าการจอง";
  if (url.includes("/receipt/")) return "เปิดใบเสร็จ";
  if (url.includes("/job/")) return "เปิดหน้างาน";
  if (url.includes("/fees")) return "ดูค่าบริการทั้งหมด";
  if (url.includes("/cars")) return "ดูรถทั้งหมด";
  if (url.includes("/contact")) return "ติดต่อเรา";
  if (url.includes("/how-to-book")) return "วิธีจองรถ";
  if (url.endsWith("/my")) return "การจองของฉัน";
  return "เปิดลิงก์";
}

/** อีโมจินำหน้าหัวข้อ ใช้เดาโทนสีของการ์ดให้เข้ากับเนื้อหา */
function toneFromText(text: string): Tone {
  if (/[❌⛔🚫]/.test(text)) return "danger";
  if (/[⚠️⌛⏳]/.test(text)) return "warn";
  if (/[✅✔️🎉]/.test(text)) return "ok";
  return "green";
}

/**
 * ห่อข้อความธรรมดาให้เป็นการ์ด Flex
 *
 * บรรทัดแรกกลายเป็นหัวการ์ด ลิงก์ในข้อความถูกดึงออกมาเป็นปุ่ม (สูงสุด 3 ปุ่ม)
 * ที่เหลือเป็นเนื้อความ — เว้นวรรคบรรทัดว่างไว้เหมือนเดิมเพื่อไม่ให้อ่านติดกัน
 *
 * ทำที่เดียวใน replyMessage/pushMessage แล้วทั้งระบบเปลี่ยนตาม
 * ไม่ต้องไล่แก้ทีละจุดแล้วตกหล่น
 */
export function flexFromText(raw: string) {
  const text = raw.trim();
  const urls = [...new Set(text.match(/https?:\/\/[^\s)]+/g) ?? [])].slice(0, 3);

  // เอาลิงก์ออกจากเนื้อความ เพราะย้ายไปเป็นปุ่มแล้ว
  let stripped = text;
  for (const u of urls) stripped = stripped.split(u).join("");

  const lines = stripped
    .split("\n")
    .map((l) => l.trim())
    .filter((l, i, arr) => !(l === "" && (i === 0 || arr[i - 1] === "")));

  const title = (lines.shift() ?? "แจ้งจากระบบ").slice(0, 40);
  while (lines.length && lines[0] === "") lines.shift();
  while (lines.length && lines[lines.length - 1] === "") lines.pop();

  const body =
    lines.length > 0
      ? lines.map((line) =>
          line === ""
            ? { type: "filler" }
            : {
                type: "text",
                text: line,
                size: "sm",
                color: INK,
                wrap: true,
              }
        )
      : [{ type: "text", text: title, size: "sm", color: INK, wrap: true }];

  return card({
    altText: text.replace(/\n/g, " ").slice(0, 300),
    title,
    tone: toneFromText(title + stripped),
    body: [
      {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: body,
      },
    ],
    buttons: urls.map((u, i) => (i === 0 ? btn(labelForUrl(u), u) : btnGold(labelForUrl(u), u))),
  });
}

