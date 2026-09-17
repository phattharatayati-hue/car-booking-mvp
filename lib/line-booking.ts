import { prisma } from "@/lib/prisma";
import { unresolvedDocuments } from "@/lib/documents";
import { clashWhere } from "@/lib/turnaround";
import { bookingFeeOf } from "@/lib/car-money";
import {
  replyMessage,
  replyRaw,
  getProfileName,
  notifyAdminRaw,
  siteUrl,
} from "@/lib/line";
import {
  carCarousel,
  bookingSummary,
  datePicker,
  bookingDone,
  flexNewBookingAdmin,
  flexUploadOnWeb,
  FlexCar,
} from "@/lib/line-flex";

import {
  getSettings,
  lateRuleFromSettings,
  toBangkokDate,
  formatBangkokDateTime,
} from "@/lib/settings";
import { quoteBooking, feeForMinute, bangkokMinuteOfDay } from "@/lib/pricing";
import { getAfterHoursRates } from "@/lib/after-hours-server";
import { getCarRates } from "@/lib/car-rates-server";
import {
  blockingRates,
  bangkokDateStrOf,
  formatRateRange,
  checkMinDays,
  minDaysMessage,
} from "@/lib/car-rates";

import { ACTIVE_BOOKING_STATUSES, needsApproval } from "@/lib/booking-status";
import { getBusyRanges, formatBusyRanges } from "@/lib/availability";

const ACTIVE = ACTIVE_BOOKING_STATUSES;
import { BANK_ACCOUNT } from "@/lib/contact";
import { earliestPickup, leadTimeShort, URGENT_LINE } from "@/lib/booking-rules";

const BANK_INFO = BANK_ACCOUNT;

