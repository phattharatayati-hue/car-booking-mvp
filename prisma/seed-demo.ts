import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/* ---------- เจ้าของรถ (พาร์ทเนอร์) ---------- */

const PARTNERS = [
  {
    key: "somchai",
    name: "คุณสมชาย (บ้านสันทราย)",
    phone: "0812345001",
    lineId: "@somchai-rent",
    note: "รับสายหลัง 09:00 น. · รถจอดที่บ้าน นัดรับได้ในเมือง",
  },
  {
    key: "malee",
    name: "คุณมาลี (คาร์เร้นท์ หางดง)",
    phone: "0812345002",
    lineId: "@malee-car",
    note: "มีรถหลายคัน ตอบเร็ว · ขอแจ้งล่วงหน้าอย่างน้อย 1 วัน",
  },
];

/* ---------- รถ ---------- */

type CarSeed = {
  name: string;
  brand: string;
  licensePlate: string;
  pricePerDay: number;
  costPerDay?: number;
  partnerKey?: string;
  photoUrl: string;
};

const CARS: CarSeed[] = [
  // รถของเราเอง
  {
    name: "Yaris Ativ",
    brand: "Toyota",
    licensePlate: "กข 1234 เชียงใหม่",
    pricePerDay: 1200,
    photoUrl: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80",
  },
  {
    name: "City",
    brand: "Honda",
    licensePlate: "งจ 5678 เชียงใหม่",
    pricePerDay: 1300,
    photoUrl: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&q=80",
  },
  {
    name: "Fortuner",
    brand: "Toyota",
    licensePlate: "ซฌ 3456 เชียงใหม่",
    pricePerDay: 2800,
    photoUrl: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80",
  },
  {
    name: "Jazz",
    brand: "Honda",
    licensePlate: "ฐฑ 2468 เชียงใหม่",
    pricePerDay: 1000,
    photoUrl: "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&q=80",
  },

  // รถนายหน้า — ของคุณสมชาย
  {
    name: "Almera",
    brand: "Nissan",
    licensePlate: "ฉช 9012 เชียงใหม่",
    pricePerDay: 1100,
    costPerDay: 800,
    partnerKey: "somchai",
    photoUrl: "https://images.unsplash.com/photo-1494905998402-395d579af36f?w=800&q=80",
  },
  {
    name: "Vios",
    brand: "Toyota",
    licensePlate: "ฒณ 1357 เชียงใหม่",
    pricePerDay: 1150,
    costPerDay: 850,
    partnerKey: "somchai",
    photoUrl: "https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800&q=80",
  },

  // รถนายหน้า — ของคุณมาลี
  {
    name: "Xpander",
    brand: "Mitsubishi",
    licensePlate: "ญฎ 7890 เชียงใหม่",
    pricePerDay: 1800,
    costPerDay: 1300,
    partnerKey: "malee",
    photoUrl: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80",
  },
  {
    name: "CR-V",
    brand: "Honda",
    licensePlate: "ดต 4680 เชียงใหม่",
    pricePerDay: 2500,
    costPerDay: 1900,
    partnerKey: "malee",
    photoUrl: "https://images.unsplash.com/photo-1568844293986-8d0400bd4745?w=800&q=80",
  },
];

/* ---------- ลูกค้า ---------- */

const CUSTOMERS = [
  { fullName: "สมชาย ใจดี", phone: "0812345678", email: "somchai@example.com" },
  { fullName: "สุดา รักเรียน", phone: "0898765432", email: "suda@example.com" },
  { fullName: "ประเสริฐ มั่งมี", phone: "0921112233", email: "prasert@example.com" },
  { fullName: "วิภา สดใส", phone: "0865557788", email: "wipa@example.com" },
];

const SLIP_URL =
  "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80";

/** วันที่ + เวลา ตามเวลาไทย */
function at(daysFromNow: number, time: string) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysFromNow);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
  return new Date(`${iso}T${time}:00+07:00`);
}

