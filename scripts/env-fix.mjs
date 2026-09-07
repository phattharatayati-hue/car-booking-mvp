/**
 * ปิดตัวแปรใน .env.local ที่ "มีอยู่แต่ใช้ไม่ได้" ออกให้
 *
 * ปัญหาที่แก้
 *   vercel env pull จะปิดค่าของตัวแปรที่ตั้งเป็น Sensitive ไว้
 *   เขียนลงไฟล์เป็นข้อความว่า [SENSITIVE] แทนค่าจริง
 *   และเพราะ Next.js ให้ .env.local ชนะ .env
 *   เว็บจึงหยิบ [SENSITIVE] ไปใช้ แม้ .env จะมีค่าที่ถูกต้องอยู่แล้ว
 *
 * สคริปต์นี้ทำอะไร
 *   1. สำรองไฟล์เดิมไว้เป็น .env.local.bak ก่อนแก้ทุกครั้ง
 *   2. เติม # หน้าบรรทัดที่ค่าใช้ไม่ได้ (ปิด ไม่ได้ลบ ย้อนดูได้)
 *   3. บอกว่าปิดตัวแปรอะไรไปบ้าง — พิมพ์แค่ชื่อ ไม่พิมพ์ค่า
 *   เมื่อบรรทัดถูกปิด Next.js จะไปหยิบค่าจาก .env ให้เอง
 *
 * วิธีใช้
 *   node scripts/env-fix.mjs          ← ดูก่อนว่าจะแก้อะไร ยังไม่เขียนไฟล์
 *   node scripts/env-fix.mjs --write  ← แก้จริง
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";

const FILE = ".env.local";
const WRITE = process.argv.includes("--write");

/** ค่าที่ถือว่าใช้ไม่ได้ */
const BAD = ["[SENSITIVE]", "[REDACTED]", "undefined", "null", ""];

if (!existsSync(FILE)) {
  console.log(`ไม่พบไฟล์ ${FILE} — ไม่มีอะไรต้องแก้`);
  process.exit(0);
}

const original = readFileSync(FILE, "utf8");
const eol = original.includes("\r\n") ? "\r\n" : "\n";
const lines = original.split(/\r?\n/);

const closed = [];
const kept = [];

const out = lines.map((line) => {
  if (/^\s*#/.test(line) || line.trim() === "") return line;

  const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!m) return line;

  const key = m[1];
  let v = m[2].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }

  if (BAD.includes(v)) {
    closed.push({ key, value: v === "" ? "ค่าว่าง" : v });
    return `# ปิดโดย scripts/env-fix.mjs — ค่าเดิมใช้ไม่ได้ ให้ไปใช้ค่าจาก .env แทน${eol}# ${line}`;
  }

  kept.push(key);
  return line;
});

console.log(`ไฟล์ ${FILE} — มี ${kept.length + closed.length} ตัวแปร`);
console.log();

if (closed.length === 0) {
  console.log("ไม่มีตัวแปรไหนที่ค่าใช้ไม่ได้ — ไม่ต้องแก้อะไร");
  console.log("ถ้าเว็บยังต่อฐานข้อมูลไม่ได้ ให้รัน node scripts/db-check.mjs อีกครั้ง");
  process.exit(0);
}

console.log(`ตัวแปรที่จะปิด (${closed.length} ตัว) — เพราะค่าใช้ไม่ได้`);
for (const c of closed) console.log(`  ✕ ${c.key.padEnd(30)} ${c.value}`);
console.log();
console.log(`ตัวแปรที่คงไว้ (${kept.length} ตัว) — ค่าใช้ได้ปกติ`);
for (const k of kept) console.log(`  ✓ ${k}`);
console.log();

if (!WRITE) {
  console.log("นี่เป็นการดูก่อนเท่านั้น ยังไม่ได้แก้ไฟล์");
  console.log("ถ้าถูกต้องแล้ว รันอีกครั้งด้วย   node scripts/env-fix.mjs --write");
  process.exit(0);
}

copyFileSync(FILE, FILE + ".bak");
writeFileSync(FILE, out.join(eol), "utf8");

console.log(`สำรองไฟล์เดิมไว้ที่ ${FILE}.bak แล้ว`);
console.log(`แก้ ${FILE} เรียบร้อย`);
console.log();
console.log("ขั้นต่อไป");
console.log("  1. node scripts/db-check.mjs     ← ยืนยันว่าต่อฐานข้อมูลได้");
console.log("  2. npm run dev                   ← เปิดเว็บดู");
console.log();
console.log("ถ้าตัวแปรที่ถูกปิดไม่มีค่าจริงอยู่ใน .env ด้วย");
console.log("ต้องไปคัดลอกค่าจาก Vercel → Settings → Environment Variables");
console.log("มาใส่ในไฟล์ .env (ใส่ .env ไม่ใช่ .env.local เพื่อไม่ให้ถูกทับอีกครั้งหน้า)");
