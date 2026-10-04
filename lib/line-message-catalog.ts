/**
 * แคตตาล็อกข้อความ LINE ทั้งหมดของระบบ — ใช้แสดงตัวอย่างในหน้า /admin/notifications
 *
 * ทุกตัวอย่างสร้างจากฟังก์ชันตัวเดียวกับที่ส่งจริง ป้อนข้อมูลสมมติเข้าไป
 * แก้หน้าตาการ์ดหรือถ้อยคำที่ไหน ตัวอย่างที่นี่เปลี่ยนตามเองทันที ไม่ต้องมาแก้ซ้ำ
 *
 * ข้อความตัวหนังสือล้วนถูกห่อด้วย flexFromText เพราะตอนส่งจริง lib/line.ts
 * แปลงเป็นการ์ดแบบเดียวกันนี้ (ลูกค้าเห็นเป็นการ์ด ไม่ใช่ตัวหนังสือดิบ)
 *
 * เพิ่มข้อความใหม่เข้าระบบเมื่อไหร่ ให้มาเพิ่มรายการที่นี่ด้วย จะได้เห็นในหลังบ้าน
 */
import {
  bookingSummary,
  bookingDone,
  carCarousel,
  flexBookingRequested,
  flexBookingUpdated,
  flexUploadOnWeb,
  flexReceipt,
  flexRefundPaid,
  flexBookingStatus,
  flexStatusEmpty,
  flexContact,
  flexFromText,
} from "@/lib/line-flex";
import {
  flexJobCard,
  flexJobAck,
  jobClosedText,
  jobCancelledText,
  JOB_HEADLINE,
} from "@/lib/driver-cards";
import {
  documentRejectedText,
  slipRejectedText,
  requestApprovedText,
  requestRejectedText,
  carSwappedText,
} from "@/lib/customer-texts";
import { HELP_TEXT, feesReplyText, driverHelp } from "@/lib/line-help";
import { sampleMessages } from "@/lib/notification-samples";
import { NOTIFICATIONS } from "@/lib/notification-catalog";
import { PHONES, OFFICE_HOURS, BANK_ACCOUNT } from "@/lib/contact";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type CatalogItem = {
  /** ชื่อข้อความ */
  title: string;
  /** ส่งตอนไหน / ใครเป็นคนกด */
  when: string;
  messages: any[];
};

export type CatalogGroup = {
  id: string;
  title: string;
  note: string;
  items: CatalogItem[];
};

/* ---------- ข้อมูลสมมติชุดเดียวกันทุกการ์ด ---------- */
const SITE = "https://example.com";
const ID = "sample0000000000demo";
const CAR = "Honda City Turbo";
const PLATE = "CITY-01";
const CUSTOMER = "สมชาย ใจดี";
const PHONE = "081-234-5678";
const BOOKING_URL = `${SITE}/booking/${ID}`;

