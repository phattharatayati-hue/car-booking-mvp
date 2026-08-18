import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import {
  replyMessage,
  replyRaw,
  getProfileName,
  getMessageContent,
  notifyAdmin,
  buildNewBookingMessage,
  buildSlipUploadedMessage,
  siteUrl,
} from "@/lib/line";
import { carCarousel, bookingSummary, datePicker, bookingDone, FlexCar } from "@/lib/line-flex";

import {
  getSettings,
  toBangkokDate,
  formatBangkokDateTime,
  isWithinHours,
} from "@/lib/settings";

const DAY_MS = 86400000;
import { ACTIVE_BOOKING_STATUSES, needsApproval } from "@/lib/booking-status";
import { getBusyRanges, formatBusyRanges } from "@/lib/availability";

const ACTIVE = ACTIVE_BOOKING_STATUSES;
import { BANK_ACCOUNT } from "@/lib/contact";

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

function hoursLabel(openHour: number, closeHour: number) {
  return `${String(openHour).padStart(2, "0")}:00 - ${String(closeHour).padStart(2, "0")}:00 น.`;
}

function dayCount(start: Date, end: Date) {
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / DAY_MS));
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

  const [settings, busy] = await Promise.all([
    getSettings(),
    getBusyRanges(car.id, 60),
  ]);

  const busyText = formatBusyRanges(busy);

  await replyRaw(replyToken, [
    { type: "text", text: `${car.brand} ${car.name}\n\n${busyText}` },
    datePicker({
      title: `${car.brand} ${car.name}`,
      description: `${car.pricePerDay.toLocaleString()} บาท/วัน\n\nเลือกวันและเวลาที่ต้องการรับรถ\n(รับ-คืนรถได้ ${hoursLabel(
        settings.openHour,
        settings.closeHour
      )})`,
      label: "เลือกวัน-เวลารับรถ",
      action: "pick_start",
      min: pickerMin(new Date()),
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

  const settings = await getSettings();
  const start = toBangkokDate(dateStr);

  if (!isWithinHours(start, settings.openHour, settings.closeHour)) {
    await replyMessage(
      replyToken,
      `รับรถได้เฉพาะเวลา ${hoursLabel(
        settings.openHour,
        settings.closeHour
      )}\nกรุณาเลือกเวลาใหม่ครับ`
    );
    return;
  }

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

  if (!isWithinHours(end, settings.openHour, settings.closeHour)) {
    await replyMessage(
      replyToken,
      `คืนรถได้เฉพาะเวลา ${hoursLabel(
        settings.openHour,
        settings.closeHour
      )}\nกรุณาเลือกเวลาใหม่ครับ`
    );
    return;
  }

  // เช็คว่ามีคนจองทับช่วงนี้หรือยัง
  const clash = await prisma.booking.findFirst({
    where: {
      carId: car.id,
      status: { in: [...ACTIVE] },
      startDate: { lt: end },
      endDate: { gt: start },
    },
  });

  if (clash) {
    await replyMessage(
      replyToken,
      'ขออภัยครับ รถคันนี้มีคนจองในช่วงวันที่เลือกแล้ว\nกรุณาเลือกวันอื่น หรือพิมพ์ "จองรถ" เพื่อเลือกคันใหม่'
    );
    return;
  }

  const days = dayCount(start, end);
  const total = days * car.pricePerDay;

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
      total,
      serviceNote: settings.serviceNote,
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
  const existing = await prisma.customer.findFirst({ where: { lineUserId } });
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
      startDate: { lt: end },
      endDate: { gt: start },
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

  const days = dayCount(start, end);
  const total = days * car.pricePerDay;
  const name = (await getProfileName(lineUserId)) ?? "ลูกค้า LINE";

  // หาลูกค้าเดิมจากเบอร์ ถ้าไม่มีค่อยสร้างใหม่ (ให้ blacklist ทำงาน)
  let customer = await prisma.customer.findFirst({ where: { phone } });

  if (customer?.isBlacklisted) {
    await clearDraft(lineUserId);
    await replyMessage(replyToken, "ไม่สามารถจองได้ กรุณาติดต่อแอดมินครับ");
    return;
  }

  if (customer) {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: { lineUserId, fullName: customer.fullName || name },
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
    },
  });

  await clearDraft(lineUserId);

  const deposit = (await getSettings()).bookingFee;

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
      }),
    ]);
  }

  try {
    await notifyAdmin(
      buildNewBookingMessage({
        bookingId: booking.id,
        carLabel: `${car.brand} ${car.name}`,
        customerName: customer.fullName,
        phone,
        startDate: start,
        endDate: end,
        totalPrice: total,
        siteUrl: siteUrl(),
        isRequest,
        partnerName: car.partner?.name,
        partnerPhone: car.partner?.phone,
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

/** รับรูปสลิปที่ลูกค้าส่งเข้ามาในแชท */
export async function handleSlipImage(
  replyToken: string,
  lineUserId: string,
  messageId: string
): Promise<boolean> {
  const customer = await prisma.customer.findFirst({ where: { lineUserId } });
  if (!customer) {
    await replyMessage(
      replyToken,
      'ยังไม่พบการจองของคุณครับ\nพิมพ์ "จองรถ" เพื่อเริ่มจองได้เลย'
    );
    return true;
  }

  // การจองล่าสุดที่ยังรอสลิป
  const booking = await prisma.booking.findFirst({
    where: { customerId: customer.id, status: "PENDING_DEPOSIT" },
    orderBy: { createdAt: "desc" },
    include: { car: true, deposit: true },
  });

  if (!booking) {
    await replyMessage(
      replyToken,
      "ไม่พบการจองที่รอสลิปค่าจองครับ\nถ้าต้องการจองใหม่ พิมพ์ \"จองรถ\" ได้เลย"
    );
    return true;
  }

  const content = await getMessageContent(messageId);
  if (!content) {
    await replyMessage(replyToken, "ดาวน์โหลดรูปไม่สำเร็จ กรุณาส่งใหม่อีกครั้งครับ");
    return true;
  }

  try {
    const ext = content.contentType.includes("png") ? "png" : "jpg";
    const blob = await put(`slips/line-${booking.id}-${messageId}.${ext}`, content.buffer, {
      access: "private",
      addRandomSuffix: true,
      contentType: content.contentType,
    });

    const settings = await getSettings();
    const amount = booking.deposit?.amount || settings.bookingFee;
    const slipUrl = `/api/file?p=${encodeURIComponent(blob.pathname)}`;

    await prisma.deposit.upsert({
      where: { bookingId: booking.id },
      create: {
        bookingId: booking.id,
        amount,
        slipImageUrl: slipUrl,
        status: "PENDING",
      },
      update: { slipImageUrl: slipUrl, status: "PENDING" },
    });

    await replyMessage(
      replyToken,
      [
        "✅ ได้รับสลิปแล้วครับ",
        "",
        `รหัสจอง: ${booking.id.slice(0, 8).toUpperCase()}`,
        `รถ: ${booking.car.brand} ${booking.car.name}`,
        "",
        "แอดมินจะตรวจสอบและยืนยันให้เร็วที่สุด",
        "เราจะแจ้งผลกลับมาทางแชทนี้ครับ",
      ].join("\n")
    );

    await notifyAdmin(
      buildSlipUploadedMessage({
        bookingId: booking.id,
        carLabel: `${booking.car.brand} ${booking.car.name}`,
        customerName: customer.fullName,
        amount,
        siteUrl: siteUrl(),
      })
    );
  } catch (err) {
    console.error("slip upload failed:", err);
    await replyMessage(replyToken, "บันทึกสลิปไม่สำเร็จ กรุณาลองใหม่อีกครั้งครับ");
  }

  return true;
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
