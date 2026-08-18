/**
 * เก็บกวาดรถเดโม — เหลือไว้แค่รถจริง 7 คัน
 *
 *   npx tsx prisma/cleanup-demo-cars.ts          ดูก่อนว่าจะทำอะไรบ้าง (ไม่แก้ข้อมูล)
 *   npx tsx prisma/cleanup-demo-cars.ts --apply  ลงมือจริง
 *
 * รถที่ไม่มีประวัติการจอง → ลบทิ้ง
 * รถที่มีประวัติการจอง    → เปลี่ยนเป็น "ปิดใช้งาน" ลูกค้าจะไม่เห็น แต่ประวัติยังอยู่ครบ
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** ทะเบียนของรถจริง — ต้องตรงกับใน seed-cars.ts */
const REAL_PLATES = [
  "ATIV-01",
  "CITYT-01",
  "CITYH-01",
  "CIVIC-01",
  "HRV-01",
  "CROSS-01",
  "FORT-01",
];

const apply = process.argv.includes("--apply");

async function main() {
  const demoCars = await prisma.car.findMany({
    where: { licensePlate: { notIn: REAL_PLATES } },
    include: { _count: { select: { bookings: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (demoCars.length === 0) {
    console.log("ไม่มีรถเดโมค้างอยู่แล้ว — เรียบร้อยดี");
    return;
  }

  console.log(
    apply
      ? `กำลังจัดการรถเดโม ${demoCars.length} คัน\n`
      : `พบรถเดโม ${demoCars.length} คัน (โหมดดูอย่างเดียว — ใส่ --apply เพื่อลงมือจริง)\n`
  );

  let deleted = 0;
  let disabled = 0;
  let skipped = 0;

  for (const car of demoCars) {
    const label = `${car.brand} ${car.name} (${car.licensePlate})`;

    if (car._count.bookings === 0) {
      if (apply) await prisma.car.delete({ where: { id: car.id } });
      console.log(`ลบ      ${label}`);
      deleted++;
      continue;
    }

    if (car.status === "UNAVAILABLE") {
      console.log(`ข้าม    ${label} — ปิดใช้งานอยู่แล้ว`);
      skipped++;
      continue;
    }

    if (apply) {
      await prisma.car.update({
        where: { id: car.id },
        data: { status: "UNAVAILABLE" },
      });
    }
    console.log(`ปิด     ${label} — มีประวัติจอง ${car._count.bookings} รายการ`);
    disabled++;
  }

  console.log(
    `\nสรุป: ลบ ${deleted} คัน · ปิดใช้งาน ${disabled} คัน · ข้าม ${skipped} คัน`
  );

  const left = await prisma.car.count({ where: { status: "AVAILABLE" } });
  console.log(`รถที่ลูกค้าจะเห็นหลังจากนี้: ${left} คัน`);

  if (!apply) {
    console.log("\nยังไม่ได้แก้อะไร — รันซ้ำด้วย --apply เพื่อลงมือจริง");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