/** ค่า min ของ datetimepicker — รูปแบบ YYYY-MM-ddTHH:mm ตามเวลาไทย */
function pickerMin(from: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(from);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** สรุปค่าธรรมเนียมนอกเวลาให้ลูกค้าเห็นในแชท */
function afterHoursNote(
  start: Date,
  end: Date,
  rates: Awaited<ReturnType<typeof getAfterHoursRates>>
): string | null {
  const p = feeForMinute(bangkokMinuteOfDay(start), rates);
  const r = feeForMinute(bangkokMinuteOfDay(end), rates);
  const parts: string[] = [];
  if (p.fee > 0) parts.push(`รับรถนอกเวลา +${p.fee.toLocaleString()} บาท`);
  if (r.fee > 0) parts.push(`คืนรถนอกเวลา +${r.fee.toLocaleString()} บาท`);
  return parts.length ? parts.join(" · ") : null;
}

async function clearDraft(lineUserId: string) {
  await prisma.lineDraft.deleteMany({ where: { lineUserId } });
}

/** ขั้นที่ 1 — แสดงรถให้เลือก */
export async function startBooking(replyToken: string, lineUserId: string) {
  const cars = await prisma.car.findMany({
    where: { status: "AVAILABLE" },
    orderBy: { pricePerDay: "asc" },
    take: 12,
  });

  if (cars.length === 0) {
    await replyMessage(replyToken, "ขออภัยครับ ตอนนี้ยังไม่มีรถว่างให้จอง");
    return;
  }

  await prisma.lineDraft.upsert({
    where: { lineUserId },
    create: { lineUserId, step: "pick_car" },
    update: { step: "pick_car", carId: null, startDate: null, endDate: null },
  });

  await replyRaw(replyToken, [
    { type: "text", text: "เลือกรถที่ต้องการจองได้เลยครับ 🚗" },
    carCarousel(cars as FlexCar[], siteUrl()),
  ]);
}

/** ขั้นที่ 2 — เลือกรถแล้ว ขอวันรับรถ */
async function handlePickCar(replyToken: string, lineUserId: string, carId: string) {
  const car = await prisma.car.findUnique({ where: { id: carId } });
  if (!car || car.status !== "AVAILABLE") {
    await replyMessage(replyToken, "ขออภัยครับ รถคันนี้ไม่เปิดให้จองแล้ว");
    return;
  }

  await prisma.lineDraft.upsert({
    where: { lineUserId },
    create: { lineUserId, step: "pick_start", carId },
    update: { step: "pick_start", carId, startDate: null, endDate: null },
  });

  const busy = await getBusyRanges(car.id, 60);

  const busyText = formatBusyRanges(busy);

  // กฎจองล่วงหน้าตั้งได้ที่ /admin/settings
  const leadHours = (await getSettings()).minLeadHours;

  await replyRaw(replyToken, [
    { type: "text", text: `${car.brand} ${car.name}\n\n${busyText}` },
    datePicker({
      title: `${car.brand} ${car.name}`,
      description: `${car.pricePerDay.toLocaleString()} บาท/วัน\n\nเลือกวันและเวลาที่ต้องการรับรถ\n(รับ-คืนได้ทุกเวลา นอกเวลาทำการมีค่าบริการเพิ่ม)\n\n⏱ ${leadTimeShort(leadHours)}\n${URGENT_LINE}`,
      label: "เลือกวัน-เวลารับรถ",
      action: "pick_start",
      // ปฏิทินใน LINE เปิดให้เลือกได้ตั้งแต่วันแรกที่จองได้จริง จะได้ไม่เลือกแล้วโดนปฏิเสธทีหลัง
      min: pickerMin(earliestPickup(leadHours)),
    }),
  ]);
}

/** ขั้นที่ 3 — เลือกวันรับแล้ว ขอวันคืน */
async function handlePickStart(replyToken: string, lineUserId: string, dateStr: string) {
  const draft = await prisma.lineDraft.findUnique({ where: { lineUserId } });
  if (!draft?.carId) {
    await replyMessage(replyToken, 'เริ่มใหม่อีกครั้งนะครับ พิมพ์ "จองรถ" ได้เลย');
    return;
  }

  const start = toBangkokDate(dateStr);

  const minEnd = new Date(start.getTime() + 3600000);

  await prisma.lineDraft.update({
    where: { lineUserId },
    data: { step: "pick_end", startDate: start },
  });

  await replyRaw(replyToken, [
    datePicker({
      title: "เลือกวัน-เวลาคืนรถ",
      description: `รับรถ ${formatBangkokDateTime(start)}`,
      label: "เลือกวัน-เวลาคืนรถ",
      action: "pick_end",
      min: pickerMin(minEnd),
    }),
  ]);
}

/** ขั้นที่ 4 — สรุปให้ยืนยัน */
async function handlePickEnd(replyToken: string, lineUserId: string, dateStr: string) {
  const draft = await prisma.lineDraft.findUnique({ where: { lineUserId } });
  if (!draft?.carId || !draft.startDate) {
    await replyMessage(replyToken, 'เริ่มใหม่อีกครั้งนะครับ พิมพ์ "จองรถ" ได้เลย');
    return;
  }

  const car = await prisma.car.findUnique({ where: { id: draft.carId } });
  if (!car) {
    await replyMessage(replyToken, "ไม่พบรถคันนี้แล้วครับ");
    await clearDraft(lineUserId);
    return;
  }

  const settings = await getSettings();
  const start = new Date(draft.startDate);
  const end = toBangkokDate(dateStr);

  if (end <= start) {
    await replyMessage(replyToken, "เวลาคืนรถต้องหลังเวลารับรถครับ กรุณาเลือกใหม่");
    return;
  }

  // เช็คว่ามีคนจองทับช่วงนี้หรือยัง
  const clash = await prisma.booking.findFirst({
    where: {
      carId: car.id,
      status: { in: [...ACTIVE] },
      ...clashWhere(start, end, (await getSettings()).turnaroundMinutes),
    },
  });

  if (clash) {
    await replyMessage(
      replyToken,
      'ขออภัยครับ รถคันนี้มีคนจองในช่วงเวลาที่เลือกแล้ว (รวมเวลาเตรียมรถระหว่างคิว)\nกรุณาเลือกเวลาอื่น หรือพิมพ์ "จองรถ" เพื่อเลือกคันใหม่'
    );
    return;
  }

  const carRates = await getCarRates(car.id);
  const blocked = blockingRates(bangkokDateStrOf(start), bangkokDateStrOf(end), carRates);
  if (blocked.length > 0) {
    await replyMessage(
      replyToken,
      `ขออภัยครับ รถคันนี้ปิดรับจองช่วง ${formatRateRange(blocked[0])} (${blocked[0].label})\nกรุณาเลือกวันอื่นครับ`
    );
    return;
  }

  const rates = await getAfterHoursRates();
  const quote = quoteBooking({
    start,
    end,
    pricePerDay: car.pricePerDay,
    rates,
    carRates,
    lateRule: lateRuleFromSettings(await getSettings()),
  });
  const days = quote.days;

  /* ขั้นต่ำของช่วงที่ถูกแตะ — เช็คตรงนี้ตอนลูกค้าเลือกวันคืนรถเสร็จ
     จะได้บอกทันทีในแชท ไม่ปล่อยให้กรอกเบอร์จนจบแล้วค่อยโดนปฏิเสธที่ด่านสุดท้าย */
  const minHit = checkMinDays(
    bangkokDateStrOf(start),
    bangkokDateStrOf(end),
    days,
    carRates
  );
  if (minHit) {
    await replyMessage(
      replyToken,
      `ขออภัยครับ ${minDaysMessage(minHit, days)}\nกรุณาเลือกวันคืนรถให้ครบตามขั้นต่ำ หรือเลือกช่วงวันอื่นครับ`
    );
    return;
  }

  const total = quote.total;
  const note = afterHoursNote(start, end, rates);

  await prisma.lineDraft.update({
    where: { lineUserId },
    data: { step: "confirm", endDate: end },
  });

  await replyRaw(replyToken, [
    bookingSummary({
      carLabel: `${car.brand} ${car.name}`,
      start,
      end,
      days,
      pricePerDay: car.pricePerDay,
      segments: quote.segments,
      total,
      serviceNote: [note, settings.serviceNote].filter(Boolean).join("\n"),
    }),
  ]);
}

/** ขั้นที่ 5 — ยืนยันแล้ว ขอเบอร์โทร */
async function handleConfirm(replyToken: string, lineUserId: string) {
  const draft = await prisma.lineDraft.findUnique({ where: { lineUserId } });
  if (!draft?.carId || !draft.startDate || !draft.endDate) {
    await replyMessage(replyToken, 'เริ่มใหม่อีกครั้งนะครับ พิมพ์ "จองรถ" ได้เลย');
    return;
  }

  // ถ้าเคยจองแล้วมีเบอร์อยู่ในระบบ ใช้เบอร์เดิมได้เลย ไม่ต้องถามซ้ำ
  const existing = await prisma.customer.findUnique({ where: { lineUserId } });
  if (existing) {
    await finalizeBooking(replyToken, lineUserId, existing.phone);
    return;
  }

  await prisma.lineDraft.update({ where: { lineUserId }, data: { step: "ask_phone" } });

  await replyMessage(
    replyToken,
    "เกือบเสร็จแล้วครับ 📱\n\nกรุณาพิมพ์เบอร์โทรศัพท์ของคุณ\n(เพื่อให้เราติดต่อกลับได้ในวันรับรถ)"
  );
}

/** ขั้นสุดท้าย — สร้างการจองจริง */
async function finalizeBooking(replyToken: string, lineUserId: string, phone: string) {
  const draft = await prisma.lineDraft.findUnique({ where: { lineUserId } });
  if (!draft?.carId || !draft.startDate || !draft.endDate) {
    await replyMessage(replyToken, 'เริ่มใหม่อีกครั้งนะครับ พิมพ์ "จองรถ" ได้เลย');
    return;
  }

  const car = await prisma.car.findUnique({
    where: { id: draft.carId },
    include: { partner: true },
  });
  if (!car) {
    await replyMessage(replyToken, "ไม่พบรถคันนี้แล้วครับ");
    await clearDraft(lineUserId);
    return;
  }

  const start = new Date(draft.startDate);
  const end = new Date(draft.endDate);

  // เช็คซ้ำอีกครั้ง เผื่อมีคนจองตัดหน้าระหว่างกรอกเบอร์
  const clash = await prisma.booking.findFirst({
    where: {
      carId: car.id,
      status: { in: [...ACTIVE] },
      ...clashWhere(start, end, (await getSettings()).turnaroundMinutes),
    },
  });

  if (clash) {
    await clearDraft(lineUserId);
    await replyMessage(
      replyToken,
      'ขออภัยครับ รถคันนี้เพิ่งมีคนจองตัดหน้าไป\nพิมพ์ "จองรถ" เพื่อเลือกใหม่ได้เลย'
    );
    return;
  }

  const rates = await getAfterHoursRates();
  const quote = quoteBooking({
    start,
    end,
    pricePerDay: car.pricePerDay,
    rates,
    carRates: await getCarRates(car.id),
    lateRule: lateRuleFromSettings(await getSettings()),
  });
  const total = quote.total;
  const name = (await getProfileName(lineUserId)) ?? "ลูกค้า LINE";

  /* ตัวตนของลูกค้าคือบัญชี LINE ที่กำลังคุยอยู่ ไม่ใช่เบอร์ที่พิมพ์เข้ามา
     เบอร์เป็นแค่ข้อมูลติดต่อ จึงอัปเดตทับได้ แต่ห้ามใช้ค้นหาตัวตน
     ไม่งั้นพิมพ์เบอร์ของคนอื่นแล้วจะไปเกาะบัญชีเขา */
  let customer = await prisma.customer.findUnique({ where: { lineUserId } });

  if (customer?.isBlacklisted) {
    await clearDraft(lineUserId);
    await replyMessage(replyToken, "ไม่สามารถจองได้ กรุณาติดต่อแอดมินครับ");
    return;
  }

  if (customer) {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: { phone, fullName: customer.fullName || name },
    });
  } else {
    customer = await prisma.customer.create({
      data: { fullName: name, phone, lineUserId },
    });
  }

  const isRequest = needsApproval(car);

  const booking = await prisma.booking.create({
    data: {
      carId: car.id,
      customerId: customer.id,
      startDate: start,
      endDate: end,
      totalPrice: total,
      status: isRequest ? "REQUESTED" : "PENDING_DEPOSIT",
      channel: "LINE_CHAT",
    },
  });

  await clearDraft(lineUserId);

  const deposit = bookingFeeOf(car, await getSettings());

  if (isRequest) {
    await replyMessage(
      replyToken,
      [
        "📩 ส่งคำขอจองเรียบร้อยแล้ว",
        "",
        `รถ: ${car.brand} ${car.name}`,
        `รับรถ: ${formatBangkokDateTime(start)}`,
        `คืนรถ: ${formatBangkokDateTime(end)}`,
        `ยอดรวม: ${total.toLocaleString()} บาท`,
        ...(quote.afterHoursTotal
          ? [`(รวมค่ารับ-คืนนอกเวลา ${quote.afterHoursTotal.toLocaleString()} บาท)`]
          : []),
        `รหัสคำขอ: ${booking.id.slice(0, 8).toUpperCase()}`,
        "",
        "รถคันนี้เป็นรถจากพาร์ทเนอร์",
        "เราจะติดต่อเจ้าของรถเพื่อเช็ควันว่าง",
        "แล้วแจ้งผลกลับทางแชทนี้โดยเร็วที่สุดครับ",
        "",
        "⚠️ ยังไม่ต้องโอนค่าจองจนกว่าจะได้รับการยืนยัน",
      ].join("\n")
    );
  } else {
    await replyRaw(replyToken, [
      bookingDone({
        bookingId: booking.id,
        carLabel: `${car.brand} ${car.name}`,
        total,
        deposit,
        bankInfo: BANK_INFO,
        bookingUrl: `${siteUrl()}/booking/${booking.id}`,
        specialDeposit:
          car.securityDeposit != null &&
          car.securityDeposit !== (await getSettings()).securityDeposit
            ? car.securityDeposit
            : null,
      }),
    ]);
  }

  try {
    await notifyAdminRaw(
      flexNewBookingAdmin({
        bookingId: booking.id,
        carLabel: `${car.brand} ${car.name}`,
        customerName: customer.fullName,
        phone,
        start,
        end,
        total,
        afterHoursTotal: quote.afterHoursTotal,
        isRequest,
        partnerName: car.partner?.name,
        partnerPhone: car.partner?.phone,
        adminUrl: `${siteUrl()}/admin/bookings`,
      })
    );
  } catch (err) {
    console.error("notifyAdmin failed:", err);
  }
}

