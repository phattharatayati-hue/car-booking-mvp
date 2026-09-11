/**
 * นำเข้าการจองที่รับไว้ทางแชท เข้าระบบหลังบ้าน
 *
 *   npx tsx scripts/import-bookings.ts          ← ดูว่าจะเพิ่มอะไรบ้าง (ไม่เขียนจริง)
 *   npx tsx scripts/import-bookings.ts --yes    ← เขียนจริง
 *
 * รันซ้ำได้ — ใบที่มีอยู่แล้ว (ลูกค้าคนเดิม + รถคันเดิม + เวลารับเดียวกัน) จะถูกข้าม
 *
 * ทุกใบตั้งเป็น "ยืนยันแล้ว" พร้อมสลิปค่าจอง 500 บาทที่ผ่านการตรวจแล้ว
 * เพราะลูกค้าโอนมัดจำและตกลงกันจบไปแล้วทางแชท ไม่ต้องให้ระบบไปทวงซ้ำ
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("\nไม่พบ DATABASE_URL — รันจากโฟลเดอร์โปรเจกต์\n");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DB_URL }),
});

const CONFIRMED = process.argv.includes("--yes");

/** แปลงวันเวลาไทยเป็น Date — ระบุ +07:00 ตรง ๆ กันเครื่องที่ตั้ง timezone อื่น */
function bkk(iso: string): Date {
  return new Date(`${iso}:00+07:00`);
}

/** ราคาต่อวันที่ตกลงกับลูกค้าจริง — อัปเดตให้ตรงกับที่คุยไว้ */
const PRICE_FIXES: { plate: string; pricePerDay: number }[] = [
  { plate: "CROSS-01", pricePerDay: 1850 },
  { plate: "CITYH-01", pricePerDay: 1200 },
  { plate: "CIVIC-01", pricePerDay: 1800 },
];

/** รถที่ยังไม่มีในระบบ */
const NEW_CARS = [
  {
    plate: "YCROSS-01",
    brand: "Toyota",
    name: "Yaris Cross",
    pricePerDay: 1650,
  },
];

type Row = {
  who: string;
  phone: string;
  plate: string;
  start: string;
  end: string;
  place: string;
  /** ค่าเช่ารวม ไม่รวมเงินประกัน — ตามที่แจ้งลูกค้าไปแล้ว */
  total: number;
  note: string;
};

const ROWS: Row[] = [
  {
    who: "มุก",
    phone: "0000000000",
    plate: "CROSS-01",
    start: "2026-09-20T08:00",
    end: "2026-09-24T16:00",
    place: "สถานีรถไฟเชียงใหม่",
    total: 9250,
    note: "จองทาง LINE OA · ค่าเช่า 1,850 × 5 วัน = 9,250 · เงินประกัน 3,000 · เก็บวันรับรถ 11,750 · ยังไม่ได้เบอร์โทร",
  },
  {
    who: "Emma Walker",
    phone: "0806406489",
    plate: "CITYH-01",
    start: "2026-09-25T12:00",
    end: "2026-09-28T12:30",
    place: "สนามบินเชียงใหม่",
    total: 3600,
    note: "จองทาง Facebook · ค่าเช่า 1,200 × 3 วัน = 3,600 · เงินประกัน 3,000 · เก็บวันรับรถ 6,100",
  },
  {
    who: "Big",
    phone: "0874969640",
    plate: "CIVIC-01",
    start: "2026-09-25T12:00",
    end: "2026-09-26T16:00",
    place: "สถานีรถไฟเชียงใหม่",
    total: 2600,
    note: "จองทาง LINE OA · ค่าเช่า 1,800 + ค่าเลท 200 × 4 ชม. = 800 รวม 2,600 · เงินประกัน 3,000 · เก็บวันรับรถ 5,100 · ใช้รถแถวเชียงดาว",
  },
  {
    who: "GP",
    phone: "0979321303",
    plate: "YCROSS-01",
    start: "2026-09-28T12:00",
    end: "2026-09-30T14:30",
    place: "สนามบินเชียงใหม่",
    total: 3750,
    note: "จองทาง LINE OA · ค่าเช่า 1,650 × 2 วัน = 3,300 + ค่าเรท 450 รวม 3,750 · เงินประกัน 3,000 · เก็บวันรับรถ 6,250 · เบอร์สำรอง 0955565676 (เพชร) · เบอร์หลักคือแก้ม",
  },
];

