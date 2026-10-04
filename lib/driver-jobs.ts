import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { pushMessage, pushRaw, siteUrl } from "@/lib/line";
import { getSettings, formatBangkokDateTime, formatBangkokTime } from "@/lib/settings";
import { getPickupPoints } from "@/lib/pickup-points-server";
import { bookingFeeOf, securityDepositOf } from "@/lib/car-money";
import { HANDOFF_LABEL, type HandoffKind } from "@/lib/assignments";
import { rentBreakdown } from "@/lib/rent-breakdown";
import {
  flexJobCard,
  flexJobAck,
  jobClosedText,
  jobCancelledText,
  JOB_HEADLINE,
  leaveAt,
  mapsLink,
} from "@/lib/driver-cards";
import { driverHelp } from "@/lib/line-help";

/**
 * บรรทัดจุดนัดในข้อความหาคนรับงาน
 *
 * ใส่ลิงก์แผนที่เฉพาะจุดที่คนขับอาจไม่รู้ว่าอยู่ตรงไหน
 * จุดประจำที่ตั้งไว้ในระบบ (สนามบิน อาเขต สถานีรถไฟ) ทุกคนไปเป็นอยู่แล้ว
 * ลิงก์ Maps ที่มีภาษาไทยจะถูกเข้ารหัสเป็น %E0%B8... ยาวเต็มจอในแชท
 * กลบข้อมูลที่ต้องอ่านจริง ๆ อย่างเวลานัดกับทะเบียนรถจนหาไม่เจอ
 */
async function placeLines(place: string | null): Promise<string[]> {
  if (!place) return [];

  try {
    const points = await getPickupPoints();
    if (points.some((p) => p.name === place)) return [`จุดนัด: ${place}`];
  } catch (err) {
    // อ่านรายการจุดไม่ได้ก็ใส่ลิงก์ไปตามเดิม ดีกว่าไม่มีอะไรให้กด
    console.error("placeLines: getPickupPoints failed", err);
  }

  return [`จุดนัด: ${place}`, `🗺 ${mapsLink(place)}`];
}

/** เวลาที่ควรออกเดินทาง = เวลานัด ลบเวลาเผื่อเดินทาง */
const jobInclude = {
  admin: true,
  booking: { include: { car: true, customer: true, deposit: true } },
} as const;

type Job = Prisma.BookingAssignmentGetPayload<{ include: typeof jobInclude }>;

/** ยอดที่ต้องเก็บหน้างาน — เก็บเฉพาะงานส่งรถ */
async function moneyDue(job: Job) {
  if (job.kind !== "DELIVERY") return null;
  const settings = await getSettings();
  const paid = job.booking.deposit?.amount ?? bookingFeeOf(job.booking.car, settings);
  const carDeposit = securityDepositOf(job.booking.car, settings);
  const rental = Math.max(0, job.booking.totalPrice - paid);
  return {
    rental,
    deposit: carDeposit,
    total: rental + carDeposit,
  };
}

/** ข้อความคิวงานแบบตัวหนังสือ — ใช้เป็น altText และใช้ตอบในรายการงาน */
export async function jobText(job: Job): Promise<string> {
  const kind = job.kind as HandoffKind;
  const money = await moneyDue(job);
  const car = job.booking.car;
  const place = await placeLines(job.place);

  return [
    `🚗 ${HANDOFF_LABEL[kind]} — ${formatBangkokDateTime(job.meetAt)}`,
    "",
    `⏰ ออกเดินทาง ${formatBangkokTime(leaveAt(job.meetAt))} น.`,
    "",
    `รถ: ${car.brand} ${car.name}`,
    `ทะเบียน: ${car.licensePlate}`,
    "",
    `ลูกค้า: ${job.booking.customer.fullName}`,
    `โทร: ${job.booking.customer.phone}`,
    ...place,
    ...(money
      ? [
          "",
          `💰 เก็บเงินหน้างาน ${money.total.toLocaleString()} บาท`,
          `   • ค่าเช่าคงเหลือ ${money.rental.toLocaleString()}`,
          `   • เงินประกัน ${money.deposit.toLocaleString()}`,
        ]
      : []),
    "",
    "หน้างานต้องทำ",
    "1. ขอดูบัตรประชาชนและใบขับขี่ตัวจริง",
    "2. ถ่ายรูป/วิดีโอรอบคันก่อนส่งมอบ",
    "3. จดเลขไมล์และระดับน้ำมัน",
    ...(job.note ? ["", `หมายเหตุ: ${job.note}`] : []),
    "",
    `รหัสจอง: ${job.bookingId.slice(0, 8).toUpperCase()}`,
  ].join("\n");
}


