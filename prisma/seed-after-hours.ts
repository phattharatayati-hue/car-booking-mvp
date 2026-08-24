import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * ใส่ค่าบริการนอกเวลาเริ่มต้น
 *   07:00-20:00  ฟรี (ไม่ต้องมีแถว)
 *   05:00-07:00  +100  ช่วงเช้ามืด
 *   20:00-22:00  +100  ช่วงค่ำ
 *   22:00-05:00  +200  ช่วงดึก (ข้ามเที่ยงคืน)
 *
 * รันครั้งเดียว: npx tsx prisma/seed-after-hours.ts
 * แก้ราคา/ช่วงภายหลังได้ที่ /admin/after-hours
 */
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const RATES = [
  { label: "ช่วงเช้ามืด", startMinute: 5 * 60, endMinute: 7 * 60, fee: 100 },
  { label: "ช่วงค่ำ", startMinute: 20 * 60, endMinute: 22 * 60, fee: 100 },
  { label: "ช่วงดึก", startMinute: 22 * 60, endMinute: 5 * 60, fee: 200 },
];

async function main() {
  const existing = await prisma.afterHoursRate.count();
  if (existing > 0) {
    console.log(`มีช่วงเวลาอยู่แล้ว ${existing} รายการ — ไม่แตะต้อง`);
    console.log("ถ้าต้องการเริ่มใหม่ ให้ลบในหน้า /admin/after-hours ก่อน");
    return;
  }

  for (const r of RATES) {
    await prisma.afterHoursRate.create({ data: r });
    console.log(`เพิ่ม: ${r.label} +${r.fee} บาท`);
  }
  console.log("เสร็จแล้ว — ตรวจดูได้ที่ /admin/after-hours");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