async function main() {
  console.log(`\nฐานข้อมูล: ${new URL(DB_URL!).hostname}`);
  console.log(CONFIRMED ? "โหมด: เขียนจริง\n" : "โหมด: ดูเฉย ๆ ยังไม่เขียน\n");

  // 1. รถที่ยังไม่มี
  for (const c of NEW_CARS) {
    const exists = await prisma.car.findFirst({ where: { licensePlate: c.plate } });
    if (exists) {
      console.log(`รถ ${c.brand} ${c.name}: มีอยู่แล้ว ข้าม`);
      continue;
    }
    console.log(`รถ ${c.brand} ${c.name} (${c.plate}) ${c.pricePerDay} ฿/วัน: เพิ่มใหม่`);
    if (CONFIRMED) {
      await prisma.car.create({
        data: {
          brand: c.brand,
          name: c.name,
          licensePlate: c.plate,
          pricePerDay: c.pricePerDay,
          status: "AVAILABLE",
        },
      });
    }
  }

  // 2. ปรับราคาต่อวันให้ตรงกับที่ตกลงจริง
  for (const f of PRICE_FIXES) {
    const car = await prisma.car.findFirst({ where: { licensePlate: f.plate } });
    if (!car) {
      console.log(`ราคา ${f.plate}: ไม่พบรถคันนี้ ข้าม`);
      continue;
    }
    if (car.pricePerDay === f.pricePerDay) {
      console.log(`ราคา ${f.plate}: ตรงอยู่แล้ว (${f.pricePerDay})`);
      continue;
    }
    console.log(`ราคา ${f.plate}: ${car.pricePerDay} → ${f.pricePerDay} ฿/วัน`);
    if (CONFIRMED) {
      await prisma.car.update({
        where: { id: car.id },
        data: { pricePerDay: f.pricePerDay },
      });
    }
  }

  console.log("");

  // 3. ใบจอง
  for (const r of ROWS) {
    const car = await prisma.car.findFirst({ where: { licensePlate: r.plate } });
    if (!car) {
      console.log(`${r.who}: ไม่พบรถ ${r.plate} — ข้ามใบนี้`);
      continue;
    }

    const start = bkk(r.start);
    const end = bkk(r.end);

    /* กันนำเข้าซ้ำตอนรันสคริปต์หลายรอบ — ดูจากรถคันเดียวกัน + เวลารับเดียวกัน
       ซึ่งพอแยกใบได้จริง เพราะรถคันหนึ่งรับคนเดียวในเวลาเดียว */
    const dup = await prisma.booking.findFirst({
      where: { carId: car.id, startDate: start },
    });
    if (dup) {
      console.log(`${r.who}: มีใบนี้อยู่แล้ว (${dup.id.slice(0, 8).toUpperCase()}) ข้าม`);
      continue;
    }

    /* จับคู่ลูกค้าเดิมจากเบอร์ เฉพาะคนที่ยังไม่ผูก LINE
       ถ้าเบอร์เป็น 0000000000 (ยังไม่รู้เบอร์จริง) ให้สร้างใหม่เสมอ
       ไม่งั้นลูกค้าคนละคนที่ยังไม่มีเบอร์จะถูกยุบรวมเป็นคนเดียวกัน */
    const reuse =
      r.phone === "0000000000"
        ? null
        : await prisma.customer.findFirst({
            where: { phone: r.phone, lineUserId: null },
          });

    console.log(
      `${r.who}: ${car.brand} ${car.name} · ${r.start} → ${r.end} · ${r.total.toLocaleString()} ฿` +
        (reuse ? " (ใช้ลูกค้าเดิม)" : " (สร้างลูกค้าใหม่)")
    );

    if (!CONFIRMED) continue;

    const customer =
      reuse ??
      (await prisma.customer.create({
        data: { fullName: r.who, phone: r.phone },
      }));

    const booking = await prisma.booking.create({
      data: {
        carId: car.id,
        customerId: customer.id,
        startDate: start,
        endDate: end,
        totalPrice: r.total,
        pickupPlace: r.place,
        returnPlace: r.place,
        status: "CONFIRMED",
        adminNote: r.note,
      },
    });

    // ค่าจอง 500 รับมาแล้วและตรวจแล้ว — บันทึกให้ตรงกับความจริง
    await prisma.deposit.create({
      data: {
        bookingId: booking.id,
        amount: 500,
        slipImageUrl: "",
        status: "CONFIRMED",
        confirmedBy: "import-bookings",
        confirmedAt: new Date(),
      },
    });

    console.log(`  → สร้างแล้ว รหัส ${booking.id.slice(0, 8).toUpperCase()}`);
  }

  if (!CONFIRMED) {
    console.log("\nยังไม่ได้เขียนอะไร — ถ้าถูกต้องแล้วให้รันซ้ำด้วย --yes\n");
  } else {
    const total = await prisma.booking.count();
    console.log(`\nเรียบร้อย — ตอนนี้มีการจองในระบบ ${total} ใบ\n`);
  }
}

main()
  .catch((err) => {
    console.error("\nล้มเหลว:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
