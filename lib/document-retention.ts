import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { auditAs, type AuditActor } from "@/lib/audit";

/**
 * ลบเอกสารส่วนบุคคลของลูกค้าเมื่อไม่จำเป็นต้องเก็บอีกแล้ว
 *
 * เอกสารพวกนี้คือบัตรประชาชน พาสปอร์ต ใบขับขี่ — เก็บไว้เพื่อยืนยันตัวผู้เช่า
 * พอการจองจบไปแล้วก็หมดเหตุผลที่จะเก็บ และการถือสำเนาบัตรลูกค้าไว้ไม่มีกำหนด
 * เป็นความเสี่ยงตาม PDPA โดยไม่ได้ประโยชน์อะไรกลับมา
 *
 * ลบทั้งไฟล์ใน Blob และแถวใน DB — ไม่เก็บ URL ค้างไว้ให้เข้าใจผิดว่ายังเปิดดูได้
 * ส่วนตัวการจองเองไม่ถูกแตะ ประวัติและยอดเงินยังอยู่ครบ
 */

/** เก็บเอกสารไว้กี่วันหลังการจองจบ */
export const RETENTION_DAYS = 90;

/** สถานะที่ถือว่าการจองจบแล้ว ไม่มีเหตุต้องใช้เอกสารอีก */
const CLOSED_STATUSES = ["COMPLETED", "CANCELLED", "REJECTED"] as const;

export function retentionCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - RETENTION_DAYS * 86400000);
}

/** เงื่อนไขเดียวที่ใช้ทั้งตอนนับและตอนลบ — จะได้ไม่มีทางนับกับลบคนละชุด */
export function staleDocumentWhere(now: Date = new Date()) {
  return {
    booking: {
      status: { in: [...CLOSED_STATUSES] as never[] },
      endDate: { lt: retentionCutoff(now) },
    },
  };
}

export function countStaleDocuments(now: Date = new Date()) {
  return prisma.bookingDocument.count({ where: staleDocumentWhere(now) });
}

/** ผู้ทำรายการเมื่อสั่งลบจาก cron — ไม่มี session ให้อ่านชื่อ */
export const CRON_ACTOR: AuditActor = {
  id: null,
  name: "ระบบอัตโนมัติ",
  role: null,
};

export type PurgeResult = {
  /** จำนวนแถวที่ลบออกจากฐานข้อมูล */
  removed: number;
  /** ลบไฟล์ใน Blob สำเร็จกี่ไฟล์ */
  blobsDeleted: number;
  /** ลบไฟล์ไม่สำเร็จกี่ไฟล์ (แถวใน DB ยังถูกลบอยู่ดี) */
  blobsFailed: number;
};

/**
 * ลบเอกสารที่หมดระยะเก็บแล้ว
 *
 * @param actor คนที่สั่งลบ — cron ส่ง CRON_ACTOR เข้ามา เพราะไม่มี session ให้อ่าน
 */
export async function purgeStaleDocuments(actor: AuditActor): Promise<PurgeResult> {
  const docs = await prisma.bookingDocument.findMany({
    where: staleDocumentWhere(),
    select: { id: true, fileUrl: true, bookingId: true },
  });

  if (docs.length === 0) {
    return { removed: 0, blobsDeleted: 0, blobsFailed: 0 };
  }

  let blobsDeleted = 0;
  let blobsFailed = 0;

  // ลบทีละไฟล์ ไฟล์ไหนพังก็ข้าม ไม่ให้ล้มทั้งชุด
  for (const doc of docs) {
    try {
      await del(doc.fileUrl);
      blobsDeleted++;
    } catch (err) {
      blobsFailed++;
      console.error("purge blob failed:", doc.fileUrl, err);
    }
  }

  // ลบแถวหลังลบไฟล์ ถ้าลำดับกลับกันแล้วลบไฟล์พลาด จะเหลือไฟล์กำพร้าที่ไม่มีใครรู้ว่ามีอยู่
  const { count } = await prisma.bookingDocument.deleteMany({
    where: { id: { in: docs.map((d) => d.id) } },
  });

  await auditAs(actor, {
    action: "booking.document_purge",
    summary: `ลบเอกสารลูกค้าที่เก็บเกิน ${RETENTION_DAYS} วัน จำนวน ${count} ใบ`,
    entity: "booking",
    detail:
      `ลบไฟล์สำเร็จ ${blobsDeleted} ไฟล์` +
      (blobsFailed > 0 ? ` · ลบไฟล์ไม่สำเร็จ ${blobsFailed} ไฟล์` : ""),
  });

  return { removed: count, blobsDeleted, blobsFailed };
}

/**
 * ลบเลขบัญชีลูกค้าทิ้งหลังโอนเงินประกันคืนเสร็จแล้วตามกำหนด
 *
 * เก็บไว้แค่ว่าโอนแล้ว เมื่อไหร่ ยอดเท่าไร ซึ่งพอสำหรับเป็นหลักฐาน
 * ส่วนเลขบัญชีกับชื่อบัญชีไม่มีเหตุผลให้ค้างอยู่ต่อ ถ้าฐานข้อมูลรั่ววันไหน
 * จะได้ไม่มีเลขบัญชีของลูกค้าเก่าติดไปด้วย
 */
export async function purgeRefundAccounts(actor: AuditActor): Promise<number> {
  const { ACCOUNT_RETENTION_DAYS } = await import("@/lib/refund");
  const cutoff = new Date(Date.now() - ACCOUNT_RETENTION_DAYS * 86400000);

  const { count } = await prisma.depositRefund.updateMany({
    where: { paidAt: { lt: cutoff }, purgedAt: null, accountNo: { not: null } },
    data: {
      accountNo: null,
      accountName: null,
      bankName: null,
      purgedAt: new Date(),
    },
  });

  if (count > 0) {
    await auditAs(actor, {
      action: "booking.refund_purge",
      summary: `ลบเลขบัญชีรับเงินคืนที่โอนเสร็จเกิน ${ACCOUNT_RETENTION_DAYS} วัน จำนวน ${count} รายการ`,
      entity: "settings",
    });
  }

  return count;
}