async function main() {
  console.log("กำลังใส่ข้อมูลจำลอง...\n");

  /* เจ้าของรถ */
  const partnerIds = new Map<string, string>();
  for (const p of PARTNERS) {
    const existing = await prisma.partner.findFirst({ where: { phone: p.phone } });
    const row = existing
      ? await prisma.partner.update({
          where: { id: existing.id },
          data: { name: p.name, lineId: p.lineId, note: p.note },
        })
      : await prisma.partner.create({
          data: { name: p.name, phone: p.phone, lineId: p.lineId, note: p.note },
        });
    partnerIds.set(p.key, row.id);
  }
  console.log(`  เจ้าของรถ: ${PARTNERS.length} ราย`);

  /* รถ */
  const cars = new Map<string, { id: string; pricePerDay: number }>();
  for (const c of CARS) {
    const partnerId = c.partnerKey ? partnerIds.get(c.partnerKey) ?? null : null;
    const data = {
      name: c.name,
      brand: c.brand,
      licensePlate: c.licensePlate,
      pricePerDay: c.pricePerDay,
      costPerDay: c.costPerDay ?? null,
      photoUrl: c.photoUrl,
      partnerId,
      source: partnerId ? ("PARTNER" as const) : ("OWN" as const),
      status: "AVAILABLE" as const,
    };

    const car = await prisma.car.upsert({
      where: { licensePlate: c.licensePlate },
      update: data,
      create: data,
    });
    cars.set(c.licensePlate, { id: car.id, pricePerDay: car.pricePerDay });
  }
  const partnerCars = CARS.filter((c) => c.partnerKey).length;
  console.log(`  รถ: ${CARS.length} คัน (ของเรา ${CARS.length - partnerCars} · นายหน้า ${partnerCars})`);

  /* ลูกค้า */
  const customers = new Map<string, string>();
  for (const c of CUSTOMERS) {
    const existing = await prisma.customer.findFirst({ where: { phone: c.phone } });
    const row = existing
      ? await prisma.customer.update({ where: { id: existing.id }, data: c })
      : await prisma.customer.create({ data: c });
    customers.set(c.phone, row.id);
  }
  console.log(`  ลูกค้า: ${CUSTOMERS.length} คน`);

  /* ล้างการจองจำลองเดิม กันซ้ำเวลารันหลายรอบ */
  const customerIds = [...customers.values()];
  const old = await prisma.booking.findMany({
    where: { customerId: { in: customerIds } },
    select: { id: true },
  });
  if (old.length) {
    const ids = old.map((b: { id: string }) => b.id);
    await prisma.deposit.deleteMany({ where: { bookingId: { in: ids } } });
    await prisma.booking.deleteMany({ where: { id: { in: ids } } });
  }

  /* การจอง — ครอบคลุมทุกสถานะให้ทดสอบได้ครบ */
  const plans = [
    // รถเรา — รอตรวจสลิป
    {
      plate: "กข 1234 เชียงใหม่",
      phone: "0812345678",
      start: at(3, "10:00"),
      end: at(6, "10:00"),
      status: "PENDING_DEPOSIT" as const,
      deposit: "PENDING" as const,
    },
    // รถเรา — ยืนยันแล้ว
    {
      plate: "งจ 5678 เชียงใหม่",
      phone: "0898765432",
      start: at(1, "09:00"),
      end: at(4, "18:00"),
      status: "CONFIRMED" as const,
      deposit: "CONFIRMED" as const,
    },
    // รถเรา — ยืนยันแล้ว (SUV)
    {
      plate: "ซฌ 3456 เชียงใหม่",
      phone: "0921112233",
      start: at(7, "08:00"),
      end: at(10, "12:00"),
      status: "CONFIRMED" as const,
      deposit: "CONFIRMED" as const,
      note: "เดินทางไปปาย ขอเบาะเด็ก 1 ที่",
    },

    // 👉 รถนายหน้า — คำขอรอเช็คกับเจ้าของรถ (ตัวหลักที่อยากให้ดู)
    {
      plate: "ฉช 9012 เชียงใหม่",
      phone: "0865557788",
      start: at(5, "10:00"),
      end: at(8, "10:00"),
      status: "REQUESTED" as const,
      deposit: null,
      note: "ลูกค้าขอรับรถที่สนามบิน",
    },
    // รถนายหน้า — คำขออีกรายการ
    {
      plate: "ญฎ 7890 เชียงใหม่",
      phone: "0812345678",
      start: at(9, "09:00"),
      end: at(12, "18:00"),
      status: "REQUESTED" as const,
      deposit: null,
    },
    // รถนายหน้า — เจ้าของยืนยันแล้ว รอลูกค้าโอนมัดจำ
    {
      plate: "ฒณ 1357 เชียงใหม่",
      phone: "0898765432",
      start: at(4, "13:00"),
      end: at(6, "13:00"),
      status: "PENDING_DEPOSIT" as const,
      deposit: null,
      adminNote: "โทรหาคุณสมชายแล้ว รถว่าง ยืนยันปากเปล่า 14:30",
    },
    // รถนายหน้า — เจ้าของแจ้งว่าไม่ว่าง
    {
      plate: "ดต 4680 เชียงใหม่",
      phone: "0921112233",
      start: at(2, "10:00"),
      end: at(5, "10:00"),
      status: "REJECTED" as const,
      deposit: null,
      adminNote: "คุณมาลีแจ้งว่ารถติดงานแต่งช่วงนี้",
    },

    // ประวัติที่ผ่านมาแล้ว
    {
      plate: "ฐฑ 2468 เชียงใหม่",
      phone: "0812345678",
      start: at(-10, "10:00"),
      end: at(-7, "10:00"),
      status: "COMPLETED" as const,
      deposit: "CONFIRMED" as const,
    },
  ];

  let n = 0;
  for (const p of plans) {
    const car = cars.get(p.plate);
    const customerId = customers.get(p.phone);
    if (!car || !customerId) continue;

    const days = Math.max(
      1,
      Math.ceil((p.end.getTime() - p.start.getTime()) / 86400000)
    );
    const totalPrice = days * car.pricePerDay;

    const booking = await prisma.booking.create({
      data: {
        carId: car.id,
        customerId,
        startDate: p.start,
        endDate: p.end,
        totalPrice,
        status: p.status,
        note: "note" in p ? (p.note as string) : null,
        adminNote: "adminNote" in p ? (p.adminNote as string) : null,
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

  console.log(`  การจอง: ${n} รายการ`);
  console.log("\nใส่ข้อมูลจำลองเรียบร้อย!\n");
  console.log("ลองดูที่:");
  console.log("  /admin/partners            — คลังรถนายหน้า 2 ราย พร้อมกำไรต่อวัน");
  console.log("  /admin/bookings?status=REQUESTED — คำขอรอเช็ค 2 รายการ");
  console.log("  /admin/calendar            — ปฏิทินรถทุกคัน");
  console.log("  /cars                      — รถนายหน้าจะขึ้นปุ่ม “ขอจอง” สีม่วง");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
