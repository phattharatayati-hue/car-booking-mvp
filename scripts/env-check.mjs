/**
 * ตรวจว่าตัวแปรสภาพแวดล้อมตัวไหน "ใช้ได้จริง" และไฟล์ไหนชนะ
 *
 * วิธีใช้   node scripts/env-check.mjs
 *
 * สคริปต์นี้ไม่พิมพ์ค่าของตัวแปรออกมาเลย
 * แสดงแค่ชื่อตัวแปร ความยาว และคำวินิจฉัย จะก๊อปให้ใครดูก็ปลอดภัย
 *
 * ลำดับความสำคัญของ Next.js (บนลงล่าง — บนชนะ)
 *   1. ตัวแปรของระบบปฏิบัติการ
 *   2. .env.local
 *   3. .env.development (ตอน next dev)
 *   4. .env
 */
import { readFileSync, existsSync } from "node:fs";

const FILES = [".env.local", ".env.development", ".env"];

/** ค่าที่ "มีอยู่แต่ใช้ไม่ได้" — vercel env pull ปิดค่าของตัวแปร Sensitive ไว้แบบนี้ */
const PLACEHOLDERS = ["[SENSITIVE]", "[REDACTED]", "undefined", "null", ""];

function parse(path) {
  if (!existsSync(path)) return null;
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (/^\s*#/.test(line)) continue;
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
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

const parsed = {};
for (const f of FILES) parsed[f] = parse(f);

console.log("ไฟล์ที่พบ");
for (const f of FILES) {
  const p = parsed[f];
  console.log(`  ${f.padEnd(18)} ${p ? `มี (${Object.keys(p).length} ตัวแปร)` : "ไม่มี"}`);
}
console.log();

/** รวบรวมชื่อตัวแปรทั้งหมดที่เจอ */
const keys = new Set();
for (const f of FILES) for (const k of Object.keys(parsed[f] ?? {})) keys.add(k);

function verdict(v) {
  if (v === undefined) return null;
  if (PLACEHOLDERS.includes(v)) return { bad: true, why: v === "" ? "ค่าว่าง" : `ค่าถูกปิดไว้ "${v}"` };
  return { bad: false, why: `ใช้ได้ (${v.length} ตัวอักษร)` };
}

const broken = [];
console.log("ตัวแปรแต่ละตัว — ★ คือค่าที่เว็บใช้จริง");
console.log();

for (const key of [...keys].sort()) {
  // ระบบปฏิบัติการชนะทุกไฟล์
  const fromOs = process.env[key];
  const rows = [];

  if (fromOs !== undefined && !FILES.some((f) => parsed[f]?.[key] === fromOs)) {
    rows.push(["ระบบปฏิบัติการ", verdict(fromOs)]);
  }
  for (const f of FILES) {
    const v = parsed[f]?.[key];
    if (v !== undefined) rows.push([f, verdict(v)]);
  }

  console.log(`  ${key}`);
  let winnerTaken = false;
  for (const [where, vd] of rows) {
    const star = winnerTaken ? "  " : "★ ";
    if (!winnerTaken && vd.bad) broken.push({ key, where, why: vd.why });
    winnerTaken = true;
    console.log(`    ${star}${where.padEnd(18)} ${vd.bad ? "✕ " : "✓ "}${vd.why}`);
  }
  console.log();
}

if (broken.length === 0) {
  console.log("สรุป — ทุกตัวแปรที่เว็บใช้จริงมีค่าที่ใช้ได้ ไม่มีตัวไหนถูกปิดค่าไว้");
} else {
  console.log("สรุป — ตัวแปรที่เว็บใช้จริงแต่ใช้งานไม่ได้");
  for (const b of broken) console.log(`  ✕ ${b.key}  (จาก ${b.where} — ${b.why})`);
  console.log();
  console.log("วิธีแก้");
  console.log("  ลบบรรทัดของตัวแปรเหล่านี้ออกจากไฟล์ที่มีดาว ★");
  console.log("  แล้วเว็บจะไปหยิบค่าจากไฟล์ถัดไปที่มีค่าจริงให้เอง");
  console.log("  (ถ้าไฟล์ถัดไปไม่มีค่าจริงด้วย ต้องไปคัดลอกจาก Vercel มาใส่ .env เอง)");
}