/** รับเบอร์โทรที่ลูกค้าพิมพ์มา */
export async function handlePhoneInput(
  replyToken: string,
  lineUserId: string,
  text: string
): Promise<boolean> {
  const draft = await prisma.lineDraft.findUnique({ where: { lineUserId } });
  if (draft?.step !== "ask_phone") return false;

  const phone = text.replace(/[\s-]/g, "");
  if (!/^0\d{8,9}$/.test(phone)) {
    await replyMessage(
      replyToken,
      "เบอร์โทรไม่ถูกต้องครับ\nกรุณาพิมพ์เบอร์ 10 หลัก เช่น 0812345678"
    );
    return true;
  }

  await finalizeBooking(replyToken, lineUserId, phone);
  return true;
}

/**
 * ลูกค้าส่งรูปเข้ามาในแชท
 *
 * ไม่รับสลิปหรือเอกสารทางแชทแล้ว — ทุกอย่างแนบผ่านหน้าการจองบนเว็บ
 * เพราะรูปในแชทไม่รู้ว่าเป็นเอกสารชนิดไหน และเคยตอบซ้ำทีละรูปจนลูกค้างง
 *
 * - ยังไม่แนบสลิป            → ตอบปุ่มแนบสลิป
 * - แนบแล้วแต่เอกสารไม่ครบ  → ตอบปุ่มอัปโหลดเอกสาร
 * - อย่างอื่น                → เงียบ ให้แอดมินคุยเอง (รูปยังอยู่ในแชท OA)
 *
 * ส่งหลายรูปพร้อมกัน LINE จะส่ง event มาทีละรูปพร้อม imageSet
 * ตอบเฉพาะรูปแรกของชุด
 */
