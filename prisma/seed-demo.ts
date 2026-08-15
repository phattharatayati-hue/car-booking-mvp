import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CARS = [
  {
    name: "Yaris Ativ",
    brand: "Toyota",
    licensePlate: "กข 1234 เชียงใหม่",
    pricePerDay: 1200,
    source: "OWN" as const,
    photoUrl:
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80",
  },
  {
    name: "City",
    brand: "Honda",
    licensePlate: "งจ 5678 เชียงใหม่",
    pricePerDay: 1300,
    source: "OWN" as const,
    photoUrl:
      "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&q=80",
  },
  {
    name: "Almera",
    brand: "Nissan",
    licensePlate: "ฉช 9012 เชียงใหม่",
    pricePerDay: 1100,
    source: "PARTNER" as const,
    photoUrl:
      "https://images.unsplash.com/photo-1494905998402-395d579af36f?w=800&q=80",
  },
  {
    name: "Fortuner",
    brand: "Toyota",
    licensePlate: "ซฌ 3456 เชียงใหม่",
    pricePerDay: 2800,
    source: "OWN" as const,
    photoUrl:
      "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80",
  },
  {
    name: "Xpander",
    brand: "Mitsubishi",
    licensePlate: "ญฎ 7890 เชียงใหม่",
    pricePerDay: 1800,
    source: "PARTNER" as const,
    photoUrl:
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80",
  },
  {
    name: "Jazz",
    brand: "Honda",
    licensePlate: "ฐฑ 2468 เชียงใหม่",
    pricePerDay: 1000,
    source: "OWN" as const,
    photoUrl:
      "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&q=80",
  },
];

const CUSTOMERS = [
  { fullName: "สมชาย ใจดี", phone: "081-234-5678", email: "somchai@example.com" },
  { fullName: "สุดา รักเรียน", phone: "089-876-5432", email: "suda@example.com" },
  { fullName: "ประเสริฐ มั่งมี", phone: "092-111-2233", email: "prasert@example.com" },
  { fullName: "วิภา สดใส", phone: "086-555-7788", email: "wipa@example.com" },
];

const SLIP_URL =
  "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80";

function daysFromNow(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  console.log("กำลังใส่ข้อมูลจำลอง...");

  // --- รถ ---
  const cars = [];
  for (const c of CARS) {
    const car = await prisma.car.upsert({
      where: { licensePlate: c.licensePlate },
      update: c,
      create: c,
    });
    cars.push(car);
  }
  console.log(`  รถ: ${cars.length} คัน`);

  // --- ลูกค้า ---
  const customers = [];
  for (const c of CUSTOMERS) {
    const existing = await prisma.customer.findFirst({ where: { phone: c.phone } });
    const customer = existing
      ? await prisma.customer.update({ where: { id: existing.id }, data: c })
      : await prisma.customer.create({ data: c });
    customers.push(customer);
  }
  console.log(`  ลูกค้า: ${customers.length} คน`);

  // --- การจอง ---
  // ลบการจองจำลองเดิมออกก่อน (กันข้อมูลซ้ำเวลารันหลายรอบ)
  const oldBookings = await prisma.booking.findMany({
    where: { customerId: { in: customers.map((c) => c.id) } },
    select: { id: true },
  });
  if (oldBookings.length) {
    const ids = oldBookings.map((b: { id: string }) => b.id);
    await prisma.deposit.deleteMany({ where: { bookingId: { in: ids } } });
    await prisma.booking.deleteMany({ where: { id: { in: ids } } });
  }

  const plans = [
    // รอตรวจสลิปมัดจำ (มีสลิปแล้ว รอแอดมินกด)
    {
      car: cars[0],
      customer: customers[0],
      start: daysFromNow(3),
      end: daysFromNow(6),
      status: "PENDING_DEPOSIT" as const,
      deposit: "PENDING" as const,
      note: "ขอรับรถที่สนามบินเชียงใหม่",
    },
    // ยืนยันแล้ว
    {
      car: cars[1],
      customer: customers[1],
      start: daysFromNow(1),
      end: daysFromNow(4),
      status: "CONFIRMED" as const,
      deposit: "CONFIRMED" as const,
      note: null,
    },
    // ยืนยันแล้ว (รถ SUV)
    {
      car: cars[3],
      customer: customers[2],
      start: daysFromNow(7),
      end: daysFromNow(10),
      status: "CONFIRMED" as const,
      deposit: "CONFIRMED" as const,
      note: "เดินทางไปปาย ขอเบาะเด็ก 1 ที่",
    },
    // จองใหม่ ยังไม่อัปโหลดสลิป
    {
      car: cars[4],
      customer: customers[3],
      start: daysFromNow(12),
      end: daysFromNow(14),
      status: "PENDING_DEPOSIT" as const,
      deposit: null,
      note: null,
    },
    // เสร็จสิ้นแล้ว (ประวัติ)
    {
      car: cars[2],
      customer: customers[0],
      start: daysFromNow(-10),
      end: daysFromNow(-7),
      status: "COMPLETED" as const,
      deposit: "CONFIRMED" as const,
      note: null,
    },
  ];

  let n = 0;
  for (const p of plans) {
    const days = Math.max(
      1,
      Math.round((p.end.getTime() - p.start.getTime()) / 86400000)
    );
    const totalPrice = days * p.car.pricePerDay;

    const booking = await prisma.booking.create({
      data: {
        carId: p.car.id,
        customerId: p.customer.id,
        startDate: p.start,
        endDate: p.end,
        totalPrice,
        status: p.status,
        note: p.note,
      },
    });

    if (p.deposit) {
      await prisma.deposit.create({
        data: {
          bookingId: booking.id,
          amount: Math.round(totalPrice * 0.3),
          slipImageUrl: SLIP_URL,
          status: p.deposit,
          confirmedAt: p.deposit === "CONFIRMED" ? new Date() : null,
        },
      });
    }
    n++;
  }
  console.log(`  การจอง: ${n} รายการ (พร้อมสลิปมัดจำ)`);

  console.log("\nใส่ข้อมูลจำลองเรียบร้อย! เปิดเว็บดูได้เลย");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
