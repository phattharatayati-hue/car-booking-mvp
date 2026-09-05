import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { put } from "@vercel/blob";
import { pushMessage, pushRaw, getMessageContent, siteUrl } from "@/lib/line";
import { getSettings, formatBangkokDateTime, formatBangkokTime } from "@/lib/settings";
import { HANDOFF_LABEL, TRAVEL_BUFFER_MIN, type HandoffKind } from "@/lib/assignments";

/** ลิงก์ค้นหาจุดนัดใน Google Maps */
function mapsLink(place: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
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
    ...(job.place ? [`จุดนัด: ${job.place}`, `🗺 ${mapsLink(job.place)}`] : []),
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

const NAVY = "#26456E";
const GOLD = "#8A6E12";
const MUTED = "#647388";

function row(label: string, value: string) {
  return {
    type: "box",
    layout: "baseline",
    spacing: "sm",
    contents: [
      { type: "text", text: label, size: "sm", color: MUTED, flex: 2 },
      { type: "text", text: value, size: "sm", color: "#1B2B41", flex: 4, wrap: true },
    ],
  };
}

/** การ์ดงานพร้อมปุ่มปิดงาน */
async function jobFlex(job: Job, headline?: string) {
  const kind = job.kind as HandoffKind;
  const money = await moneyDue(job);
  const car = job.booking.car;
  const alt = await jobText(job);
  const token = await viewTokenFor(job);

  return {
    type: "flex",
    altText: alt.slice(0, 390),
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: headline ? "#FBEBE9" : "#EAF1FA",
        paddingAll: "14px",
        contents: [
          ...(headline
            ? [{ type: "text", text: headline, size: "sm", weight: "bold", color: "#B34438" }]
            : []),
          {
            type: "text",
            text: HANDOFF_LABEL[kind],
            weight: "bold",
            size: "lg",
            color: headline ? "#B34438" : NAVY,
          },
          {
            type: "text",
            text: formatBangkokDateTime(job.meetAt),
            size: "sm",
            color: MUTED,
          },
          {
            type: "text",
            text: `ออกเดินทาง ${formatBangkokTime(leaveAt(job.meetAt))} น.`,
            size: "xs",
            color: GOLD,
            weight: "bold",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          row("รถ", `${car.brand} ${car.name}`),
          row("ทะเบียน", car.licensePlate),
          row("ลูกค้า", job.booking.customer.fullName),
          row("โทร", job.booking.customer.phone),
          ...(job.place ? [row("จุดนัด", job.place)] : []),
          ...(money
            ? [
                { type: "separator", margin: "md" },
                {
                  type: "text",
                  text: `เก็บเงินหน้างาน ${money.total.toLocaleString()} บาท`,
                  weight: "bold",
                  size: "md",
                  color: GOLD,
                  margin: "md",
                },
                {
                  type: "text",
                  text: `ค่าเช่าคงเหลือ ${money.rental.toLocaleString()} + เงินประกัน ${money.deposit.toLocaleString()}`,
                  size: "xs",
                  color: MUTED,
                },
              ]
            : []),
          ...(job.note
            ? [
                { type: "separator", margin: "md" },
                {
                  type: "text",
                  text: `หมายเหตุ: ${job.note}`,
                  size: "xs",
                  color: MUTED,
                  wrap: true,
                  margin: "md",
                },
              ]
            : []),
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: "หน้างาน: ขอดูบัตร+ใบขับขี่ตัวจริง · ถ่ายรูปรอบคัน · จดเลขไมล์และน้ำมัน",
            size: "xxs",
            color: MUTED,
            wrap: true,
            margin: "md",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          // เปิดหน้าเอกสารลูกค้าของงานนี้ — ใช้เทียบกับตัวจริงหน้างาน
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "uri",
              label: "ดูเอกสารลูกค้า",
              uri: `${siteUrl()}/job/${token}`,
            },
          },
          // ปุ่มรับทราบ — บอกออฟฟิศว่าเห็นงานแล้ว (แทนปุ่มนำทางเดิม)
          job.ackedAt
            ? {
                type: "box",
                layout: "vertical",
                paddingAll: "8px",
                contents: [
                  {
                    type: "text",
                    text: `✓ รับทราบแล้ว ${formatBangkokTime(job.ackedAt)} น.`,
                    size: "sm",
                    color: "#2E7D5B",
                    weight: "bold",
                    align: "center",
                  },
                ],
              }
            : {
                type: "button",
                style: "primary",
                color: NAVY,
                action: {
                  type: "postback",
                  label: "รับทราบ",
                  data: `action=job_ack&id=${job.id}`,
                  displayText: "รับทราบ",
                },
              },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "postback",
              label: job.kind === "DELIVERY" ? "ส่งรถแล้ว" : "รับรถคืนแล้ว",
              data: `action=job_done&id=${job.id}`,
              displayText: job.kind === "DELIVERY" ? "ส่งรถแล้ว" : "รับรถคืนแล้ว",
            },
          },
        ],
      },
    },
  };
}

/**
 * แจ้งคนรับงานทาง LINE
 *   new       มอบหมายครั้งแรก
 *   updated   แก้เวลา/จุดนัด/หมายเหตุ
 *   cancelled ถอนออกจากงาน
 */