export async function handleCustomerImage(
  replyToken: string,
  lineUserId: string,
  imageSet?: { index?: number; total?: number }
): Promise<void> {
  if (imageSet && (imageSet.index ?? 1) > 1) return;

  const customer = await prisma.customer.findUnique({ where: { lineUserId } });
  if (!customer) return;

  const booking = await prisma.booking.findFirst({
    where: {
      customerId: customer.id,
      status: { in: ["PENDING_DEPOSIT", "CONFIRMED"] },
      endDate: { gte: new Date() },
    },
    orderBy: { createdAt: "desc" },
    include: { deposit: true, documents: true },
  });
  if (!booking) return;

  const bookingUrl = `${siteUrl()}/booking/${booking.id}`;
  const needSlip = !booking.deposit || booking.deposit.status === "REJECTED";

  if (needSlip && booking.status === "PENDING_DEPOSIT") {
    await replyRaw(replyToken, [
      flexUploadOnWeb({ bookingId: booking.id, target: "slip", bookingUrl }),
    ]);
    return;
  }

  if (booking.deposit && unresolvedDocuments(booking.documents).length > 0) {
    await replyRaw(replyToken, [
      flexUploadOnWeb({ bookingId: booking.id, target: "docs", bookingUrl }),
    ]);
  }
}

