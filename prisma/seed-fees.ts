/**
 * ใส่รายการค่าปรับตั้งต้นลงตาราง FeeItem — รันครั้งเดียวตอนเปิดใช้ฟีเจอร์นี้
 *
 *   npx tsx prisma/seed-fees.ts
 *
 * ปลอดภัยถ้าเผลอรันซ้ำ: ถ้ามีข้อมูลอยู่แล้วจะไม่ทำอะไรเลย
 * (ทำแบบนี้เพราะแอดมินอาจแก้ยอดไปแล้ว การใส่ทับจะลบงานเขาทิ้ง)
 *
 * ปุ่ม “ใส่รายการตั้งต้น” ในหน้า /admin/fees ทำงานเหมือนกันทุกอย่าง
 * สคริปต์นี้มีไว้ตอนตั้งระบบใหม่ที่ยังไม่มีใครล็อกอินเข้าหลังบ้าน
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEFAULT_FEE_ITEMS } from "../lib/fees";

const DB_URL = process.env.DATABASE_URL ?? "";
if (!DB_URL) {
  console.error("ไม่พบ DATABASE_URL — รันจากโฟลเดอร์โปรเจกต์ที่มี .env.local");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DB_URL }) });

async function main() {
  const existing = await prisma.feeItem.count();
  if (existing > 0) {
    console.log(`มีอยู่แล้ว ${existing} รายการ — ไม่ทำอะไร (แก้ได้ที่ /admin/fees)`);
    return;
  }

  const { count } = await prisma.feeItem.createMany({
    data: DEFAULT_FEE_ITEMS.map((f, i) => ({
      icon: f.icon,
      title: f.title,
      amount: f.amount,
      note: f.note ?? null,
      highlight: Boolean(f.highlight),
      isActive: true,
      // เว้นเลขห่าง ๆ ให้แทรกรายการใหม่ตรงกลางได้โดยไม่ต้องไล่แก้ทุกแถว
      sortOrder: (i + 1) * 10,
    })),
  });

  console.log(`ใส่รายการค่าปรับแล้ว ${count} รายการ — แก้ยอดต่อได้ที่ /admin/fees`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
