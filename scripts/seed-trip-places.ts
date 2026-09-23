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

/* คำแนะนำการขับที่ลูกค้าเห็น — เขียนสั้น ใช้ได้กับทุกรุ่นรถ แก้ได้ในหลังบ้าน */
const STEEP =
  "ทางขึ้นชันและโค้งหักศอก ขาลงให้ใช้เกียร์ต่ำ (L, B หรือ S) ช่วยเบรก อย่าเหยียบเบรกค้างยาว ๆ เพราะเบรกจะร้อนจนไม่อยู่ · ขับชิดซ้าย ไม่แซงในโค้ง";
const FAR_STEEP =
  STEEP + " · ทางไกลและปั๊มน้ำมันน้อย เติมน้ำมันให้เต็มก่อนขึ้น · อากาศเย็นและอาจมีหมอก เปิดไฟหน้าและขับช้า";

const PLACES: {
  name: string;
  province: string;
  district: string;
  note?: string;
  drivingTip?: string;
  /** เส้นทางชันมาก — รถที่ห้ามขึ้น (เช่น Yaris Ativ) เลือกไม่ได้ */
  steep?: boolean;
  /** ห้ามรถเก๋งทุกคัน */
  noSedan?: boolean;
}[] = [
  // เชียงใหม่
  { name: "ตัวเมือง / นิมมาน / ประตูท่าแพ", province: "เชียงใหม่", district: "เมืองเชียงใหม่" },
  { name: "ดอยสุเทพ–ดอยปุย", province: "เชียงใหม่", district: "เมืองเชียงใหม่", note: "ทางขึ้นเขา", drivingTip: "ทางขึ้นเป็นโค้งต่อเนื่อง ขาลงใช้เกียร์ต่ำช่วยเบรก อย่าเหยียบเบรกค้าง · ช่วงวันหยุดรถติดและที่จอดเต็ม ควรไปเช้า" },
  { name: "เชียงใหม่ไนท์ซาฟารี", province: "เชียงใหม่", district: "หางดง" },
  { name: "แกรนด์แคนยอน หางดง", province: "เชียงใหม่", district: "หางดง" },
  { name: "บ่อสร้าง / ถนนสายหัตถกรรม", province: "เชียงใหม่", district: "สันกำแพง" },
  { name: "ม่อนแจ่ม", province: "เชียงใหม่", district: "แม่ริม", note: "ทางชัน", drivingTip: STEEP, steep: true },
  { name: "ปางช้าง / ม่อนแจ่ม–แม่แตง", province: "เชียงใหม่", district: "แม่แตง" },
  { name: "แม่กำปอง", province: "เชียงใหม่", district: "แม่ออน", note: "ทางชัน", drivingTip: STEEP + " · ถนนในหมู่บ้านแคบ สวนกันต้องหยุดให้ทาง" },
  { name: "สะเมิง", province: "เชียงใหม่", district: "สะเมิง", note: "ทางชัน", drivingTip: STEEP },
  { name: "ดอยอินทนนท์", province: "เชียงใหม่", district: "จอมทอง", note: "ทางชัน ไกล", drivingTip: FAR_STEEP },
  {
    name: "สันป่าเกี๊ยะ",
    province: "เชียงใหม่",
    district: "เชียงดาว",
    note: "ทางลูกรัง ต้องใช้รถยกสูง",
    drivingTip:
      "ทางเข้าเป็นลูกรัง ขรุขระและชันบางช่วง ต้องใช้รถยกสูง (SUV) · หน้าฝนลื่นมาก ขับช้าและใช้เกียร์ต่ำ · เผื่อเวลาเดินทางและกลับก่อนมืด",
    noSedan: true,
  },
  { name: "เชียงดาว / ดอยหลวงเชียงดาว", province: "เชียงใหม่", district: "เชียงดาว" },
  { name: "ดอยอ่างขาง", province: "เชียงใหม่", district: "ฝาง", note: "ทางชัน ไกล", drivingTip: FAR_STEEP + " · ช่วงก่อนถึงยอดชันมาก ใช้เกียร์ต่ำทั้งขึ้นและลง", steep: true },
  { name: "แม่แจ่ม", province: "เชียงใหม่", district: "แม่แจ่ม", note: "ทางภูเขา ไกล", drivingTip: FAR_STEEP, steep: true },
  { name: "ดอยผ้าห่มปก", province: "เชียงใหม่", district: "ฝาง", note: "ทางชันมาก ไกล", drivingTip: FAR_STEEP, steep: true },
  { name: "อมก๋อย", province: "เชียงใหม่", district: "อมก๋อย", note: "ทางภูเขายาว ถนนบางช่วงไม่ดี", drivingTip: FAR_STEEP, steep: true },
  { name: "เวียงแหง", province: "เชียงใหม่", district: "เวียงแหง", note: "ทางภูเขายาว", drivingTip: FAR_STEEP, steep: true },
  { name: "กัลยาณิวัฒนา", province: "เชียงใหม่", district: "กัลยาณิวัฒนา", note: "ทางภูเขายาว ไกล", drivingTip: FAR_STEEP, steep: true },
  // ลำพูน
  { name: "วัดพระธาตุหริภุญชัย", province: "ลำพูน", district: "เมืองลำพูน" },
  { name: "อุทยานแห่งชาติแม่ปิง", province: "ลำพูน", district: "ลี้", note: "ไกล", drivingTip: "ทางไกลและเปลี่ยวบางช่วง เติมน้ำมันให้เต็มก่อนออก และควรกลับก่อนมืด" },
  // ลำปาง
  { name: "ตัวเมืองลำปาง / รถม้า / กาดกองต้า", province: "ลำปาง", district: "เมืองลำปาง" },
  { name: "เขื่อนกิ่วลม", province: "ลำปาง", district: "เมืองลำปาง" },
  { name: "วัดพระธาตุลำปางหลวง", province: "ลำปาง", district: "เกาะคา" },
  { name: "แจ้ซ้อน", province: "ลำปาง", district: "เมืองปาน", note: "ทางชัน", drivingTip: STEEP },
  { name: "วัดพระธาตุปู่ผาแดง (วัดเฉลิมพระเกียรติฯ)", province: "ลำปาง", district: "แจ้ห่ม", note: "ทางชัน", drivingTip: "ต้องจอดรถด้านล่างแล้วต่อรถของวัดขึ้นไป · ทางมาเป็นเขา ขาลงใช้เกียร์ต่ำ", steep: true },
];

