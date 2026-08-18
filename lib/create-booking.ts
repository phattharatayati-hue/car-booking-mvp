import { prisma } from "@/lib/prisma";
import { getSettings, toBangkokDate, isWithinHours } from "@/lib/settings";
import { ACTIVE_BOOKING_STATUSES, needsApproval } from "@/lib/booking-status";
import { notifyAdmin, buildNewBookingMessage, siteUrl } from "@/lib/line";
import { normalizePlace } from "@/lib/pickup-points";
import { getPickupPoints } from "@/lib/pickup-points-server";

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
  pickupPlace?: string | null;
  returnPlace?: string | null;
};

export type CreateBookingResult =
  | { ok: true; bookingId: string; isRequest: boolean; totalPrice: number; deposit: number }
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
  if (
    !isWithinHours(start, settings.openHour, settings.closeHour) ||
    !isWithinHours(end, settings.openHour, settings.closeHour)
  ) {
    return {
      ok: false,
      status: 400,
      error: `รับ-คืนรถได้เฉพาะเวลา ${String(settings.openHour).padStart(2, "0")}:00 - ${String(
        settings.closeHour
      ).padStart(2, "0")}:00 น.`,
    };
  }

  const car = await prisma.car.findUnique({
    where: { id: carId },
    include: { partner: true },
  });
  if (!car || car.status !== "AVAILABLE") {
    return { ok: false, status: 400, error: "รถคันนี้ไม่เปิดให้จอง" };
  }

  const overlapping = await prisma.booking.findFirst({
    where: {
      carId,
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
      startDate: { lt: end },
      endDate: { gt: start },
    },
  });
  if (overlapping) {
    return {
      ok: false,
      status: 409,
      error: "รถคันนี้ถูกจองในช่วงวันที่เลือกแล้ว กรุณาเลือกวันอื่นหรือรถคันอื่น",
    };
  }

  const days = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );
  const totalPrice = days * car.pricePerDay;

  const phone = String(input.phone).replace(/[\s-]/g, "");
  let customer = await prisma.customer.findFirst({ where: { phone } });

  if (customer?.isBlacklisted) {
    return { ok: false, status: 403, error: "ไม่สามารถจองได้ กรุณาติดต่อแอดมิน" };
  }

  if (customer) {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        fullName: fullName || customer.fullName,
        email: email || customer.email,
        lineUserId: input.lineUserId ?? customer.lineUserId,
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
      status: isRequest ? "REQUESTED" : "PENDING_DEPOSIT",
    },
  });

  try {
    await notifyAdmin(
      buildNewBookingMessage({
        bookingId: booking.id,
        carLabel: `${car.brand} ${car.name}`,
        customerName: customer.fullName,
        phone,
        startDate: start,
        endDate: end,
        totalPrice,
        siteUrl: siteUrl(),
        isRequest,
        partnerName: car.partner?.name,
        partnerPhone: car.partner?.phone,
        pickupPlace,
        returnPlace,
      })
    );
  } catch (err) {
    console.error("notifyAdmin failed:", err);
  }

  return {
    ok: true,
    bookingId: booking.id,
    isRequest,
    totalPrice,
    deposit: settings.bookingFee,
  };
}
