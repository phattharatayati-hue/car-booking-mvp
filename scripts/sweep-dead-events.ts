/**
 * กวาด event ที่ค้างในปฏิทิน — ของใบจองที่ถูกยกเลิก/ปฏิเสธ/จบงานไปแล้ว
 *
 *   npx tsx scripts/sweep-dead-events.ts          ← ดูรายการ (ไม่ลบจริง)
 *   npx tsx scripts/sweep-dead-events.ts --yes    ← ลบจริง
 *   npx tsx scripts/sweep-dead-events.ts --yes --notify   ← ลบ + แจ้ง LINE คนรับงาน
 *
 * ใช้ครั้งเดียวเพื่อเก็บตกใบจองที่ยกเลิกไป "ก่อน" มีโค้ดลบ event อัตโนมัติ
 * หลังจากนี้ระบบเคลียร์ให้เองตอนกดยกเลิก/ปฏิเสธ จึงไม่ต้องรันซ้ำเป็นประจำ
 *
 * ค่าเริ่มต้นไม่แจ้ง LINE เพราะใบจองพวกนี้ยกเลิกไปนานแล้ว
 * คนรับงานรู้เรื่องอยู่แล้ว ส่งไปตอนนี้จะงงมากกว่าเป็นประโยชน์
 * ใส่ --notify เฉพาะตอนที่รู้ว่ามีคนยังเข้าใจผิดว่างานยังอยู่
 *
 * ไม่แตะใบจองที่ยังมีชีวิต (REQUESTED / PENDING_DEPOSIT / CONFIRMED)
 */

/* โหลด env เองตามลำดับเดียวกับ Next.js (.env.local ทับ .env)
   จำเป็นเพราะ `npx tsx` ไม่โหลดให้ และ PrismaClient ไม่อ่านเอง */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

import { PrismaClient } from "@prisma/client";
import type { BookingStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const DB_URL = process.env.DATABASE_URL ?? "";
if (!DB_URL) {
  console.error("ไม่พบ DATABASE_URL — ตรวจไฟล์ .env / .env.local ก่อน");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DB_URL }) });

/** สถานะที่ถือว่าใบจองจบแล้ว — ไม่ควรมี event ค้างในปฏิทินอีก */
/* ต้องระบุชนิดเป็น BookingStatus[] ไม่ใช่ string[]
   ถ้าปล่อยเป็น string[] TypeScript จะปฏิเสธทั้งก้อน where แล้วเลิกอ่าน select ให้
   ทำให้ฟิลด์ relation อย่าง booking/admin หายไปจากผลลัพธ์ และพังต่อเป็นทอด ๆ */
const DEAD_STATUSES: BookingStatus[] = ["CANCELLED", "REJECTED", "COMPLETED"];

const apply = process.argv.includes("--yes");
const notify = process.argv.includes("--notify");

async function main() {
  const rows = await prisma.bookingAssignment.findMany({
    where: {
      googleEventId: { not: null },
      booking: { status: { in: DEAD_STATUSES } },
    },
    select: {
      id: true,
      kind: true,
      meetAt: true,
      admin: { select: { name: true } },
      booking: { select: { id: true, status: true, car: { select: { name: true } } } },
    },
    orderBy: { meetAt: "asc" },
  });

  if (rows.length === 0) {
    console.log("ไม่มี event ค้างในปฏิทิน — เรียบร้อยอยู่แล้ว");
    return;
  }

  console.log(`พบ event ค้าง ${rows.length} รายการ:\n`);
  for (const r of rows) {
    const code = r.booking.id.slice(0, 8).toUpperCase();
    const when = r.meetAt.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
    const job = r.kind === "DELIVERY" ? "ไปส่งรถ" : "ไปรับรถคืน";
    console.log(`  ${code}  ${r.booking.status.padEnd(9)}  ${job}  ${when}  ${r.admin.name}  (${r.booking.car.name})`);
  }

  if (!apply) {
    console.log("\nยังไม่ได้ลบอะไร — ใส่ --yes เพื่อลบจริง");
    return;
  }

  console.log(`\nเริ่มลบ… ${notify ? "(แจ้ง LINE ด้วย)" : "(ไม่แจ้ง LINE)"}\n`);

  const { removeAssignmentEvent } = await import("../lib/calendar-sync");
  const { notifyJob } = await import("../lib/driver-jobs");

  let removed = 0;
  let failed = 0;

  for (const r of rows) {
    const code = r.booking.id.slice(0, 8).toUpperCase();
    try {
      if (notify) await notifyJob(r.id, "cancelled").catch(() => {});

      /* ลบ event ก่อน แล้วค่อยลบแถว — ลำดับกลับกันแล้ว googleEventId จะหาย
         พร้อมแถว ทำให้ไม่มีทางตามไปลบ event ได้อีกเลย */
      if (await removeAssignmentEvent(r.id)) {
        await prisma.bookingAssignment.delete({ where: { id: r.id } });
        removed++;
        console.log(`  ลบแล้ว  ${code}`);
      } else {
        failed++;
        console.log(`  ไม่สำเร็จ ${code} — เก็บแถวไว้ให้ลองใหม่ได้`);
      }
    } catch (err) {
      failed++;
      console.error(`  ผิดพลาด ${code}:`, (err as Error).message);
    }
  }

  console.log(`\nสรุป: ลบสำเร็จ ${removed} · ไม่สำเร็จ ${failed} จากทั้งหมด ${rows.length}`);
  if (failed > 0) {
    console.log("ที่ไม่สำเร็จมักเกิดจากสิทธิ์ปฏิทินหมดอายุ — ให้เจ้าตัวเชื่อมปฏิทินใหม่แล้วรันซ้ำได้");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
