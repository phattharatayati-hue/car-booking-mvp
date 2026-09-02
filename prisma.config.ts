import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI (db push / migrate / studio) ใช้ Rust engine ซึ่ง
 *   - ไม่รองรับ channel_binding=require ที่ Neon ใส่มาใน DATABASE_URL → ขึ้น P1001
 *   - ทำ DDL ผ่าน PgBouncer (host ที่มี -pooler) ไม่ได้
 * จึงต้องใช้ DATABASE_URL_UNPOOLED ที่ Neon ให้มาคู่กัน (host ตรง ไม่มี channel_binding)
 * ส่วนตัวเว็บแอปยังใช้ DATABASE_URL ผ่าน pooler ตามปกติ
 */
const cliUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: cliUrl,
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
