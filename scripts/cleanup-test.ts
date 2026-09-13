/**
 * ลบเฉพาะข้อมูลที่เกิดจากการทดสอบ — เก็บใบจองจริงไว้
 *
 *   npx tsx scripts/cleanup-test.ts            ← ดูก่อนว่าจะลบอะไร (ไม่ลบจริง)
 *   npx tsx scripts/cleanup-test.ts --yes      ← ลบจริง
 *   npx tsx scripts/cleanup-test.ts --yes --keep-receipts   ← ไม่ยุ่งกับใบเสร็จ
 *
 * ใบจองที่ถือว่าเป็นของทดสอบ = ชื่อผู้เช่ามีคำว่า "ทดสอบ" หรือ "test"
 * หรือเบอร์โทรขึ้นต้น 08000000 (เบอร์สมมติที่ใช้ตอนทดสอบ)
 *
 * ใบเสร็จ: ลบทั้งหมดและรีเซ็ตเลขรันกลับไปเริ่ม 1 (ใบที่ออกช่วงทดสอบมีทั้งของจริงและของปลอม
 * ปนกัน และเจ้าของระบบสั่งให้เริ่มเลขใหม่ก่อนออกใบจริงใบแรก)
 *
 * ไม่แตะ: รถ · ราคา · จุดรับ-ส่ง · แอดมิน · ตั้งค่าระบบ · ประวัติการใช้งาน
 * ย้อนกลับไม่ได้ — กด Backup/Branch ใน Neon ไว้ก่อนถ้าอยากมีทางถอย
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { del } from "@vercel/blob";

const DB_URL = process.env.DATABASE_URL ?? "";
if (!DB_URL) {
  console.error("\nไม่พบ DATABASE_URL — รันจากโฟลเดอร์โปรเจกต์ที่มี .env.local\n");
  process.exit(1);
}

const YES = process.argv.includes("--yes");
const KEEP_RECEIPTS = process.argv.includes("--keep-receipts");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DB_URL }),
});

function dbLabel(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`;
  } catch {
    return "(อ่าน DATABASE_URL ไม่ออก)";
  }
}

/** ชื่อ/เบอร์แบบไหนนับเป็นของทดสอบ */
function isTest(c: { fullName: string; phone: string }): boolean {
  const name = c.fullName.toLowerCase();
  return (
    c.fullName.includes("ทดสอบ") ||
    name.includes("test") ||
    /^08000000\d{2}$/.test(c.phone.replace(/\D/g, ""))
  );
}

/** ลบไฟล์ใน Blob ทีละก้อน — ไฟล์ที่ลบไม่ได้ไม่ควรทำให้ทั้งสคริปต์ล้ม */
async function deleteBlobs(urls: (string | null)[]) {
  let ok = 0;
  let failed = 0;
  for (const url of urls) {
    if (!url) continue;
    const p = url.startsWith("/api/file?p=")
      ? decodeURIComponent(url.slice("/api/file?p=".length))
      : url;
    try {
      await del(p);
      ok++;
    } catch {
      failed++;
    }
  }
  return { ok, failed };
}

async function main() {
  console.log(`\nฐานข้อมูล: ${dbLabel(DB_URL)}`);

  const bookings = await prisma.booking.findMany({
    include: { customer: true, car: true, deposit: true },
    orderBy: { createdAt: "asc" },
  });

  const testIds: string[] = [];
  console.log(`\nใบจองทั้งหมด ${bookings.length} ใบ\n`);
  for (const b of bookings) {
    const test = isTest(b.customer);
    if (test) testIds.push(b.id);
    console.log(
      `${test ? "ลบ  " : "เก็บ"} ${b.id.slice(0, 8).toUpperCase()} · ${b.customer.fullName} · ${b.customer.phone} · ${b.car.brand} ${b.car.name} · ${b.status}`
    );
  }

  const receipts = await prisma.receipt.count();
  console.log(
    `\nสรุป: ลบ ${testIds.length} ใบ · เก็บ ${bookings.length - testIds.length} ใบ` +
      (KEEP_RECEIPTS ? "" : ` · ลบใบเสร็จทั้งหมด ${receipts} ใบ แล้วรีเซ็ตเลขรัน`)
  );

  if (!YES) {
    console.log("\nนี่คือการดูเฉย ๆ ยังไม่ได้ลบ — เติม --yes เพื่อลบจริง\n");
    return;
  }

  if (testIds.length > 0) {
    const where = { bookingId: { in: testIds } };

    const [docRows, slipRows, photoRows] = await Promise.all([
      prisma.bookingDocument.findMany({ where, select: { fileUrl: true } }),
      prisma.deposit.findMany({ where, select: { slipImageUrl: true } }),
      prisma.handoffPhoto.findMany({
        where: { assignment: { bookingId: { in: testIds } } },
        select: { fileUrl: true },
      }),
    ]);

    const d1 = await deleteBlobs(docRows.map((d) => d.fileUrl));
    console.log(`เอกสาร: ลบไฟล์ ${d1.ok} สำเร็จ · ${d1.failed} ไม่สำเร็จ`);
    const d2 = await deleteBlobs(slipRows.map((d) => d.slipImageUrl));
    console.log(`สลิป: ลบไฟล์ ${d2.ok} สำเร็จ · ${d2.failed} ไม่สำเร็จ`);
    const d3 = await deleteBlobs(photoRows.map((p) => p.fileUrl));
    console.log(`รูปสภาพรถ: ลบไฟล์ ${d3.ok} สำเร็จ · ${d3.failed} ไม่สำเร็จ`);

    /* Deposit กับ Receipt ไม่ได้ตั้ง onDelete: Cascade ไว้ ต้องลบเองก่อน
       ไม่งั้นการลบ Booking จะติด foreign key แล้วล้มทั้งชุด */
    await prisma.$transaction([
      prisma.receipt.deleteMany({ where }),
      prisma.deposit.deleteMany({ where }),
      prisma.booking.deleteMany({ where: { id: { in: testIds } } }),
    ]);
    console.log(`ใบจอง: ลบแล้ว ${testIds.length} ใบ (พร้อมเอกสาร งาน รูป และคิวคืนเงินที่ผูกอยู่)`);
  }

  // ลูกค้าทดสอบที่ไม่เหลือใบจองแล้ว — ลบทิ้งไม่ให้ค้างในระบบ
  const orphanCustomers = await prisma.customer.findMany({
    where: { bookings: { none: {} } },
    select: { id: true, fullName: true, phone: true },
  });
  const removable = orphanCustomers.filter(isTest);
  if (removable.length > 0) {
    await prisma.customer.deleteMany({ where: { id: { in: removable.map((c) => c.id) } } });
    console.log(`ลูกค้าทดสอบที่ไม่มีใบจองแล้ว: ลบ ${removable.length} ราย`);
  }

  if (!KEEP_RECEIPTS) {
    const del1 = await prisma.receipt.deleteMany({});
    await prisma.receiptCounter.deleteMany({});
    console.log(`ใบเสร็จ: ลบแล้ว ${del1.count} ใบ · เลขรันเริ่มนับ 1 ใหม่`);
  }

  const after = {
    ใบจอง: await prisma.booking.count(),
    ลูกค้า: await prisma.customer.count(),
    ใบเสร็จ: await prisma.receipt.count(),
    คืนเงินประกัน: await prisma.depositRefund.count(),
  };
  console.log("\nเหลืออยู่ตอนนี้:", after, "\n");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
