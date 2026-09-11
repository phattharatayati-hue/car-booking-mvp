/**
 * ล้างข้อมูลการจองทั้งหมด — ใช้ครั้งเดียวตอนจบช่วงทดสอบ ก่อนเปิดใช้งานจริง
 *
 *   npx tsx scripts/reset-bookings.ts            ← ดูว่าจะลบอะไรบ้าง (ไม่ลบจริง)
 *   npx tsx scripts/reset-bookings.ts --yes      ← ลบจริง
 *   npx tsx scripts/reset-bookings.ts --yes --keep-customers
 *
 * ลบ: การจอง · สลิป · เอกสารลูกค้า · งานรับ-ส่ง · รูปสภาพรถ · รายการคืนเงินประกัน
 *     ไฟล์ที่เกี่ยวข้องใน Vercel Blob · event ในปฏิทินของคนรับงาน
 *     และลูกค้า (ยกเว้นใส่ --keep-customers)
 *
 * ไม่แตะ: รถ · เรทราคา · จุดรับ-ส่ง · พาร์ทเนอร์ · แอดมิน · ค่าบริการนอกเวลา
 *        ตั้งค่าระบบ · ประวัติการใช้งาน (audit)
 *
 * ย้อนกลับไม่ได้ — ควรกด Backup/Branch ใน Neon ไว้ก่อนถ้าอยากมีทางถอย
 */

/* โหลดค่า env เองตามลำดับเดียวกับที่ Next.js ใช้ (.env.local ทับ .env)

   จำเป็นเพราะ `npx tsx` ไม่ได้โหลดไฟล์ .env ให้เหมือนตอนรัน `next dev`
   และ PrismaClient ก็ไม่ได้อ่าน .env เองตอน runtime
   ถ้าไม่โหลดตรงนี้ สคริปต์จะไปต่อฐานข้อมูลผิดตัว หรือไม่ก็ต่อไม่ติดเลย */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { del } from "@vercel/blob";

/* ใช้ตัวเดียวกับที่เว็บใช้ (DATABASE_URL) ไม่ใช่ตัว UNPOOLED ของ Prisma CLI
   ทั้งสองตัวควรชี้ฐานข้อมูลเดียวกัน แต่ถ้าตั้งไว้คนละ branch จะลบผิดที่ */
const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error(
    "\nไม่พบ DATABASE_URL — ตรวจว่ารันคำสั่งจากโฟลเดอร์โปรเจกต์ และมีไฟล์ .env.local อยู่\n"
  );
  process.exit(1);
}