export async function notifyJob(
  assignmentId: string,
  mode: "new" | "updated" | "cancelled" = "new"
): Promise<void> {
  try {
    const job = await prisma.bookingAssignment.findUnique({
      where: { id: assignmentId },
      include: jobInclude,
    });
    if (!job?.admin.lineUserId) return;

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
      return;
    }

    const headline = mode === "updated" ? "⚠️ งานนี้มีการเปลี่ยนแปลง" : undefined;
    await pushRaw(job.admin.lineUserId, [await jobFlex(job, headline)]);

    await prisma.bookingAssignment.update({
      where: { id: job.id },
      data: { notifiedAt: new Date() },
    });
  } catch (err) {
    console.error("notifyJob failed:", err);
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

  return [
    `✅ รับทราบงาน${HANDOFF_LABEL[job.kind as HandoffKind]}แล้ว`,
    "",
    `นัด ${formatBangkokDateTime(job.meetAt)}`,
    `ออกเดินทาง ${formatBangkokTime(leaveAt(job.meetAt))} น.`,
    `รถ: ${job.booking.car.brand} ${job.booking.car.name} (${job.booking.car.licensePlate})`,
    ...(job.place ? ["", `จุดนัด: ${job.place}`, `🗺 ${mapsLink(job.place)}`] : []),
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
    "ส่งรูปสภาพรถเข้าแชทนี้ได้เลย ระบบจะเก็บแนบไว้กับงานนี้ให้",
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
export async function saveJobReading(
  lineUserId: string,
  text: string
): Promise<string | null> {
  const odoMatch = text.match(/(?:ไมล์|เลขไมล์|odo)\s*:?\s*([\d,]{3,9})/i);
  const fuelMatch = text.match(/(?:น้ำมัน|fuel)\s*:?\s*(.{1,20})/i);
  if (!odoMatch && !fuelMatch) return null;

  const admin = await prisma.adminUser.findFirst({ where: { lineUserId } });
  if (!admin) return null;

  const job = await recentJob(admin.id);
  if (!job) {
    return "ไม่พบงานรับ-ส่งรถที่จะบันทึกครับ\nพิมพ์ “งานของฉัน” เพื่อดูคิวงาน";
  }

  const odometer = odoMatch ? Number(odoMatch[1].replace(/,/g, "")) : undefined;
  const fuelLevel = fuelMatch ? fuelMatch[1].trim().replace(/[.,]$/, "") : undefined;

  await prisma.bookingAssignment.update({
    where: { id: job.id },
    data: {
      ...(odometer !== undefined && Number.isFinite(odometer) ? { odometer } : {}),
      ...(fuelLevel ? { fuelLevel } : {}),
    },
  });

  return [
    "📝 บันทึกแล้ว",
    `งาน${HANDOFF_LABEL[job.kind as HandoffKind]} · ${job.booking.car.licensePlate}`,
    ...(odometer !== undefined ? [`เลขไมล์ ${odometer.toLocaleString()} กม.`] : []),
    ...(fuelLevel ? [`น้ำมัน ${fuelLevel}`] : []),
  ].join("\n");
}

/**
 * คนรับงานส่งรูปสภาพรถเข้าแชท — แนบกับงานล่าสุดของเขา
 * คืน null ถ้าคนส่งไม่ใช่คนรับงาน (ให้ตัวเรียกไปจัดการเป็นสลิปลูกค้าต่อ)
 */
export async function saveJobPhoto(
  lineUserId: string,
  messageId: string
): Promise<string | null> {
  const admin = await prisma.adminUser.findFirst({ where: { lineUserId } });
  if (!admin) return null;

  const job = await recentJob(admin.id);

  if (!job) {
    return "ไม่พบงานรับ-ส่งรถที่จะแนบรูปครับ\nพิมพ์ “งานของฉัน” เพื่อดูคิวงาน";
  }

  const content = await getMessageContent(messageId);
  if (!content) return "ดาวน์โหลดรูปไม่สำเร็จ กรุณาส่งใหม่ครับ";

  try {
    const ext = content.contentType.includes("png") ? "png" : "jpg";
    const blob = await put(
      `handoff/${job.id}-${messageId}.${ext}`,
      content.buffer,
      { access: "private", addRandomSuffix: true, contentType: content.contentType }
    );

    await prisma.handoffPhoto.create({
      data: { assignmentId: job.id, fileUrl: `/api/file?p=${encodeURIComponent(blob.pathname)}` },
    });

    const count = await prisma.handoffPhoto.count({ where: { assignmentId: job.id } });
    return [
      `📷 เก็บรูปไว้แล้ว (${count} รูป)`,
      `งาน${HANDOFF_LABEL[job.kind as HandoffKind]} · ${job.booking.car.licensePlate}`,
      "ส่งเพิ่มได้เรื่อย ๆ ครับ",
    ].join("\n");
  } catch (err) {
    console.error("saveJobPhoto failed:", err);
    return "บันทึกรูปไม่สำเร็จ กรุณาลองใหม่ครับ";
  }
}

/** คำแนะนำสำหรับคนรับ-ส่งรถ — คืน null ถ้าคนที่ทักมาไม่ใช่พนักงาน */
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