function at(daysFromNow: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const START = at(2, 9);
const END = at(4, 9);
const t = (text: string) => flexFromText(text);

/** การแจ้งเตือนที่เปิด-ปิดได้ในหน้านี้ — ดึงตัวอย่างจากชุดเดิม ไม่เขียนซ้ำ */
function ruleItems(audience: "customer" | "admin"): CatalogItem[] {
  return NOTIFICATIONS.filter((n) => n.audience === audience).map((n) => ({
    title: n.title,
    when: `${n.description} (เปิด-ปิดได้ด้านบน)`,
    messages: sampleMessages(n.key),
  }));
}

export function lineMessageCatalog(): CatalogGroup[] {
  const deliveryJob = {
    jobId: "job-sample",
    kind: "DELIVERY" as const,
    meetAt: START,
    carLabel: CAR,
    plate: PLATE,
    customerName: CUSTOMER,
    customerPhone: PHONE,
    place: "สถานีขนส่งอาเขต",
    note: null,
    money: { rental: 1900, deposit: 3000, total: 4900 },
    ackedAt: null,
    jobUrl: SITE,
    altText: `ไปส่งรถ — ${CAR}`,
  };

  const ackBase = {
    meetAt: START,
    carLabel: CAR,
    plate: PLATE,
    customerName: CUSTOMER,
    customerPhone: PHONE,
    start: START,
    end: END,
    pickupPlace: "สถานีขนส่งอาเขต",
    returnPlace: "สนามบินเชียงใหม่",
    rent: {
      days: 2,
      segments: [{ pricePerDay: 1200, days: 2, total: 2400 }],
      rentTotal: 2400,
    },
    totalPrice: 2400,
    deposit: 3000,
    mapPlace: null,
  };

  return [
    {
      id: "customer-booking",
      title: "ลูกค้า — ขั้นตอนจองในแชท",
      note: "ตอบกลับทันทีตอนลูกค้าจองผ่าน LINE ไม่กินโควตาข้อความ",
      items: [
        {
          title: "เลือกรถ",
          when: "ลูกค้าพิมพ์ “จองรถ” หรือกดเมนู",
          messages: [
            carCarousel(
              [
                { id: "c1", brand: "Honda", name: "City Turbo", pricePerDay: 1200, photoUrl: null, source: "OWN", engineCc: 1000, horsepower: 122, fuelType: "เบนซิน" },
                { id: "c2", brand: "Toyota", name: "Corolla Cross", pricePerDay: 1800, photoUrl: null, source: "OWN" },
              ],
              SITE
            ),
          ],
        },
        {
          title: "สรุปก่อนยืนยัน",
          when: "ลูกค้าเลือกวันรับ-คืนครบแล้ว",
          messages: [
            bookingSummary({
              carLabel: CAR,
              start: START,
              end: END,
              days: 2,
              pricePerDay: 1200,
              total: 2400,
              serviceNote: "ราคานี้รวมประกันชั้น 1 แล้ว",
            }),
          ],
        },
        {
          title: "จองสำเร็จ — แจ้งให้โอนค่าจอง",
          when: "ลูกค้ากดยืนยันการจองรถของร้าน",
          messages: [
            bookingDone({
              bookingId: ID,
              carLabel: CAR,
              total: 2400,
              deposit: 500,
              bankInfo: BANK_ACCOUNT,
              bookingUrl: BOOKING_URL,
            }),
          ],
        },
        {
          title: "ขอจองรถพาร์ทเนอร์",
          when: "ลูกค้าจองรถที่ต้องถามเจ้าของก่อน",
          messages: [
            flexBookingRequested({
              bookingId: ID,
              carLabel: CAR,
              start: START,
              end: END,
              total: 2400,
              bookingUrl: BOOKING_URL,
            }),
          ],
        },
        {
          title: "ส่งต่อไปหน้าเว็บ",
          when: "ลูกค้าส่งรูปสลิปหรือเอกสารเข้าแชท แทนที่จะอัปบนเว็บ",
          messages: [
            flexUploadOnWeb({ bookingId: ID, target: "slip", bookingUrl: BOOKING_URL }),
            flexUploadOnWeb({ bookingId: ID, target: "docs", bookingUrl: BOOKING_URL }),
          ],
        },
      ],
    },
    {
      id: "customer-auto",
      title: "ลูกค้า — แจ้งเตือนอัตโนมัติ",
      note: "ระบบส่งเองตามเหตุการณ์ เปิด-ปิดแต่ละแบบได้ในส่วนด้านบน",
      items: ruleItems("customer"),
    },
    {
      id: "customer-admin",
      title: "ลูกค้า — ส่งเมื่อแอดมินกดปุ่ม",
      note: "ส่งทุกครั้งที่กดในหลังบ้าน ไม่อยู่ในสวิตช์เปิด-ปิด",
      items: [
        {
          title: "อนุมัติคำขอจอง (รถว่าง)",
          when: "กดอนุมัติคำขอจองรถพาร์ทเนอร์",
          messages: [
            t(
              requestApprovedText({
                carLabel: CAR,
                start: START,
                end: END,
                total: 2400,
                bookingFee: 500,
                bookingUrl: BOOKING_URL,
              })
            ),
          ],
        },
        {
          title: "ปฏิเสธคำขอจอง (รถไม่ว่าง)",
          when: "กดปฏิเสธคำขอจองรถพาร์ทเนอร์",
          messages: [t(requestRejectedText({ carLabel: CAR, start: START }))],
        },
        {
          title: "สลิปไม่ผ่าน",
          when: "กดปฏิเสธสลิปค่าจอง",
          messages: [t(slipRejectedText({ bookingId: ID, bookingUrl: BOOKING_URL }))],
        },
        {
          title: "เอกสารไม่ผ่าน",
          when: "กดปฏิเสธเอกสารพร้อมใส่เหตุผล",
          messages: [
            t(
              documentRejectedText({
                documentLabel: "ใบขับขี่",
                reason: "รูปไม่ชัด อ่านเลขไม่ออก",
                bookingUrl: BOOKING_URL,
              })
            ),
          ],
        },
        {
          title: "แก้ไขการจอง",
          when: "แก้วัน เวลา หรือราคาแล้วติ๊กแจ้งลูกค้า",
          messages: [
            flexBookingUpdated({
              bookingId: ID,
              carLabel: CAR,
              start: START,
              end: at(5, 9),
              pickupPlace: "สถานีขนส่งอาเขต",
              returnPlace: "สนามบินเชียงใหม่",
              total: 3600,
              previousTotal: 2400,
              bookingFeePaid: 500,
              securityDeposit: 3000,
              message: "ขยายวันคืนรถตามที่ลูกค้าขอ",
              bookingUrl: BOOKING_URL,
            }),
          ],
        },
        {
          title: "เปลี่ยนรถ",
          when: "เปลี่ยนรถให้ลูกค้าแล้วติ๊กแจ้งลูกค้า",
          messages: [
            t(
              carSwappedText({
                oldLabel: `${CAR} (${PLATE})`,
                newLabel: "Toyota Yaris Ativ (ATIV-02)",
                reasonLabel: "รถคันเดิมเข้าศูนย์",
                newTotal: null,
                bookingUrl: BOOKING_URL,
              })
            ),
          ],
        },
        {
          title: "ใบเสร็จ",
          when: "กดส่งใบเสร็จเข้า LINE",
          messages: [
            flexReceipt({
              number: "RC2569-0001",
              carLabel: CAR,
              total: 2400,
              totalText: "สองพันสี่ร้อยบาทถ้วน",
              url: SITE,
              pdfUrl: SITE,
            }),
          ],
        },
        {
          title: "โอนเงินประกันคืนแล้ว",
          when: "กดยืนยันโอนคืนในหน้าคืนเงินประกัน",
          messages: [
            flexRefundPaid({
              bookingId: ID,
              amount: 2700,
              deductAmount: 300,
              deductReason: "เติมน้ำมันไม่เต็มถัง",
              accountTail: "1234",
              bookingUrl: BOOKING_URL,
            }),
          ],
        },
      ],
    },
    {
      id: "chat-replies",
      title: "บอทตอบในแชท",
      note: "ตอบเมื่อลูกค้าพิมพ์คำสั่งหรือกดเมนู — ข้อความอื่นที่บอทไม่รู้จัก บอทจะเงียบให้แอดมินตอบเอง",
      items: [
        {
          title: "ต้อนรับ / เมนู",
          when: "แอดเพื่อน หรือพิมพ์ “เมนู” “ช่วยเหลือ”",
          messages: [t(HELP_TEXT)],
        },
        {
          title: "ค่าปรับและเงินประกัน",
          when: "พิมพ์ “ค่าปรับ” “เงินประกัน” หรือกดเมนู",
          messages: [t(feesReplyText(SITE))],
        },
        {
          title: "ติดต่อเรา",
          when: "พิมพ์ “ติดต่อ” หรือกดเมนู",
          messages: [
            flexContact({
              phones: PHONES,
              hours: [`เวลาทำการ: ${OFFICE_HOURS[0]}`, OFFICE_HOURS[1]],
              url: `${SITE}/contact`,
            }),
          ],
        },
        {
          title: "เช็คสถานะ",
          when: "พิมพ์ “เช็คสถานะ” หรือรหัสจอง 8 หลัก",
          messages: [
            flexBookingStatus({
              code: ID.slice(0, 8).toUpperCase(),
              carLabel: CAR,
              pickupText: "5 ต.ค. 2569 09:00 น.",
              returnText: "7 ต.ค. 2569 09:00 น.",
              total: 2400,
              statusLabel: "ยืนยันแล้ว",
              note: "เอกสารครบแล้ว รอรับรถตามนัดได้เลยครับ",
              tone: "ok",
              url: BOOKING_URL,
            }),
          ],
        },
        {
          title: "เช็คสถานะ — ยังไม่เคยจอง",
          when: "พิมพ์ “เช็คสถานะ” แต่ยังไม่มีการจอง",
          messages: [flexStatusEmpty({ carsUrl: `${SITE}/cars` })],
        },
      ],
    },
    {
      id: "admin",
      title: "แอดมิน",
      note: "ส่งถึงแอดมินและพนักงานทุกคนที่ผูก LINE ไว้",
      items: ruleItems("admin"),
    },
    {
      id: "driver",
      title: "คนรับ-ส่งรถ",
      note: "ส่งถึงคนที่ได้รับมอบหมายงานเท่านั้น",
      items: [
        {
          title: "การ์ดงานใหม่",
          when: "แอดมินมอบหมายงานส่งรถหรือรับรถคืน",
          messages: [flexJobCard(deliveryJob)],
        },
        {
          title: "แก้ไขงาน",
          when: "แอดมินแก้เวลา จุดนัด หรือหมายเหตุของงาน",
          messages: [flexJobCard({ ...deliveryJob, headline: JOB_HEADLINE.updated })],
        },
        {
          title: "ส่งการ์ดงานซ้ำ",
          when: "แอดมินกดส่งซ้ำ เช่น คนรับงานเพิ่งผูก LINE",
          messages: [flexJobCard({ ...deliveryJob, headline: JOB_HEADLINE.resend })],
        },
        {
          title: "ถอนงาน",
          when: "แอดมินถอนออกจากงาน หรือยกเลิกการจอง",
          messages: [
            t(
              jobCancelledText({
                kind: "DELIVERY",
                meetAt: START,
                carLabel: CAR,
                plate: PLATE,
                bookingId: ID,
              })
            ),
          ],
        },
        {
          title: "รับทราบงานไปส่งรถ",
          when: "กดปุ่ม “รับทราบ” ที่การ์ดงานส่งรถ",
          messages: [flexJobAck({ ...ackBase, kind: "DELIVERY" })],
        },
        {
          title: "รับทราบงานไปรับรถคืน",
          when: "กดปุ่ม “รับทราบ” ที่การ์ดงานรับรถคืน",
          messages: [flexJobAck({ ...ackBase, kind: "PICKUP", meetAt: END })],
        },
        {
          title: "ปิดงาน",
          when: "กดปิดงานในหน้างาน",
          messages: [
            t(jobClosedText({ kind: "PICKUP", carLabel: CAR, plate: PLATE, bookingId: ID })),
          ],
        },
        {
          title: "คำแนะนำการใช้งาน",
          when: "พิมพ์ข้อความที่บอทไม่รู้จัก",
          messages: [t(driverHelp("สมศักดิ์"))],
        },
      ],
    },
  ];
}
