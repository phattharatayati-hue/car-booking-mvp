/**
 * ล้างการผูกบัญชี LINE ทั้งระบบ — ใช้ครั้งเดียวตอนย้ายไป OA ตัวใหม่
 *
 *   npx tsx scripts/reset-line-links.ts          ← ดูก่อนว่าจะล้างกี่ราย
 *   npx tsx scripts/reset-line-links.ts --yes    ← ล้างจริง
 *
 * ทำไมต้องล้าง: ความเป็นเพื่อนผูกกับ OA ไม่ใช่ Provider
 * ต่อให้ lineUserId เดิมยังถูกต้อง (เพราะอยู่ Provider เดิม) แต่ถ้าคนนั้น
 * ยังไม่ได้แอด OA ตัวใหม่ การ push จะถูกปฏิเสธ 403 เงียบ ๆ
 * ล้างทิ้งแล้วให้ทุกคนผูกใหม่ จะได้รู้แน่ว่าใครส่งถึงจริง
 *
 * ไม่แตะ: ใบจอง ลูกค้า ประวัติ — ลบแค่ค่า lineUserId
 * ลูกค้าจะกลับมาผูกเองตอนกดเข้าสู่ระบบด้วย LINE ครั้งถัดไป
 * แอดมินผูกใหม่ที่ /admin/account → ขอรหัสผูก → ทักหา OA ใหม่
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

const YES = process.argv.includes("--yes");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DB_URL }) });

async function main() {
  const customers = await prisma.customer.count({ where: { lineUserId: { not: null } } });
  const admins = await prisma.adminUser.count({ where: { lineUserId: { not: null } } });

  console.log(`\nลูกค้าที่ผูก LINE อยู่: ${customers} ราย`);
  console.log(`แอดมิน/คนรับ-ส่งรถที่ผูก LINE อยู่: ${admins} ราย`);

  if (!YES) {
    console.log("\nนี่คือการดูเฉย ๆ — เติม --yes เพื่อล้างจริง\n");
    return;
  }

  const c = await prisma.customer.updateMany({
    where: { lineUserId: { not: null } },
    data: { lineUserId: null },
  });
  const a = await prisma.adminUser.updateMany({
    where: { lineUserId: { not: null } },
    data: { lineUserId: null },
  });

  // ร่างการจองที่ค้างในแชทของ OA เก่า ใช้ต่อกับ OA ใหม่ไม่ได้ ลบทิ้งให้หมด
  const d = await prisma.lineDraft.deleteMany({});

  console.log(`\nล้างแล้ว — ลูกค้า ${c.count} ราย · แอดมิน ${a.count} ราย · ร่างในแชท ${d.count} รายการ`);
  console.log("อย่าลืม: แอดมินทุกคนต้องแอด OA ใหม่แล้วผูกใหม่ที่ /admin/account");
  console.log("และตั้ง LINE_ADMIN_USER_ID ให้ตรงกับ ID ใหม่ของคนที่รับแจ้งเตือนส่วนกลาง\n");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