/**
 * ช่วงเวลาที่คนรับงานเปิดดูเอกสารลูกค้าได้
 *
 * เปิดได้ตลอดตั้งแต่ได้รับมอบหมาย (เตรียมงานล่วงหน้าได้)
 * แล้วปิดถาวรเมื่อพ้นเวลานัดไป 1 วัน — ไม่ปล่อยให้ลิงก์บัตรประชาชนและใบขับขี่
 * ของลูกค้าค้างเปิดได้ตลอดไปหลังจบงาน
 */
export const JOB_VIEW_AFTER_MS = 24 * 3600 * 1000;

export function jobViewOpen(meetAt: Date, now: Date = new Date()): boolean {
  return now.getTime() <= meetAt.getTime() + JOB_VIEW_AFTER_MS;
}

/** กุญแจเปิดหน้าเอกสารของงานนี้ — สร้างครั้งแรกครั้งเดียวแล้วใช้ซ้ำ */
async function viewTokenFor(job: Job): Promise<string> {
  if (job.viewToken) return job.viewToken;

  const token = crypto.randomBytes(24).toString("base64url");
  await prisma.bookingAssignment.update({
    where: { id: job.id },
    data: { viewToken: token },
  });
  return token;
}

/* สีของการ์ดงานยกมาจากชุดเดียวกับข้อความลูกค้า (lib/line-flex.ts)
   จะได้เป็นระบบเดียวกันทั้ง OA ไม่ใช่โทนน้ำเงินแยกอีกชุดเหมือนเดิม */

/** การ์ดงานพร้อมปุ่มปิดงาน — ใช้โครงการ์ดกลางจาก lib/line-flex.ts */
async function jobFlex(job: Job, headline?: string) {
  const car = job.booking.car;
  const [money, alt, token] = await Promise.all([
    moneyDue(job),
    jobText(job),
    viewTokenFor(job),
  ]);

  return flexJobCard({
    jobId: job.id,
    kind: job.kind as HandoffKind,
    meetAt: job.meetAt,
    carLabel: `${car.brand} ${car.name}`,
    plate: car.licensePlate,
    customerName: job.booking.customer.fullName,
    customerPhone: job.booking.customer.phone,
    place: job.place,
    note: job.note,
    money,
    headline,
    ackedAt: job.ackedAt,
    jobUrl: `${siteUrl()}/job/${token}`,
    altText: alt,
  });
}

export type NotifyResult = "sent" | "no-line" | "not-found" | "error";

export async function notifyJob(
  assignmentId: string,
  mode: "new" | "updated" | "resend" | "cancelled" = "new"
): Promise<NotifyResult> {
  try {
    const job = await prisma.bookingAssignment.findUnique({
      where: { id: assignmentId },
      include: jobInclude,
    });
    if (!job) return "not-found";

    // คนรับงานยังไม่ได้ผูก LINE — ส่งไม่ได้ ต้องบอกแอดมินให้รู้ ไม่ใช่เงียบไป
    if (!job.admin.lineUserId) return "no-line";

    if (mode === "cancelled") {
      await pushMessage(
        job.admin.lineUserId,
        jobCancelledText({
          kind: job.kind as HandoffKind,
          meetAt: job.meetAt,
          carLabel: `${job.booking.car.brand} ${job.booking.car.name}`,
          plate: job.booking.car.licensePlate,
          bookingId: job.bookingId,
        })
      );
      return "sent";
    }

    const headline =
      mode === "updated"
        ? JOB_HEADLINE.updated
        : mode === "resend"
          ? JOB_HEADLINE.resend
          : undefined;
    await pushRaw(job.admin.lineUserId, [await jobFlex(job, headline)]);

    await prisma.bookingAssignment.update({
      where: { id: job.id },
      data: { notifiedAt: new Date() },
    });

    return "sent";
  } catch (err) {
    console.error("notifyJob failed:", err);
    return "error";
  }
}

/** คิวงานของคนที่พิมพ์ถาม — วันนี้และพรุ่งนี้ */
export async function myJobsFlex(lineUserId: string) {
  const admin = await prisma.adminUser.findFirst({ where: { lineUserId } });
  if (!admin) return null;

  const now = new Date();
  const until = new Date(now.getTime() + 2 * 86400000);

  const jobs = await prisma.bookingAssignment.findMany({
    where: {
      adminUserId: admin.id,
      doneAt: null,
      meetAt: { gte: new Date(now.getTime() - 6 * 3600000), lte: until },
    },
    orderBy: { meetAt: "asc" },
    include: jobInclude,
    take: 5,
  });

  if (jobs.length === 0) {
    return [
      {
        type: "text",
        text: "ไม่มีคิวงานรับ-ส่งรถใน 2 วันนี้ครับ\nถ้ามีงานใหม่ ระบบจะส่งการ์ดงานมาให้ทันที",
      },
    ];
  }

  return Promise.all(jobs.map((j) => jobFlex(j)));
}

