/**
 * ใส่รายการรถจริงพร้อมเรทราคา
 *
 *   npx tsx prisma/seed-cars.ts
 *
 * รันซ้ำได้ — จับคู่ด้วยทะเบียน ถ้ามีอยู่แล้วจะอัปเดตราคาให้ ไม่สร้างซ้ำ
 * รูปรถกับทะเบียนจริงแก้ได้ทีหลังในหลังบ้าน (จัดการรถ → แก้ไข)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** ทะเบียนชั่วคราว — เปลี่ยนเป็นทะเบียนจริงได้ในหลังบ้าน */
const CARS = [
  { brand: "Toyota", name: "Yaris Ativ", pricePerDay: 1000, licensePlate: "ATIV-01" },
  { brand: "Honda", name: "City Turbo", pricePerDay: 1000, licensePlate: "CITYT-01" },
  { brand: "Honda", name: "City Hybrid", pricePerDay: 1100, licensePlate: "CITYH-01" },
  { brand: "Honda", name: "Civic Turbo", pricePerDay: 1650, licensePlate: "CIVIC-01" },
  { brand: "Honda", name: "HR-V", pricePerDay: 1750, licensePlate: "HRV-01" },
  { brand: "Toyota", name: "Corolla Cross", pricePerDay: 2000, licensePlate: "CROSS-01" },
  { brand: "Toyota", name: "Fortuner", pricePerDay: 2500, licensePlate: "FORT-01" },
];

async function main() {
  for (const car of CARS) {
    const existing = await prisma.car.findUnique({
      where: { licensePlate: car.licensePlate },
    });

    if (existing) {
      await prisma.car.update({
        where: { id: existing.id },
        data: { brand: car.brand, name: car.name, pricePerDay: car.pricePerDay },
      });
      console.log(`อัปเดต  ${car.brand} ${car.name} — ${car.pricePerDay} บาท/วัน`);
    } else {
      await prisma.car.create({
        data: { ...car, source: "OWN", status: "AVAILABLE" },
      });
      console.log(`เพิ่ม   ${car.brand} ${car.name} — ${car.pricePerDay} บาท/วัน`);
    }
  }

  const others = await prisma.car.count({
    where: { licensePlate: { notIn: CARS.map((c) => c.licensePlate) } },
  });

  console.log(`\nเสร็จแล้ว — รถจริง ${CARS.length} คัน`);
  if (others > 0) {
    console.log(
      `ยังมีรถเดโมค้างอยู่อีก ${others} คัน — ปิดหรือลบได้ที่หลังบ้าน หน้า "จัดการรถ"`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