/** โชว์ว่ากำลังต่อฐานข้อมูลตัวไหน โดยไม่โชว์รหัสผ่าน */
function dbLabel(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`;
  } catch {
    return "(อ่าน DATABASE_URL ไม่ออก)";
  }
}

/* Prisma 7 ต่อฐานข้อมูลผ่าน driver adapter เท่านั้น — สร้าง PrismaClient เปล่า ๆ ไม่ได้แล้ว
   ใช้รูปแบบเดียวกับ lib/prisma.ts ที่เว็บใช้ จะได้ต่อฐานเดียวกันแน่นอน */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DB_URL }),
});

const args = process.argv.slice(2);
const CONFIRMED = args.includes("--yes");
const KEEP_CUSTOMERS = args.includes("--keep-customers");

/** ลบไฟล์ใน Blob ทีละไฟล์ — ไฟล์ไหนพังก็ข้าม ไม่ให้ล้มทั้งชุด */
async function deleteBlobs(urls: string[]): Promise<{ ok: number; failed: number }> {
  let ok = 0;
  let failed = 0;
  for (const url of urls) {
    if (!url) continue;
    try {
      await del(url);
      ok++;
    } catch (err) {
      failed++;
      console.error("  ลบไฟล์ไม่สำเร็จ:", url, (err as Error).message);
    }
  }
  return { ok, failed };
}

async function main() {
  const [bookings, deposits, documents, assignments, photos, refunds, customers] =
    await Promise.all([
      prisma.booking.count(),
      prisma.deposit.count(),
      prisma.bookingDocument.count(),
      prisma.bookingAssignment.count(),
      prisma.handoffPhoto.count(),
      prisma.depositRefund.count(),
      prisma.customer.count(),
    ]);

  console.log(`\nฐานข้อมูลที่กำลังต่ออยู่: ${dbLabel(DB_URL)}`);
  console.log("ต้องตรงกับ DATABASE_URL ที่ตั้งไว้ใน Vercel — ถ้าไม่ตรง คือกำลังลบผิดฐาน\n");

  console.log("ข้อมูลที่จะถูกลบ");
  console.log(`  การจอง              ${bookings}`);
  console.log(`  สลิปค่าจอง           ${deposits}`);
  console.log(`  เอกสารลูกค้า         ${documents}`);
  console.log(`  งานรับ-ส่งรถ         ${assignments}`);
  console.log(`  รูปสภาพรถ            ${photos}`);
  console.log(`  รายการคืนเงินประกัน   ${refunds}`);
  console.log(`  ลูกค้า               ${KEEP_CUSTOMERS ? `${customers} (เก็บไว้)` : customers}`);

  if (!CONFIRMED) {
    console.log("\nนี่คือการดูเฉย ๆ ยังไม่ได้ลบอะไร");
    console.log("ถ้าแน่ใจแล้วให้รันซ้ำด้วย --yes\n");
    return;
  }

  console.log("\nเริ่มลบ…\n");

  /* 1. ถอน event ออกจากปฏิทินของคนรับงานก่อน
        ถ้าลบแถวในฐานข้อมูลไปเลย event จะค้างในปฏิทินโดยไม่มีใครรู้ว่ามาจากไหน
        และไม่มีทางตามไปลบได้อีก เพราะ googleEventId หายไปพร้อมแถว */
  const withEvents = await prisma.bookingAssignment.findMany({
    where: { googleEventId: { not: null } },
    select: { id: true },
  });
  if (withEvents.length > 0) {
    const { removeAssignmentEvent } = await import("../lib/calendar-sync");
    let removed = 0;
    for (const a of withEvents) {
      try {
        if (await removeAssignmentEvent(a.id)) removed++;
      } catch (err) {
        console.error("  ลบ event ไม่สำเร็จ:", a.id, (err as Error).message);
      }
    }
    console.log(`ปฏิทิน: ลบ event แล้ว ${removed}/${withEvents.length}`);
  }

  // 2. ลบไฟล์ใน Blob ก่อนลบแถว — ลำดับกลับกันแล้วจะเหลือไฟล์กำพร้าที่ไม่มีใครรู้ว่ามีอยู่
  const [docRows, slipRows, photoRows] = await Promise.all([
    prisma.bookingDocument.findMany({ select: { fileUrl: true } }),
    prisma.deposit.findMany({ select: { slipImageUrl: true } }),
    prisma.handoffPhoto.findMany({ select: { fileUrl: true } }),
  ]);

  const docBlobs = await deleteBlobs(docRows.map((d) => d.fileUrl));
  console.log(`เอกสารลูกค้า: ลบไฟล์ ${docBlobs.ok} สำเร็จ · ${docBlobs.failed} ไม่สำเร็จ`);

  const slipBlobs = await deleteBlobs(slipRows.map((d) => d.slipImageUrl));
  console.log(`สลิป: ลบไฟล์ ${slipBlobs.ok} สำเร็จ · ${slipBlobs.failed} ไม่สำเร็จ`);

  const photoBlobs = await deleteBlobs(photoRows.map((p) => p.fileUrl));
  console.log(`รูปสภาพรถ: ลบไฟล์ ${photoBlobs.ok} สำเร็จ · ${photoBlobs.failed} ไม่สำเร็จ`);

  /* 3. ลบแถว — Deposit ไม่ได้ตั้ง onDelete: Cascade ไว้ (ต่างจากตัวอื่น)
        ถ้าไม่ลบก่อน การลบ Booking จะติด foreign key constraint แล้วล้มทั้งชุด */
  await prisma.$transaction([
    prisma.deposit.deleteMany({}),
    prisma.booking.deleteMany({}),
  ]);
  console.log(`การจอง: ลบแล้ว ${bookings} ใบ (พร้อมเอกสาร งาน รูป และรายการคืนเงินที่ผูกอยู่)`);

  if (!KEEP_CUSTOMERS) {
    const { count } = await prisma.customer.deleteMany({});
    console.log(`ลูกค้า: ลบแล้ว ${count} ราย`);
  }

  // นับใหม่หลังลบ — ถ้าไม่เป็นศูนย์แปลว่าลบไม่ครบ หรือกำลังดูคนละฐานกับที่เว็บใช้
  const after = {
    การจอง: await prisma.booking.count(),
    สลิป: await prisma.deposit.count(),
    เอกสาร: await prisma.bookingDocument.count(),
    งานรับส่ง: await prisma.bookingAssignment.count(),
    คืนเงิน: await prisma.depositRefund.count(),
    ลูกค้า: await prisma.customer.count(),
  };
  console.log("\nนับใหม่หลังลบ:", JSON.stringify(after));

  const leftover = Object.values(after).reduce((a, b) => a + b, 0);
  if (leftover > 0 && !(KEEP_CUSTOMERS && leftover === after.ลูกค้า)) {
    console.log("\nยังมีข้อมูลเหลือ — ตรวจว่าฐานข้อมูลข้างบนตรงกับที่ Vercel ใช้หรือเปล่า");
  } else {
    console.log("\nเรียบร้อย — ระบบพร้อมรับข้อมูลจริงแล้วครับ");
  }
  console.log("");
}

main()
  .catch((err) => {
    console.error("\nล้มเหลว:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