async function main() {
  let added = 0;
  for (const [i, p] of PLACES.entries()) {
    const exists = await prisma.tripPlace.findFirst({
      where: { name: p.name, province: p.province },
    });
    if (exists) {
      // ของเดิมที่ยังไม่มีคำแนะนำ เติมให้ — ไม่ทับที่แอดมินเขียนเองแล้ว
      const patch: { drivingTip?: string; steep?: boolean; noSedan?: boolean } = {};
      if (!exists.drivingTip && p.drivingTip) patch.drivingTip = p.drivingTip;
      if (!exists.steep && p.steep) patch.steep = true;
      if (!exists.noSedan && p.noSedan) patch.noSedan = true;
      if (Object.keys(patch).length) {
        await prisma.tripPlace.update({ where: { id: exists.id }, data: patch });
      }
      continue;
    }
    await prisma.tripPlace.create({
      data: { ...p, surcharge: 0, sortOrder: (i + 1) * 10 },
    });
    added++;
  }
  console.log(`เพิ่มสถานที่ ${added} แห่ง (มีอยู่แล้ว ${PLACES.length - added} แห่ง)`);

  /* ประเภทรถตั้งต้น — ตั้งเฉพาะคันที่ยังไม่ได้ระบุ ไม่ทับที่แอดมินตั้งเอง
     Yaris Ativ ติ๊ก "ห้ามขึ้นเส้นทางชันมาก" ด้วย */
  const TYPES: { match: string; bodyType: string; noSteep?: boolean }[] = [
    { match: "Yaris Ativ", bodyType: "SEDAN", noSteep: true },
    { match: "City", bodyType: "SEDAN" },
    { match: "Civic", bodyType: "SEDAN" },
    { match: "HR-V", bodyType: "SUV" },
    { match: "Corolla Cross", bodyType: "SUV" },
    { match: "Fortuner", bodyType: "SUV" },
    { match: "Veloz", bodyType: "MPV" },
  ];
  for (const t of TYPES) {
    const r = await prisma.car.updateMany({
      where: { name: { contains: t.match, mode: "insensitive" }, bodyType: null },
      data: { bodyType: t.bodyType, ...(t.noSteep ? { noSteepRoutes: true } : {}) },
    });
    if (r.count) console.log(`ตั้งประเภท ${t.match} → ${t.bodyType} (${r.count} คัน)`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
