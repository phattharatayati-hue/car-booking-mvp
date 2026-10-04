/**
 * อัปเดตรายละเอียดงานในปฏิทิน Google ของคนส่งรถให้เป็นแบบล่าสุด
 *
 *   npx tsx scripts/resync-calendar.ts          ← ดูก่อนว่าจะอัปเดตกี่งาน (ไม่แก้จริง)
 *   npx tsx scripts/resync-calendar.ts --yes    ← อัปเดตจริง
 *   npx tsx scripts/resync-calendar.ts --yes --all   ← รวมงานที่ผ่านไปแล้วด้วย
 *
 * ใช้ตอนเปลี่ยนหน้าตาโน้ตในปฏิทิน (lib/calendar-sync.ts) แล้วอยากให้ event เก่าเปลี่ยนตาม
 * งานใหม่หลังจากนี้ได้รูปแบบใหม่เองอยู่แล้ว ไม่ต้องรันซ้ำเป็นประจำ
 *
 * ค่าเริ่มต้นแก้เฉพาะงานที่ยังไม่ถึงเวลานัด หรือเลยมาไม่เกิน 1 วัน
 * เพราะงานเก่ากว่านั้นลิงก์เอกสารปิดไปแล้ว แก้ไปก็ไม่มีใครใช้ — ใส่ --all ถ้าอยากแก้ทั้งหมด
 *
 * ไม่ส่ง LINE หาใคร ไม่สร้างงานใหม่ แค่แก้ข้อความใน event ที่มีอยู่แล้ว
 * ใช้ฟังก์ชันตัวเดียวกับที่ระบบใช้ตอนมอบหมายงาน ผลจึงเหมือนกันทุกตัวอักษร
 */

/* โหลด env ก่อน import อะไรที่ต่อฐานข้อมูล (.env.local ทับ .env เหมือน Next.js)
   ต้องใช้ import แบบไดนามิกข้างล่าง เพราะ import ปกติถูกยกขึ้นไปรันก่อนบรรทัดนี้ */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const APPLY = process.argv.includes("--yes");
const ALL = process.argv.includes("--all");

/** หน่วงระหว่างงาน กัน Google จำกัดจำนวนครั้ง */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const { prisma } = await import("../lib/prisma");
  const { syncAssignment } = await import("../lib/calendar-sync");

  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const rows = await prisma.bookingAssignment.findMany({
    where: {
      googleEventId: { not: null },
      ...(ALL ? {} : { meetAt: { gte: since } }),
      // ใบจองที่จบหรือยกเลิกแล้วไม่ต้องแก้ — event พวกนั้นควรถูกลบ (ดู sweep-dead-events.ts)
      booking: { status: { in: ["REQUESTED", "PENDING_DEPOSIT", "CONFIRMED"] } },
    },
    include: {
      admin: { select: { name: true } },
      booking: { select: { car: { select: { brand: true, name: true } } } },
    },
    orderBy: { meetAt: "asc" },
  });

  if (rows.length === 0) {
    console.log("ไม่มีงานในปฏิทินที่ต้องอัปเดต");
    return;
  }

  console.log(`พบ ${rows.length} งาน${ALL ? " (รวมงานเก่า)" : " (เฉพาะงานที่ยังไม่ผ่าน)"}:\n`);
  for (const r of rows) {
    const when = r.meetAt.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
    const job = r.kind === "DELIVERY" ? "ไปส่งรถ " : "รับรถคืน";
    console.log(`  ${r.bookingId.slice(0, 8).toUpperCase()}  ${job}  ${when}  ${r.admin.name}  (${r.booking.car.brand} ${r.booking.car.name})`);
  }

  if (!APPLY) {
    console.log("\nยังไม่ได้แก้อะไร — ใส่ --yes เพื่ออัปเดตจริง");
    return;
  }

  console.log("\nเริ่มอัปเดต…\n");
  let ok = 0;
  let failed = 0;

  for (const r of rows) {
    const code = r.bookingId.slice(0, 8).toUpperCase();
    await syncAssignment(r.id);

    // syncAssignment ไม่ throw — ผลอยู่ที่ syncError ของแถวนั้น
    const after = await prisma.bookingAssignment.findUnique({
      where: { id: r.id },
      select: { syncError: true },
    });
    if (after?.syncError) {
      failed++;
      console.log(`  ไม่สำเร็จ ${code} — ${after.syncError}`);
    } else {
      ok++;
      console.log(`  อัปเดตแล้ว ${code}`);
    }
    await sleep(250);
  }

  console.log(`\nสรุป: สำเร็จ ${ok} · ไม่สำเร็จ ${failed} จากทั้งหมด ${rows.length}`);
  if (failed > 0) {
    console.log("ที่ไม่สำเร็จมักเกิดจากสิทธิ์ปฏิทินของคนนั้นหมดอายุ — ให้เจ้าตัวเชื่อมปฏิทินใหม่แล้วรันซ้ำได้");
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