/** จัดการ postback ทั้งหมดจากปุ่มในแชท */
export async function handlePostback(
  replyToken: string,
  lineUserId: string,
  data: string,
  pickedDate?: string
) {
  const params = new URLSearchParams(data);
  const action = params.get("action");

  switch (action) {
    case "start_booking":
      await startBooking(replyToken, lineUserId);
      return;

    case "pick_car": {
      const carId = params.get("carId");
      if (carId) await handlePickCar(replyToken, lineUserId, carId);
      return;
    }

    case "pick_start":
      if (pickedDate) await handlePickStart(replyToken, lineUserId, pickedDate);
      return;

    case "pick_end":
      if (pickedDate) await handlePickEnd(replyToken, lineUserId, pickedDate);
      return;

    case "confirm":
      await handleConfirm(replyToken, lineUserId);
      return;

    case "cancel":
      await clearDraft(lineUserId);
      await replyMessage(
        replyToken,
        'ยกเลิกแล้วครับ\nถ้าต้องการจองใหม่ พิมพ์ "จองรถ" ได้เลย'
      );
      return;

    default:
      await replyMessage(replyToken, 'พิมพ์ "จองรถ" เพื่อเริ่มจองได้เลยครับ');
  }
}

/** ยกเลิกการจองที่ค้างอยู่ */
export async function cancelDraft(replyToken: string, lineUserId: string) {
  await clearDraft(lineUserId);
  await replyMessage(replyToken, 'ยกเลิกแล้วครับ\nพิมพ์ "จองรถ" เพื่อเริ่มใหม่ได้เลย');
}