/** คนรับงานกดปุ่ม "รับทราบ" — ออฟฟิศจะเห็นว่างานถึงมือแล้ว */
/**
 * คนรับงานกด "รับทราบ" — ตอบกลับเป็นการ์ดสรุปงานครบในใบเดียว
 *
 * เรียงตามที่หน้างานต้องใช้: รถ → ลูกค้า+เบอร์ → รับ/คืน → ค่าเช่า ประกัน
 * ปุ่มโทรหาลูกค้าอยู่ในการ์ดเลย ไม่ต้องเลื่อนกลับขึ้นไปหาการ์ดงาน
 * (การ์ดงานเดิมที่มีรายละเอียดยอดเก็บหน้างานยังอยู่เหมือนเดิม ไม่ได้แตะ)
 *
 * คืนเป็นข้อความธรรมดาเฉพาะกรณีกดไม่ได้ (ไม่พบงาน · ไม่ใช่งานของคุณ · กดซ้ำ)
 */
export async function ackJob(
  assignmentId: string,
  lineUserId: string
): Promise<string | Record<string, unknown>> {
  const job = await prisma.bookingAssignment.findUnique({
    where: { id: assignmentId },
    include: jobInclude,
  });

  if (!job) return "ไม่พบงานนี้ในระบบครับ";
  if (job.admin.lineUserId !== lineUserId) return "งานนี้ไม่ใช่งานของคุณครับ";
  if (job.ackedAt) {
    return `รับทราบงานนี้ไปแล้วเมื่อ ${formatBangkokDateTime(job.ackedAt)} ครับ`;
  }

  await prisma.bookingAssignment.update({
    where: { id: job.id },
    data: { ackedAt: new Date() },
  });

  /* อัปเดตรายละเอียดในปฏิทินให้เป็นชุดล่าสุดตอนคนส่งรถกดรับงาน
     (event ที่สร้างไว้ก่อนแก้หน้าตาจะได้รายละเอียดใหม่ด้วย)
     ต้อง await — บน Vercel ถ้าไม่รอ ฟังก์ชันอาจจบก่อนซิงก์เสร็จ
     syncAssignment ไม่ throw อยู่แล้ว ปฏิทินล่มก็ยังตอบ LINE ได้ */
  const { syncAssignment } = await import("@/lib/calendar-sync");
  await syncAssignment(job.id);

  const b = job.booking;
  const car = b.car;
  const [settings, rent, placeInfo] = await Promise.all([
    getSettings(),
    rentBreakdown(b),
    placeLines(job.place),
  ]);

  return flexJobAck({
    kind: job.kind as HandoffKind,
    meetAt: job.meetAt,
    carLabel: `${car.brand} ${car.name}`,
    plate: car.licensePlate,
    customerName: b.customer.fullName,
    customerPhone: b.customer.phone,
    start: b.startDate,
    end: b.endDate,
    pickupPlace: b.pickupPlace,
    returnPlace: b.returnPlace,
    rent,
    totalPrice: b.totalPrice,
    deposit: securityDepositOf(car, settings),
    // placeLines ใส่ลิงก์แผนที่เฉพาะจุดที่ไม่ใช่จุดประจำ — ใช้ตัวเดียวกันตัดสินปุ่มแผนที่
    mapPlace: job.place && placeInfo.length > 1 ? job.place : null,
  });
}

/** คนรับงานกดปุ่มปิดงานจากการ์ด */
export async function closeJob(
  assignmentId: string,
  lineUserId: string
): Promise<string> {
  const job = await prisma.bookingAssignment.findUnique({
    where: { id: assignmentId },
    include: jobInclude,
  });

  if (!job) return "ไม่พบงานนี้ในระบบครับ";
  if (job.admin.lineUserId !== lineUserId) return "งานนี้ไม่ใช่งานของคุณครับ";
  if (job.doneAt) {
    return `งานนี้ปิดไปแล้วเมื่อ ${formatBangkokDateTime(job.doneAt)} ครับ`;
  }

  await prisma.bookingAssignment.update({
    where: { id: job.id },
    // ปิดงานได้แปลว่าเห็นงานแน่นอน ถ้ายังไม่เคยกดรับทราบก็ถือว่ารับทราบตอนนี้
    data: { doneAt: new Date(), ackedAt: job.ackedAt ?? new Date() },
  });

  // งานรับรถคืนเสร็จ = จบการเช่า ปิดสถานะการจองให้เลย
  if (job.kind === "PICKUP") {
    await prisma.booking.update({
      where: { id: job.bookingId },
      data: { status: "COMPLETED" },
    });
  }

  return jobClosedText({
    kind: job.kind as HandoffKind,
    carLabel: `${job.booking.car.brand} ${job.booking.car.name}`,
    plate: job.booking.car.licensePlate,
    bookingId: job.bookingId,
  });
}

