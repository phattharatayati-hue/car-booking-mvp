/**
 * ตรวจการต่อฐานข้อมูล — ใช้เวลาเว็บขึ้น P1001 / DatabaseNotReachable
 *
 * วิธีใช้   node scripts/db-check.mjs
 *
 * สคริปต์นี้ตั้งใจ "ไม่พิมพ์รหัสผ่าน" ออกหน้าจอ
 * แสดงแค่โฮสต์ พอร์ต ชื่อฐานข้อมูล และพารามิเตอร์ท้าย URL
 * จะก๊อปผลไปให้ใครดูก็ปลอดภัย
 */
import { readFileSync, existsSync } from "node:fs";
import net from "node:net";
import { Client } from "pg";

/** อ่านไฟล์ .env แบบง่าย พอสำหรับงานตรวจ */
function readEnvFile(path) {
  if (!existsSync(path)) return null;
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

// ตัวเว็บ (next dev) อ่าน .env.local ก่อน แล้วจึง .env
const local = readEnvFile(".env.local");
const base = readEnvFile(".env");

console.log("ไฟล์ที่พบ");
console.log("  .env.local :", local ? "มี" : "ไม่มี");
console.log("  .env       :", base ? "มี" : "ไม่มี");
console.log();

const KEYS = ["DATABASE_URL", "DATABASE_URL_UNPOOLED"];

/**
 * จุดที่คนพลาดกันบ่อยที่สุด
 *
 * Next.js ให้ตัวแปรของ "ระบบปฏิบัติการ" ชนะไฟล์ .env.local เสมอ
 * ถ้าเครื่องมี DATABASE_URL ตั้งไว้ในระบบ (เช่นเคยตั้งไว้ตอนลองอย่างอื่น
 * หรือ Windows จำไว้จาก setx) ค่าในไฟล์จะไม่ถูกใช้เลย
 * และเว็บจะพยายามต่อโฮสต์ผิดตัวโดยที่ไฟล์ดูถูกต้องทุกอย่าง
 */
console.log("── ตัวแปรจากระบบปฏิบัติการ (ชนะไฟล์ .env เสมอ) ──");
let osOverride = false;
for (const key of KEYS) {
  const raw = process.env[key];
  if (!raw) {
    console.log(`  ${key} : ไม่ได้ตั้งไว้ในระบบ (ดี — เว็บจะใช้ค่าจากไฟล์)`);
    continue;
  }
  osOverride = true;
  let host = "(อ่านไม่ออก)";
  try {
    host = new URL(raw).hostname;
  } catch {
    host = `ไม่ใช่ URL — ขึ้นต้นด้วย "${raw.slice(0, 20)}"`;
  }
  console.log(`  ${key} : ★ ตั้งไว้ในระบบ → โฮสต์ ${host}`);
}
if (osOverride) {
  console.log();
  console.log("  ⚠ เจอตัวแปรในระบบปฏิบัติการ — นี่คือค่าที่เว็บใช้จริง ไม่ใช่ค่าในไฟล์");
  console.log("    ถ้าโฮสต์ข้างบนไม่ใช่โฮสต์ของ Neon ให้ลบตัวแปรนั้นออกจากระบบ");
  console.log("    วิธีลบ (PowerShell)  :  [Environment]::SetEnvironmentVariable('DATABASE_URL',$null,'User')");
  console.log("    แล้วปิดหน้าต่าง PowerShell ทั้งหมด เปิดใหม่ ค่อยรัน npm run dev");
}
console.log();

function describe(raw) {
  if (!raw) return { ok: false, why: "ไม่มีค่า" };
  if (!/^postgres(ql)?:\/\//.test(raw)) {
    return {
      ok: false,
      why: `ไม่ได้ขึ้นต้นด้วย postgres:// — ค่ายาว ${raw.length} ตัวอักษร ขึ้นต้นด้วย "${raw.slice(0, 12)}"`,
    };
  }
  let u;
  try {
    u = new URL(raw);
  } catch (e) {
    return { ok: false, why: "รูปแบบ URL ไม่ถูกต้อง: " + e.message };
  }
  return {
    ok: true,
    host: u.hostname,
    port: u.port || "5432",
    db: u.pathname.replace(/^\//, ""),
    user: u.username ? `${u.username.slice(0, 3)}… (${u.username.length} ตัว)` : "ไม่มี",
    hasPassword: u.password ? `มี (${u.password.length} ตัว)` : "ไม่มี",
    params: u.searchParams.toString() || "(ไม่มี)",
    pooler: u.hostname.includes("-pooler"),
    channelBinding: u.searchParams.get("channel_binding"),
    url: raw,
  };
}

const targets = [];
for (const [name, env] of [
  [".env.local", local],
  [".env", base],
]) {
  if (!env) continue;
  for (const key of KEYS) {
    if (!env[key]) continue;
    const info = describe(env[key]);
    console.log(`${name} → ${key}`);
    if (!info.ok) {
      console.log("  ✕ ผิด:", info.why);
      console.log();
      continue;
    }
    console.log("  โฮสต์          :", info.host);
    console.log("  พอร์ต          :", info.port);
    console.log("  ฐานข้อมูล      :", info.db);
    console.log("  ผู้ใช้          :", info.user);
    console.log("  รหัสผ่าน       :", info.hasPassword);
    console.log("  พารามิเตอร์    :", info.params);
    if (info.pooler) console.log("  หมายเหตุ       : เป็นโฮสต์ pooler (PgBouncer)");
    if (info.channelBinding)
      console.log("  หมายเหตุ       : มี channel_binding=" + info.channelBinding);
    console.log();
    targets.push({ label: `${name} → ${key}`, ...info });
  }
}

if (targets.length === 0) {
  console.log("ไม่พบ DATABASE_URL ที่ใช้ได้เลย — นี่คือสาเหตุของ P1001");
  process.exit(1);
}

/** ลองต่อ TCP เปล่าๆ ก่อน แยกให้ออกว่าปัญหาอยู่ที่เครือข่ายหรือที่การยืนยันตัวตน */
function tcpTest(host, port, ms = 8000) {
  return new Promise((resolve) => {
    const s = net.createConnection({ host, port: Number(port) });
    const done = (r) => {
      s.destroy();
      resolve(r);
    };
    s.setTimeout(ms);
    s.on("connect", () => done("ต่อได้"));
    s.on("timeout", () => done("หมดเวลา"));
    s.on("error", (e) => done("ต่อไม่ได้: " + e.code));
  });
}

for (const t of targets) {
  console.log("── ทดสอบ", t.label, "──");
  console.log("  TCP :", await tcpTest(t.host, t.port));

  const client = new Client({
    connectionString: t.url,
    connectionTimeoutMillis: 15000,
  });
  try {
    await client.connect();
    const r = await client.query(
      "select current_database() as db, (select count(*) from information_schema.tables where table_schema='public') as tables"
    );
    console.log(
      `  SQL : ต่อได้ · ฐานข้อมูล ${r.rows[0].db} · มี ${r.rows[0].tables} ตารางใน public`
    );
    // เช็คว่าตารางใหม่จาก db:push มาแล้วจริง
    const audit = await client.query(
      "select count(*)::int as n from information_schema.tables where table_schema='public' and table_name in ('AuditLog','HandoffPhoto')"
    );
    console.log(
      `  ตารางใหม่ : พบ ${audit.rows[0].n}/2 (AuditLog, HandoffPhoto)` +
        (audit.rows[0].n < 2 ? " ← ยังไม่ได้รัน npm run db:push" : "")
    );
  } catch (e) {
    console.log("  SQL : ต่อไม่ได้ —", e.code || "", e.message);
  } finally {
    await client.end().catch(() => {});
  }
  console.log();
}

console.log("อ่านผลอย่างไร");
console.log("  TCP ต่อได้ แต่ SQL ต่อไม่ได้  → ปัญหาอยู่ที่รหัสผ่านหรือพารามิเตอร์ท้าย URL");
console.log("  TCP ต่อไม่ได้                 → ปัญหาอยู่ที่เครือข่าย หรือ Neon ปิดเครื่องอยู่");
console.log("  ทั้งสองต่อได้ แต่เว็บยัง P1001 → ค่าใน .env.local ไม่ตรงกับที่เว็บใช้ ลองปิด npm run dev แล้วเปิดใหม่");
