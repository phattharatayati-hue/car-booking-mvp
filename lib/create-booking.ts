import { clashWhere, CLASH_TURNAROUND_NOTE } from "@/lib/turnaround";
import { prisma } from "@/lib/prisma";
import { getSettings, lateRuleFromSettings, toBangkokDate } from "@/lib/settings";
import { quoteBooking } from "@/lib/pricing";
import { getAfterHoursRates } from "@/lib/after-hours-server";
import { ACTIVE_BOOKING_STATUSES, needsApproval } from "@/lib/booking-status";
import { notifyAdminRaw, pushRaw, siteUrl } from "@/lib/line";
import { flexNewBookingAdmin, flexBookingRequested } from "@/lib/line-flex";
import { normalizePlace } from "@/lib/pickup-points";
import { getPickupPoints } from "@/lib/pickup-points-server";
import { isTooSoon, leadTimeMessage } from "@/lib/booking-rules";
import { sweepUnpaidHolds, holdUntilFrom } from "@/lib/unpaid-hold";
import { getCarRates } from "@/lib/car-rates-server";
import { bookingFeeOf } from "@/lib/car-money";
import {
  bangkokDateStrOf,
  blockingRates,
  checkMinDays,
  minDaysMessage,
  formatRateRange,
} from "@/lib/car-rates";

export type CreateBookingInput = {
  carId: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  fullName: string;
  phone: string;
  email?: string | null;
  lineUserId?: string | null;
  /** ลูกค้าที่เข้าสู่ระบบด้วย LINE อยู่แล้ว — ใช้ค่านี้เป็นตัวตนก่อนเสมอ */
  customerId?: string | null;
  pickupPlace?: string | null;
  returnPlace?: string | null;

  /* ---- ใช้เฉพาะตอนแอดมินสร้างใบให้ลูกค้าเอง (โทรมา/ทักแชทมา) ---- */

  /** id ของแอดมินที่กรอกใบนี้ — มีค่าแปลว่าเป็นใบที่สร้างจากหลังบ้าน */
  createdByAdminUserId?: string | null;
  /** ห้ามส่งแจ้งเตือน LINE หาลูกค้าใบนี้ */
  silent?: boolean;
  /** ข้ามกฎที่มีไว้กันลูกค้า (จองล่วงหน้า/ขั้นต่ำ/ช่วงปิดรับจอง) — ไม่ข้ามการจองทับ */
  skipCustomerRules?: boolean;
  /** ยอดรวมที่ตกลงกันจริง — ใส่มาแล้วใช้ทับยอดที่ระบบคิด */
  priceOverride?: number | null;
  /** ช่องทางที่จอง — ดู lib/booking-channel.ts */
  channel?: "WEB" | "LIFF" | "LINE_CHAT" | "ADMIN";
  /** บันทึกภายใน เขียนลง adminNote ตั้งแต่สร้าง */
  adminNote?: string | null;
  /** สร้างเป็นยืนยันแล้วเลย (เก็บค่าจองมาแล้ว) */
  markConfirmed?: boolean;
};

export type CreateBookingResult =
  | {
      ok: true;
      bookingId: string;
      isRequest: boolean;
      totalPrice: number;
      deposit: number;
      afterHoursTotal: number;
    }
  | { ok: false; status: number; error: string };

/**
 * สร้างการจอง — ใช้ร่วมกันทั้งเว็บ, LIFF และแชท LINE
 * จุดสำคัญคือกฎการตรวจสอบทั้งหมดอยู่ที่เดียว ไม่ต้องไล่แก้หลายที่
 */