/** งานของคนนี้ที่กำลังอยู่ในช่วงทำ — ใช้ผูกรูปและเลขไมล์ที่ส่งเข้ามาในแชท */
async function recentJob(adminUserId: string): Promise<Job | null> {
  const now = new Date();
  return prisma.bookingAssignment.findFirst({
    where: {
      adminUserId,
      meetAt: {
        gte: new Date(now.getTime() - 2 * 86400000),
        lte: new Date(now.getTime() + 86400000),
      },
    },
    orderBy: [{ doneAt: "desc" }, { meetAt: "desc" }],
    include: jobInclude,
  });
}

/**
 * คนรับงานพิมพ์เลขไมล์/ระดับน้ำมันเข้าแชท เช่น
 *   ไมล์ 45120
 *   น้ำมัน เต็มถัง
 *   ไมล์ 45120 น้ำมัน ครึ่งถัง
 * คืน null ถ้าข้อความไม่เข้ารูปแบบนี้ (ให้ webhook ไปตรวจคำสั่งอื่นต่อ)
 */
/**
 * คนรับ-ส่งรถส่งรูปหรือพิมพ์เลขไมล์เข้าแชท
 *
 * เดิมระบบพยายาม "เดา" ว่าเป็นของงานไหน โดยหางานในช่วง ±วันสองวันแล้วเรียงเอาอันล่าสุด
 * ซึ่งเดาผิดจริง — ปิดงาน ATIV-01 แล้วรูปไปเข้า CROSS-01 เพราะคนนั้นมีหลายงานในช่วงเดียวกัน
 * เลขไมล์ผิดคันอันตรายกว่ารูปอีก เพราะเถียงกับลูกค้าไม่ออก
 *
 * ตอนนี้จึงไม่รับทางแชทแล้ว แต่พาไปหน้างานที่ผูกกับงานชิ้นเดียวแทน
 * คืน null ถ้าคนส่งไม่ใช่พนักงาน (ให้ webhook ไปตรวจว่าเป็นสลิปของลูกค้าต่อ)
 */
async function pointToJobPage(lineUserId: string): Promise<string | null> {
  const admin = await prisma.adminUser.findFirst({ where: { lineUserId } });
  if (!admin) return null;

  const job = await recentJob(admin.id);
  if (!job) {
    return "ไม่พบงานรับ-ส่งรถที่กำลังจะถึงครับ\nพิมพ์ “งานของฉัน” เพื่อดูคิวงาน";
  }

  const token = await viewTokenFor(job);

  return [
    "ส่งรูปและเลขไมล์ทางแชทไม่ได้แล้วครับ",
    "",
    "เปิดหน้างานแล้วส่งจากตรงนั้นแทน ระบบจะเก็บเข้างานให้ถูกใบเสมอ",
    `งาน${HANDOFF_LABEL[job.kind as HandoffKind]} · ${job.booking.car.licensePlate}`,
    "",
    `${siteUrl()}/job/${token}`,
    "",
    "ถ้าไม่ใช่งานนี้ พิมพ์ “งานของฉัน” เพื่อเลือกงานที่ถูกต้อง",
  ].join("\n");
}

/** รูปที่พนักงานส่งเข้าแชท — ตอบกลับด้วยลิงก์หน้างาน */
export async function saveJobPhoto(
  lineUserId: string,
  _messageId: string
): Promise<string | null> {
  return pointToJobPage(lineUserId);
}

/** เลขไมล์/น้ำมันที่พิมพ์เข้าแชท — ตอบกลับด้วยลิงก์หน้างาน */
export async function saveJobReading(
  lineUserId: string,
  text: string
): Promise<string | null> {
  const looksLikeReading = /(?:ไมล์|เลขไมล์|odo|น้ำมัน|fuel)/i.test(text);
  if (!looksLikeReading) return null;
  return pointToJobPage(lineUserId);
}

export async function driverHelpText(lineUserId: string): Promise<string | null> {
  const admin = await prisma.adminUser.findFirst({ where: { lineUserId } });
  if (!admin || admin.role !== "DRIVER") return null;

  return driverHelp(admin.name);
}
