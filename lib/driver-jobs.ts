import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { pushMessage, pushRaw, siteUrl } from "@/lib/line";
import { getSettings, formatBangkokDateTime, formatBangkokTime } from "@/lib/settings";
import { getPickupPoints } from "@/lib/pickup-points-server";
import { HANDOFF_LABEL, TRAVEL_BUFFER_MIN, type HandoffKind } from "@/lib/assignments";
import {
  card,
  kv,
  amountBox,
  noteBox,
  bullets,
  sectionTitle,
  btnGold,
  line,
} from "@/lib/line-flex";

/** ลิงก์ค้นหาจุดนัดใน Google Maps */
function mapsLink(place: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}

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
function leaveAt(meetAt: Date): Date {
  return new Date(meetAt.getTime() - TRAVEL_BUFFER_MIN * 60000);
}

const jobInclude = {
  admin: true,
  booking: { include: { car: true, customer: true, deposit: true } },
} as const;

type Job = Prisma.BookingAssignmentGetPayload<{ include: typeof jobInclude }>;

/** ยอดที่ต้องเก็บหน้างาน — เก็บเฉพาะงานส่งรถ */
async function moneyDue(job: Job) {
  if (job.kind !== "DELIVERY") return null;
  const settings = await getSettings();
  const paid = job.booking.deposit?.amount ?? settings.bookingFee;
  const rental = Math.max(0, job.booking.totalPrice - paid);
  return {
    rental,
    deposit: settings.securityDeposit,
    total: rental + settings.securityDeposit,
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
const GREEN = "#1E5841";

/** การ์ดงานพร้อมปุ่มปิดงาน — ใช้โครงการ์ดกลางจาก lib/line-flex.ts */
async function jobFlex(job: Job, headline?: string) {
  const kind = job.kind as HandoffKind;
  const money = await moneyDue(job);
  const car = job.booking.car;
  const alt = await jobText(job);
  const token = await viewTokenFor(job);

  /* สีแถบหัวบอกชนิดของข่าว
       ไม่มี headline = งานปกติ (เขียว)
       🔁 = แก้ไขรายละเอียด (ทอง/เตือน)
       อื่นๆ = ถอนงาน (แดง) */
  const tone: "green" | "warn" | "danger" = !headline
    ? "green"
    : headline.startsWith("🔁")
      ? "warn"
      : "danger";

  const ackButton = job.ackedAt
    ? {
        type: "box",
        layout: "vertical",
        paddingAll: "8px",
        contents: [
          {
            type: "text",
            text: `✓ รับทราบแล้ว ${formatBangkokTime(job.ackedAt)} น.`,
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
          data: `action=job_ack&id=${job.id}`,
          displayText: "รับทราบ",
        },
      };

  return card({
    altText: alt,
    title: HANDOFF_LABEL[kind],
    subtitle: `${formatBangkokDateTime(job.meetAt)} · ออกเดินทาง ${formatBangkokTime(
      leaveAt(job.meetAt)
    )} น.`,
    tone,
    body: [
      ...(headline ? [noteBox([headline], tone === "danger" ? "warn" : "cream")] : []),
      kv("รถ", `${car.brand} ${car.name}`),
      kv("ทะเบียน", car.licensePlate),
      kv("ลูกค้า", job.booking.customer.fullName),
      kv("โทร", job.booking.customer.phone),
      ...(job.place ? [kv("จุดนัด", job.place)] : []),
      ...(money
        ? [
            line,
            amountBox(
              "เก็บเงินหน้างาน",
              money.total,
              `ค่าเช่าคงเหลือ ${money.rental.toLocaleString()} + เงินประกัน ${money.deposit.toLocaleString()} บาท`
            ),
          ]
        : []),
      ...(job.note ? [noteBox([`หมายเหตุ: ${job.note}`])] : []),
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
       เดิมให้ส่งรูปเข้าแชทแล้วระบบต้องเดาว่าเป็นของงานไหน ซึ่งเดาผิดได้จริง
       ลิงก์นี้ผูกกับงานชิ้นเดียว จึงไม่มีทางเข้าผิดใบ */
    buttons: [
      btnGold("เปิดหน้างาน (เอกสาร · ส่งรูป · ปิดงาน)", `${siteUrl()}/job/${token}`),
      ackButton,
    ],
  });
}

/**
 * แจ้งคนรับงานทาง LINE
 *   new       มอบหมายครั้งแรก
 *   updated   แก้เวลา/จุดนัด/หมายเหตุ
 *   cancelled ถอนออกจากงาน
 */
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
        [
          "❌ งานนี้ถูกยกเลิก ไม่ต้องไปแล้วครับ",
          "",
          `${HANDOFF_LABEL[job.kind as HandoffKind]} ${formatBangkokDateTime(job.meetAt)}`,
          `รถ: ${job.booking.car.brand} ${job.booking.car.name} (${job.booking.car.licensePlate})`,
          `รหัสจอง: ${job.bookingId.slice(0, 8).toUpperCase()}`,
        ].join("\n")
      );
      return "sent";
    }

    const headline =
      mode === "updated"
        ? "⚠️ งานนี้มีการเปลี่ยนแปลง"
        : mode === "resend"
          ? "🔁 ส่งซ้ำ — รายละเอียดเหมือนเดิม"
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
export async function ackJob(assignmentId: string, lineUserId: string): Promise<string> {
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

  const ackPlace = await placeLines(job.place);

  return [
    `✅ รับทราบงาน${HANDOFF_LABEL[job.kind as HandoffKind]}แล้ว`,
    "",
    `นัด ${formatBangkokDateTime(job.meetAt)}`,
    `ออกเดินทาง ${formatBangkokTime(leaveAt(job.meetAt))} น.`,
    `รถ: ${job.booking.car.brand} ${job.booking.car.name} (${job.booking.car.licensePlate})`,
    ...(ackPlace.length ? ["", ...ackPlace] : []),
    "",
    "เมื่อทำงานเสร็จ กดปุ่มปิดงานที่การ์ดได้เลยครับ",
  ].join("\n");
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

  return [
    `✅ ปิดงาน${HANDOFF_LABEL[job.kind as HandoffKind]}เรียบร้อย`,
    "",
    `รถ: ${job.booking.car.brand} ${job.booking.car.name} (${job.booking.car.licensePlate})`,
    `รหัสจอง: ${job.bookingId.slice(0, 8).toUpperCase()}`,
    "",
    "ส่งรูปสภาพรถได้ที่หน้างาน (ปุ่มในการ์ดงาน) ระบบจะเก็บแนบไว้กับงานนี้ให้",
    ...(job.kind === "PICKUP"
      ? ["", "สถานะการจองเปลี่ยนเป็น “เสร็จสิ้น” แล้ว"]
      : []),
  ].join("\n");
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

  return [
    `สวัสดีคุณ ${admin.name} ครับ 🚗`,
    "",
    "คำสั่งที่ใช้ได้ในแชทนี้",
    "• งานของฉัน — ดูคิวงานรับ-ส่งรถ 2 วันนี้",
    "• กดปุ่ม “รับทราบ” ที่การ์ดงาน เพื่อบอกออฟฟิศว่าเห็นงานแล้ว",
    "• ไมล์ 45120 — บันทึกเลขไมล์ของงานล่าสุด",
    "• น้ำมัน เต็มถัง — บันทึกระดับน้ำมัน",
    "• ส่งรูปเข้าแชท — เก็บเป็นรูปสภาพรถของงานนั้น",
    "",
    "เมื่อส่งหรือรับรถคืนเรียบร้อย กดปุ่มปิดงานที่การ์ดงานได้เลยครับ",
  ].join("\n");
}
