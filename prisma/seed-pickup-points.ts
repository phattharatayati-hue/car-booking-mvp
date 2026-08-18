/**
 * ใส่จุดรับ-ส่งรถเริ่มต้น
 *
 *   npx tsx prisma/seed-pickup-points.ts
 *
 * รันซ้ำได้ — ถ้ามีชื่อนี้อยู่แล้วจะข้าม ไม่สร้างซ้ำ
 * เพิ่ม แก้ หรือปิดจุดอื่นได้เองที่หลังบ้าน หน้า "จุดรับ-ส่งรถ"
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const POINTS = [
  { name: "สนามบินเชียงใหม่", fee: 0, sortOrder: 1 },
  { name: "สถานีขนส่งอาเขต", fee: 0, sortOrder: 2 },
  { name: "สถานีรถไฟเชียงใหม่", fee: 0, sortOrder: 3 },
];

async function main() {
  for (const point of POINTS) {
    const existing = await prisma.pickupPoint.findFirst({
      where: { name: point.name },
    });

    if (existing) {
      console.log(`ข้าม    ${point.name} — มีอยู่แล้ว`);
      continue;
    }

    await prisma.pickupPoint.create({ data: point });
    console.log(`เพิ่ม   ${point.name} — ${point.fee === 0 ? "ฟรี" : point.fee + " บาท"}`);
  }

  console.log("\nเสร็จแล้ว");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
