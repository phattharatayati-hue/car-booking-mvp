/**
 * ใส่สถานที่ยอดนิยมชุดตั้งต้นให้แผนการเดินทาง — ค่าบริการเป็น 0 ทุกแห่ง
 *
 *   npx tsx scripts/seed-trip-places.ts
 *
 * รันซ้ำได้ ไม่สร้างซ้ำ (ข้ามชื่อที่มีอยู่แล้วในจังหวัดเดียวกัน)
 * แก้ชื่อ อำเภอ ค่าบริการ หรือเพิ่ม-ลบ ได้ที่หลังบ้าน /admin/trip-plans
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const DB_URL = process.env.DATABASE_URL ?? "";
if (!DB_URL) {
  console.error("\nไม่พบ DATABASE_URL — รันจากโฟลเดอร์โปรเจกต์ที่มี .env.local\n");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DB_URL }),
});

const PLACES: { name: string; province: string; district: string; note?: string }[] = [
  // เชียงใหม่
  { name: "ตัวเมือง / นิมมาน / ประตูท่าแพ", province: "เชียงใหม่", district: "เมืองเชียงใหม่" },
  { name: "ดอยสุเทพ–ดอยปุย", province: "เชียงใหม่", district: "เมืองเชียงใหม่", note: "ทางขึ้นเขา" },
  { name: "เชียงใหม่ไนท์ซาฟารี", province: "เชียงใหม่", district: "หางดง" },
  { name: "แกรนด์แคนยอน หางดง", province: "เชียงใหม่", district: "หางดง" },
  { name: "บ่อสร้าง / ถนนสายหัตถกรรม", province: "เชียงใหม่", district: "สันกำแพง" },
  { name: "ม่อนแจ่ม", province: "เชียงใหม่", district: "แม่ริม", note: "ทางชัน" },
  { name: "ปางช้าง / ม่อนแจ่ม–แม่แตง", province: "เชียงใหม่", district: "แม่แตง" },
  { name: "แม่กำปอง", province: "เชียงใหม่", district: "แม่ออน", note: "ทางชัน" },
  { name: "สะเมิง", province: "เชียงใหม่", district: "สะเมิง", note: "ทางชัน" },
  { name: "ดอยอินทนนท์", province: "เชียงใหม่", district: "จอมทอง", note: "ทางชัน ไกล" },
  { name: "เชียงดาว / ดอยหลวงเชียงดาว", province: "เชียงใหม่", district: "เชียงดาว" },
  { name: "ดอยอ่างขาง", province: "เชียงใหม่", district: "ฝาง", note: "ทางชัน ไกล" },
  { name: "แม่แจ่ม", province: "เชียงใหม่", district: "แม่แจ่ม", note: "ทางภูเขา ไกล" },
  // ลำพูน
  { name: "วัดพระธาตุหริภุญชัย", province: "ลำพูน", district: "เมืองลำพูน" },
  { name: "อุทยานแห่งชาติแม่ปิง", province: "ลำพูน", district: "ลี้", note: "ไกล" },
  // ลำปาง
  { name: "ตัวเมืองลำปาง / รถม้า / กาดกองต้า", province: "ลำปาง", district: "เมืองลำปาง" },
  { name: "เขื่อนกิ่วลม", province: "ลำปาง", district: "เมืองลำปาง" },
  { name: "วัดพระธาตุลำปางหลวง", province: "ลำปาง", district: "เกาะคา" },
  { name: "แจ้ซ้อน", province: "ลำปาง", district: "เมืองปาน", note: "ทางชัน" },
  { name: "วัดพระธาตุปู่ผาแดง (วัดเฉลิมพระเกียรติฯ)", province: "ลำปาง", district: "แจ้ห่ม", note: "ทางชัน" },
];

async function main() {
  let added = 0;
  for (const [i, p] of PLACES.entries()) {
    const exists = await prisma.tripPlace.findFirst({
      where: { name: p.name, province: p.province },
    });
    if (exists) continue;
    await prisma.tripPlace.create({
      data: { ...p, surcharge: 0, sortOrder: (i + 1) * 10 },
    });
    added++;
  }
  console.log(`เพิ่มสถานที่ ${added} แห่ง (มีอยู่แล้ว ${PLACES.length - added} แห่ง)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
