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

const BLUE = "#2563EB";
const SLATE = "#0F172A";
const MUTED = "#64748B";

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

/** ข้อความยืนยันหลังจองสำเร็จ */
export function bookingDone(opts: {
  bookingId: string;
  carLabel: string;
  total: number;
  deposit: number;
  bankInfo: string;
  bookingUrl?: string;
}) {
  return {
    type: "flex",
    altText: "จองสำเร็จ",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          { type: "text", text: "จองสำเร็จ", weight: "bold", size: "xl", color: "#059669" },
          {
            type: "text",
            text: `รหัสจอง ${opts.bookingId.slice(0, 8).toUpperCase()}`,
            size: "sm",
            color: MUTED,
          },
          { type: "separator", margin: "md" },
          { type: "text", text: opts.carLabel, weight: "bold", color: SLATE, wrap: true },
          {
            type: "text",
            text: `ยอดรวม ${opts.total.toLocaleString()} บาท`,
            size: "sm",
            color: MUTED,
          },
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: `โอนค่าจอง ${opts.deposit.toLocaleString()} บาท`,
            weight: "bold",
            size: "lg",
            color: BLUE,
            wrap: true,
          },
          { type: "text", text: opts.bankInfo, size: "xs", color: MUTED, wrap: true },
          {
            type: "text",
            text: "โอนแล้วส่งรูปสลิปเข้ามาในแชทนี้ได้เลย",
            size: "sm",
            color: SLATE,
            wrap: true,
            margin: "md",
          },
          {
            type: "text",
            text: "อย่าลืมเลือกจุดรับ-ส่งรถ และส่งเอกสาร (บัตรประชาชน ใบขับขี่ เอกสารการเดินทาง/ที่พัก) ในหน้าจองครับ",
            size: "xs",
            color: MUTED,
            wrap: true,
            margin: "md",
          },
        ],
      },
      ...(opts.bookingUrl
        ? {
            footer: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "button",
                  style: "primary",
                  color: BLUE,
                  action: {
                    type: "uri",
                    label: "เลือกจุดรับ-ส่ง / ส่งเอกสาร",
                    uri: opts.bookingUrl,
                  },
                },
              ],
            },
          }
        : {}),
    },
  };
}