export async function createBooking(
  input: CreateBookingInput
): Promise<CreateBookingResult> {
  const { carId, startDate, endDate, startTime, endTime, fullName, email } = input;

  if (!carId || !startDate || !endDate || !fullName || !input.phone) {
    return { ok: false, status: 400, error: "ข้อมูลไม่ครบ" };
  }

  const settings = await getSettings();
  /* เวลารับ-คืนต้องมาครบเสมอ ไม่ปล่อยให้ตกเป็น 00:00 เงียบ ๆ
     ใบที่เวลาเป็นเที่ยงคืนทำให้คนส่งรถไม่รู้ว่านัดกี่โมง และค่านอกเวลาคิดผิด */
  const timeOk = (t?: string) => typeof t === "string" && /^\d{2}:\d{2}$/.test(t.slice(0, 5));
  if (!timeOk(startTime) || !timeOk(endTime)) {
    return { ok: false, status: 400, error: "กรุณาเลือกเวลารับรถและเวลาคืนรถ" };
  }

  const start = toBangkokDate(String(startDate), startTime);
  const end = toBangkokDate(String(endDate), endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, status: 400, error: "รูปแบบวันเวลาไม่ถูกต้อง" };
  }
  if (end <= start) {
    return { ok: false, status: 400, error: "เวลาคืนรถต้องหลังเวลารับรถ" };
  }
  if (start.getTime() < Date.now()) {
    return { ok: false, status: 400, error: "เลือกเวลารับรถย้อนหลังไม่ได้" };
  }
  // ต้องจองล่วงหน้า — กฎอยู่ที่ lib/booking-rules.ts ที่เดียว
  const adminMade = Boolean(input.createdByAdminUserId);
  /* แอดมินข้ามกฎที่มีไว้กันลูกค้าได้ — ลูกค้าโทรมาขอรับรถบ่ายนี้เป็นเรื่องปกติหน้าร้าน
     แต่ "จองทับคิว" ไม่ข้าม เพราะรถคันเดียวอยู่สองที่พร้อมกันไม่ได้ */
  const skipRules = adminMade && input.skipCustomerRules !== false;

  if (!skipRules && isTooSoon(start, settings.minLeadHours)) {
    return { ok: false, status: 400, error: leadTimeMessage(settings.minLeadHours) };
  }
  const car = await prisma.car.findUnique({
    where: { id: carId },
    include: { partner: true },
  });
  if (!car || car.status !== "AVAILABLE") {
    return { ok: false, status: 400, error: "รถคันนี้ไม่เปิดให้จอง" };
  }

  /* ปล่อยคิวของคนที่กดจองแล้วไม่โอนก่อน แล้วค่อยเช็คว่าทับกันไหม
     ไม่งั้นใบจองร้างจะบล็อกรถไว้เรื่อย ๆ */
  await sweepUnpaidHolds(settings.holdMinutes);

  const overlapping = await prisma.booking.findFirst({
    where: {
      carId,
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
      /* เว้นช่วงเตรียมรถระหว่างคิว — แอดมินที่ข้ามกฎลูกค้าได้ ข้ามช่วงเว้นได้ด้วย
         (รู้เองว่าล้างรถทันไหม) แต่ทับเวลาจริงของใบอื่นไม่ได้ */
      ...clashWhere(start, end, skipRules ? 0 : settings.turnaroundMinutes),
    },
  });
  if (overlapping) {
    return {
      ok: false,
      status: 409,
      error:
        "รถคันนี้ถูกจองในช่วงเวลาที่เลือกแล้ว กรุณาเลือกเวลาอื่นหรือรถคันอื่น" +
        CLASH_TURNAROUND_NOTE(skipRules ? 0 : settings.turnaroundMinutes),
    };
  }

  /* ช่วงราคา/ช่วงปิดรับจองของรถคันนี้ — อ่านครั้งเดียวแล้วใช้ทั้งการตรวจและการคิดราคา

     เดิมตรงนี้ไม่ได้อ่านเลย ผลคือ (1) ราคาช่วงเทศกาลที่ลูกค้าเห็นบนเว็บ
     ไม่ถูกใช้ตอนบันทึกจริง ระบบเก็บราคาปกติ และ (2) ช่วงที่แอดมินปิดรับจอง
     ถูกซ่อนแค่ในปฏิทิน ใครยิงเข้ามาทางอื่นยังจองทับได้ */
  const carRates = await getCarRates(car.id);

  const startStr = bangkokDateStrOf(start);
  const endStr = bangkokDateStrOf(end);

  const blocked = skipRules ? [] : blockingRates(startStr, endStr, carRates);
  if (blocked.length > 0) {
    return {
      ok: false,
      status: 409,
      error: `ช่วง ${formatRateRange(blocked[0])} ปิดรับจองรถคันนี้ (${blocked[0].label}) กรุณาเลือกวันอื่นหรือรถคันอื่น`,
    };
  }

  // ราคา = ค่าเช่าตามจำนวนวัน + ค่าธรรมเนียมนอกเวลา (คิดแยกตอนรับและตอนคืน)
  const rates = await getAfterHoursRates();
  const quote = quoteBooking({
    start,
    end,
    pricePerDay: car.pricePerDay,
    rates,
    carRates,
    lateRule: lateRuleFromSettings(settings),
  });

  /* จำนวนวันขั้นต่ำของช่วงที่ถูกแตะ — ใช้ days จาก quote เพราะเป็นตัวเดียวกับที่คิดเงิน
     (คืนช้าเกินเวลาผ่อนผันนับเพิ่มเป็นอีกวัน) */
  const minHit = skipRules ? null : checkMinDays(startStr, endStr, quote.days, carRates);
  if (minHit) {
    return {
      ok: false,
      status: 400,
      error: minDaysMessage(minHit, quote.days),
    };
  }
  /* ยอดที่ตกลงกันจริงชนะยอดที่ระบบคิดเสมอ — ใบจากหน้าร้านมักมีราคาพิเศษที่ตกลงในแชท */
  const totalPrice =
    input.priceOverride != null && input.priceOverride >= 0
      ? Math.floor(input.priceOverride)
      : quote.total;

  const phone = String(input.phone).replace(/[\s-]/g, "");
  /* เบอร์โทรบังคับและต้องโทรได้จริง — ลูกค้าที่ไม่ผูก LINE ติดต่อได้ทางเดียวคือโทร
     รับเบอร์ไทย 0XXXXXXXX(X) หรือเบอร์ต่างประเทศขึ้นต้นด้วย + */
  if (!/^(0\d{8,9}|\+\d{8,15})$/.test(phone)) {
    return {
      ok: false,
      status: 400,
      error: "เบอร์โทรไม่ถูกต้อง กรุณากรอกเบอร์ 10 หลัก เช่น 0812345678 (ต่างประเทศขึ้นต้นด้วย +)",
    };
  }

  /* หาตัวลูกค้า — เรียงตามความน่าเชื่อถือของหลักฐาน
       1. customerId จากเซสชัน (เข้าสู่ระบบด้วย LINE แล้ว)
       2. lineUserId ที่เซิร์ฟเวอร์ LINE ยืนยัน (จาก LIFF หรือแชท)
       3. เบอร์โทร — สำหรับคนที่จองโดยไม่เข้าสู่ระบบเท่านั้น

     ข้อ 3 จับคู่เฉพาะลูกค้าที่ "ยังไม่ผูก LINE" (lineUserId: null)
     ห้ามให้การจองแบบไม่ล็อกอินไปเกาะกับบัญชีที่ยืนยันตัวตนแล้ว
     ไม่งั้นใครก็ตามที่รู้เบอร์ของลูกค้าคนอื่นจะยัดการจองเข้าประวัติเขาได้ */
  let customer =
    (input.customerId
      ? await prisma.customer.findUnique({ where: { id: input.customerId } })
      : null) ??
    (input.lineUserId
      ? await prisma.customer.findUnique({
          where: { lineUserId: input.lineUserId },
        })
      : null) ??
    (phone
      ? await prisma.customer.findFirst({ where: { phone, lineUserId: null } })
      : null);

  if (customer?.isBlacklisted) {
    return { ok: false, status: 403, error: "ไม่สามารถจองได้ กรุณาติดต่อแอดมิน" };
  }

  if (customer) {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        fullName: fullName || customer.fullName,
        phone: phone || customer.phone,
        email: email || customer.email,
        lineUserId: customer.lineUserId ?? input.lineUserId ?? null,
      },
    });
  } else {
    customer = await prisma.customer.create({
      data: {
        fullName,
        phone,
        email: email || null,
        lineUserId: input.lineUserId ?? null,
      },
    });
  }

  const isRequest = needsApproval(car);

  const points = await getPickupPoints();
  const pickupPlace = normalizePlace(input.pickupPlace, points);
  const returnPlace = normalizePlace(input.returnPlace, points);

  const booking = await prisma.booking.create({
    data: {
      carId,
      customerId: customer.id,
      startDate: start,
      endDate: end,
      totalPrice,
      pickupPlace,
      returnPlace,
      status: input.markConfirmed
        ? "CONFIRMED"
        : isRequest
          ? "REQUESTED"
          : "PENDING_DEPOSIT",
      adminNote: input.adminNote?.trim() || null,
      channel: input.channel ?? (input.createdByAdminUserId ? "ADMIN" : "WEB"),
      silent: Boolean(input.silent),
      createdByAdminUserId: input.createdByAdminUserId ?? null,
      // นาฬิกากันคิวเริ่มเดินเมื่อลูกค้าโอนได้จริงเท่านั้น
      // ใบที่ต้องรอเจ้าของรถตอบจะตั้งเวลาให้ตอนแอดมินกดอนุมัติแทน
      /* ใบที่แอดมินกรอกเองไม่นับถอยหลัง — นาฬิกากันคิวมีไว้ไล่คนจองเล่นบนเว็บ
         ใบที่แอดมินรับสายแล้วจดไว้ ไม่ควรถูกยกเลิกเองกลางดึก */
      holdUntil:
        adminMade || isRequest || input.markConfirmed
          ? null
          : holdUntilFrom(settings.holdMinutes),
    },
  });

  /* แจ้งแอดมินเฉพาะใบที่ต้องให้คนตัดสินใจก่อน (รถพาร์ทเนอร์ที่ต้องเช็คกับเจ้าของ)
     ใบจองรถของเราเองจะเงียบไว้จนกว่าลูกค้าจะอัปสลิป — กันคนจองเล่นกินโควตาข้อความ
     แอดมินดูใบที่ยังไม่โอนได้ที่ /admin/bookings?status=awaiting และในสรุปรายวัน */
  if (isRequest) {
    try {
      await notifyAdminRaw(
        flexNewBookingAdmin({
        bookingId: booking.id,
        carLabel: `${car.brand} ${car.name}`,
        customerName: customer.fullName,
        phone,
        start,
        end,
        total: totalPrice,
        afterHoursTotal: quote.afterHoursTotal,
        isRequest,
        partnerName: car.partner?.name,
        partnerPhone: car.partner?.phone,
        pickupPlace,
        returnPlace,
          adminUrl: `${siteUrl()}/admin/bookings`,
        })
      );
    } catch (err) {
      console.error("notifyAdmin failed:", err);
    }
  }

  /* แจ้งลูกค้าที่ผูก LINE ไว้ — เฉพาะใบที่ต้องรอเจ้าของรถตอบ เพราะลูกค้ายังโอนไม่ได้
     จึงต้องมีอะไรค้างในแชทบอกว่ากำลังเช็คให้อยู่

     ใบจองปกติไม่ส่งแล้ว: ยอดค่าจอง เลขบัญชี และช่องอัปสลิป อยู่ครบที่หน้า
     /booking/<id> ซึ่งเปิดต่อจากหน้าจองทันที ลูกค้าจะได้ข้อความ LINE ฉบับแรก
     ตอนอัปสลิปเสร็จ ไม่ใช่ตอนกดจอง */
  if (customer.lineUserId && isRequest && !input.silent) {
    try {
      const bookingUrl = `${siteUrl()}/booking/${booking.id}`;

      await pushRaw(customer.lineUserId, [
        flexBookingRequested({
          bookingId: booking.id,
          carLabel: `${car.brand} ${car.name}`,
          start,
          end,
          total: totalPrice,
          bookingUrl,
        }),
      ]);

    } catch (err) {
      console.error("notify customer failed:", err);
    }
  }

  return {
    ok: true,
    bookingId: booking.id,
    isRequest,
    totalPrice,
    deposit: bookingFeeOf(car, settings),
    afterHoursTotal: quote.afterHoursTotal,
  };
}
