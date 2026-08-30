/**
 * สร้าง/อัปเดตบัญชีผู้ดูแลระบบ (role = DEV)
 * รัน:  npx tsx prisma/seed-dev.ts
 * เปลี่ยนรหัสผ่านได้ด้วย:  DEV_PASSWORD="..." npx tsx prisma/seed-dev.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("ยังไม่ได้ตั้ง DATABASE_URL");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const USERNAME = process.env.DEV_USERNAME ?? "phatthara";
const PASSWORD = process.env.DEV_PASSWORD ?? "12345678Ph*";
const NAME = process.env.DEV_NAME ?? "Phatthara";

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const user = await prisma.adminUser.upsert({
    where: { email: USERNAME },
    create: { email: USERNAME, name: NAME, passwordHash, role: "DEV" },
    update: { name: NAME, passwordHash, role: "DEV" },
  });

  console.log(`พร้อมใช้งาน: ${user.email} (role=${user.role})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
