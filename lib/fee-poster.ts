import { artAt, BRAND_ART_PALETTE } from "@/lib/fee-art";
import type { FeeItem } from "@/lib/fees";

/**
 * โปสเตอร์ค่าปรับ — วาดเป็น SVG จากรายการที่แอดมินแก้ในหลังบ้าน
 *
 * แนว "ใบแจ้งอัตรา": หัวเอกสารสีเขียว เส้นทอง จุดไข่ปลาลากไปหายอด
 * ความสูงยืดตามจำนวนรายการ เพิ่ม-ลบรายการแล้วไม่ต้องแก้โค้ด
 *
 * ใช้ 2 ที่: ฝังในหน้า /fees และส่งเป็นไฟล์ที่ /fees-poster.svg
 */

const W = 600;
const ROW_H = 61;
const FIRST_BASELINE = 318;
const ART_SIZE = 52;

const SANS = '"IBM Plex Sans Thai","Noto Sans Thai",Tahoma,sans-serif';
const DISPLAY = 'Anuphan,"IBM Plex Sans Thai","Noto Sans Thai",Tahoma,sans-serif';

const C = {
  paper: "#ffffff",
  emerald: "#1e5841",
  gold: "#b08d57",
  goldText: "#7a5f2e",
  ivory: "#f5f0e1",
  pale: "#d9c29b",
  ink: "#17251f",
  faint: "#8b9a93",
  hair: "#e8e2d4",
  leader: "#c9c0ac",
  alert: "#9a3412",
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** ยอดที่ไม่ใช่จำนวนเงิน เช่น "ไม่คืนเงินทุกกรณี" ให้เป็นสีแดงเพื่อไม่ให้อ่านผ่าน */
function amountColor(amount: string): string {
  return amount.includes("ไม่คืน") ? C.alert : C.ink;
}

export type FeePosterInput = {
  items: FeeItem[];
  /** เงินประกันความเสียหายจากตั้งค่าระบบ */
  securityDeposit: number;
  siteUrl: string;
  /** CSS เพิ่มเติม เช่น @font-face ตอนส่งเป็นไฟล์เดี่ยว — ไม่ใส่ก็ได้ */
  fontCss?: string;
};

/** ความสูงของโปสเตอร์เมื่อมีรายการ n รายการ */
export function feePosterHeight(n: number): number {
  const lastNote = FIRST_BASELINE + Math.max(0, n - 1) * ROW_H + 18;
  return lastNote + 100;
}

export function buildFeePosterSvg({
  items,
  securityDeposit,
  siteUrl,
  fontCss,
}: FeePosterInput): string {
  const H = feePosterHeight(items.length);
  const host = siteUrl.replace(/^https?:\/\//, "");

  let o = `<rect width="${W}" height="${H}" fill="${C.paper}"/>`;

  // หัวเอกสาร
  o += `<rect x="0" y="0" width="${W}" height="132" fill="${C.emerald}"/>`;
  o += `<rect x="0" y="132" width="${W}" height="4" fill="${C.gold}"/>`;
  o += `<text x="44" y="50" font-family='${SANS}' font-size="12" letter-spacing="3.4" fill="${C.pale}">PHUPING CORPORATION</text>`;
  o += `<text x="44" y="88" font-family='${DISPLAY}' font-size="31" font-weight="700" fill="${C.ivory}">อัตราค่าปรับและค่าบริการ</text>`;
  o += `<text x="44" y="113" font-family='${SANS}' font-size="13" fill="${C.pale}">เรียกเก็บเฉพาะเมื่อเกิดเหตุจริง — คืนรถเรียบร้อยไม่มีค่าใช้จ่ายเหล่านี้</text>`;

  // แถบเงินประกัน
  o += `<rect x="44" y="164" width="512" height="66" fill="${C.ivory}"/>`;
  o += `<rect x="44" y="164" width="4" height="66" fill="${C.gold}"/>`;
  o += `<text x="64" y="191" font-family='${SANS}' font-size="12.5" fill="#55655d">เงินประกันความเสียหาย ชำระวันรับรถ</text>`;
  o += `<text x="64" y="215" font-family='${SANS}' font-size="13" fill="${C.ink}">คืนเต็มจำนวนเมื่อคืนรถเรียบร้อย</text>`;
  o += `<text x="536" y="207" text-anchor="end" font-family='${DISPLAY}' font-size="27" font-weight="700" fill="${C.emerald}">${securityDeposit.toLocaleString()} บาท</text>`;

  // หัวตาราง
  o += `<text x="44" y="272" font-family='${SANS}' font-size="11" letter-spacing="2.2" fill="${C.goldText}">รายการ</text>`;
  o += `<text x="556" y="272" text-anchor="end" font-family='${SANS}' font-size="11" letter-spacing="2.2" fill="${C.goldText}">อัตรา</text>`;
  o += `<line x1="44" y1="283" x2="556" y2="283" stroke="${C.gold}" stroke-width="1.2"/>`;

  // แถวรายการ
  let y = FIRST_BASELINE;
  items.forEach((f, i) => {
    if (i > 0) {
      o += `<line x1="44" y1="${y - 31}" x2="556" y2="${y - 31}" stroke="${C.hair}" stroke-width="1"/>`;
    }
    o += artAt(f.icon, 44, y - 30, ART_SIZE, BRAND_ART_PALETTE);
    if (f.highlight) {
      o += `<rect x="36" y="${y - 24}" width="3" height="38" fill="${C.gold}"/>`;
    }
    const x = 110;
    o += `<text x="${x}" y="${y}" font-family='${SANS}' font-size="15" font-weight="${f.highlight ? 600 : 400}" fill="${C.ink}">${esc(f.title)}</text>`;
    if (f.note) {
      o += `<text x="${x}" y="${y + 18}" font-family='${SANS}' font-size="11" fill="${C.faint}">${esc(f.note)}</text>`;
    }
    o += `<line x1="${x + 214}" y1="${y - 4}" x2="378" y2="${y - 4}" stroke="${C.leader}" stroke-width="1.4" stroke-dasharray="1 5" stroke-linecap="round"/>`;
    o += `<text x="556" y="${y}" text-anchor="end" font-family='${DISPLAY}' font-size="16.5" font-weight="700" fill="${amountColor(f.amount)}">${esc(f.amount)}</text>`;
    y += ROW_H;
  });

  // ท้ายเอกสาร
  const ruleY = H - 64;
  o += `<line x1="44" y1="${ruleY}" x2="556" y2="${ruleY}" stroke="${C.gold}" stroke-width="1.2"/>`;
  o += `<text x="44" y="${ruleY + 22}" font-family='${SANS}' font-size="10.5" fill="${C.faint}">อัตราข้างต้นเป็นราคาเริ่มต้น อาจเปลี่ยนตามรุ่นรถและระดับความเสียหาย</text>`;
  o += `<text x="44" y="${ruleY + 38}" font-family='${SANS}' font-size="10.5" fill="${C.faint}">รายละเอียดทั้งหมด · ${esc(host)}/fees</text>`;

  const style = fontCss ? `<style>${fontCss}</style>` : "";

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" ` +
    `role="img" aria-label="อัตราค่าปรับและค่าบริการเพิ่มเติม">${style}${o}</svg>`
  );
}
