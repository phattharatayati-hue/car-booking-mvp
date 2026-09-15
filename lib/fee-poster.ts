import { artAt, BRAND_ART_PALETTE, type ArtPalette } from "@/lib/fee-art";
import type { FeeItem } from "@/lib/fees";

/**
 * โปสเตอร์ค่าปรับ — วาดเป็น SVG จากรายการที่แอดมินแก้ในหลังบ้าน
 *
 * แนว "ใบแจ้งอัตรา": หัวเอกสารสีเขียว เส้นทอง จุดไข่ปลาลากไปหายอด
 * ความสูงยืดตามจำนวนรายการ เพิ่ม-ลบรายการแล้วไม่ต้องแก้โค้ด
 *
 * มีสองฉบับ เพราะฉบับเดียวใช้ได้ไม่ดีทั้งสองที่:
 *   print  — กว้าง 600 ยอดชิดขวามีจุดไข่ปลาลากไปหา เหมาะกับจอใหญ่และงานพิมพ์
 *   mobile — กว้าง 380 เรียงลงแนวตั้ง ตัวใหญ่ขึ้น เพราะถ้าเอาฉบับ 600 ไปบีบลงจอมือถือ
 *            ตัวหนังสือจะเหลือราว 9px ซึ่งเล็กเกินอ่าน
 *
 * ใช้ 3 ที่: ฝังในหน้า /fees (ทั้งสองฉบับ) · ไฟล์ /fees-poster.svg · รูป /fees-poster.png
 */

export type PosterVariant = "print" | "mobile";

const SANS = '"IBM Plex Sans Thai","Noto Sans Thai",Tahoma,sans-serif';
const DISPLAY = 'Anuphan,"IBM Plex Sans Thai","Noto Sans Thai",Tahoma,sans-serif';

/** สีของโปสเตอร์ตอนเป็นไฟล์แจก — ค่าคงที่ ไม่ขึ้นกับธีมของใคร */
const FIXED = {
  paper: "#ffffff",
  emerald: "#1e5841",
  gold: "#b08d57",
  goldText: "#7a5f2e",
  ivory: "#f5f0e1",
  pale: "#d9c29b",
  ink: "#17251f",
  sub: "#55655d",
  faint: "#8b9a93",
  hair: "#e8e2d4",
  leader: "#c9c0ac",
  alert: "#9a3412",
};

/**
 * สีแบบอ้างตัวแปร CSS — ใช้ตอนฝังในหน้าเว็บ
 *
 * SVG ที่ฝังในหน้า (ไม่ใช่ <img>) รับ CSS ของหน้าได้ จึงสลับโหมดมืด-สว่างตามเว็บได้
 * ค่าหลังคอมมาคือค่าสำรอง ซึ่งเป็นชุดเดียวกับไฟล์แจก
 * ตัวแปรจริงตั้งไว้ใน globals.css ใต้ .fee-poster
 */
const THEMED = {
  paper: "var(--poster-paper, #ffffff)",
  emerald: "var(--poster-emerald, #1e5841)",
  gold: "var(--poster-gold, #b08d57)",
  goldText: "var(--poster-gold-text, #7a5f2e)",
  ivory: "var(--poster-ivory, #f5f0e1)",
  pale: "var(--poster-pale, #d9c29b)",
  ink: "var(--poster-ink, #17251f)",
  sub: "var(--poster-sub, #55655d)",
  faint: "var(--poster-faint, #8b9a93)",
  hair: "var(--poster-hair, #e8e2d4)",
  leader: "var(--poster-leader, #c9c0ac)",
  alert: "var(--poster-alert, #9a3412)",
};

/** พาเลตต์ของภาพประกอบเวอร์ชันอ้างตัวแปร CSS */
const THEMED_ART: ArtPalette = {
  ink: "var(--poster-art-ink, #17251f)",
  body: "var(--poster-emerald, #1e5841)",
  accent: "var(--poster-gold, #b08d57)",
  light: "var(--poster-art-light, #f5f0e1)",
  alert: "var(--poster-alert, #9a3412)",
  soft: "var(--poster-pale, #d9c29b)",
};

/* ---- ระยะของแต่ละฉบับ ---- */
const PRINT = { w: 600, rowH: 61, firstBaseline: 318, art: 52, pad: 44 };
const MOBILE = { w: 380, rowH: 80, rowsTop: 226, art: 48, pad: 16 };

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** ยอดที่ไม่ใช่จำนวนเงิน เช่น "ไม่คืนเงินทุกกรณี" ให้เป็นสีแดงเพื่อไม่ให้อ่านผ่าน */
function amountColor(amount: string, alert: string, ink: string): string {
  return amount.includes("ไม่คืน") ? alert : ink;
}

export type FeePosterInput = {
  items: FeeItem[];
  /** เงินประกันความเสียหายจากตั้งค่าระบบ */
  securityDeposit: number;
  siteUrl: string;
  /** CSS เพิ่มเติม เช่น @font-face ตอนส่งเป็นไฟล์เดี่ยว — ไม่ใส่ก็ได้ */
  fontCss?: string;
  /** true = ใช้ตัวแปร CSS เพื่อให้สลับโหมดมืดตามเว็บได้ (สำหรับฝังในหน้าเท่านั้น) */
  themed?: boolean;
  /** ฉบับไหน — ไม่ระบุคือฉบับพิมพ์ */
  variant?: PosterVariant;
};

/** ความสูงของโปสเตอร์เมื่อมีรายการ n รายการ */
export function feePosterHeight(n: number, variant: PosterVariant = "print"): number {
  if (variant === "mobile") {
    return MOBILE.rowsTop + Math.max(0, n) * MOBILE.rowH + 76;
  }
  const lastNote = PRINT.firstBaseline + Math.max(0, n - 1) * PRINT.rowH + 18;
  return lastNote + 100;
}

export function buildFeePosterSvg({
  items,
  securityDeposit,
  siteUrl,
  fontCss,
  themed,
  variant = "print",
}: FeePosterInput): string {
  const C = themed ? THEMED : FIXED;
  const art = themed ? THEMED_ART : BRAND_ART_PALETTE;
  const host = siteUrl.replace(/^https?:\/\//, "");
  const body =
    variant === "mobile"
      ? mobileBody(items, securityDeposit, host, C, art)
      : printBody(items, securityDeposit, host, C, art);

  const W = variant === "mobile" ? MOBILE.w : PRINT.w;
  const H = feePosterHeight(items.length, variant);
  const style = fontCss ? `<style>${fontCss}</style>` : "";

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" ` +
    `role="img" aria-label="อัตราค่าปรับและค่าบริการเพิ่มเติม">${style}${body}</svg>`
  );
}

/* ---------------- ฉบับพิมพ์ · กว้าง 600 ---------------- */
function printBody(
  items: FeeItem[],
  securityDeposit: number,
  host: string,
  C: typeof FIXED,
  art: ArtPalette
): string {
  const W = PRINT.w;
  const H = feePosterHeight(items.length, "print");
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
  o += `<text x="64" y="191" font-family='${SANS}' font-size="12.5" fill="${C.sub}">เงินประกันความเสียหาย ชำระวันรับรถ</text>`;
  o += `<text x="64" y="215" font-family='${SANS}' font-size="13" fill="${C.ink}">คืนเต็มจำนวนเมื่อคืนรถเรียบร้อย</text>`;
  o += `<text x="536" y="207" text-anchor="end" font-family='${DISPLAY}' font-size="27" font-weight="700" fill="${C.emerald}">${securityDeposit.toLocaleString()} บาท</text>`;

  // หัวตาราง
  o += `<text x="44" y="272" font-family='${SANS}' font-size="11" letter-spacing="2.2" fill="${C.goldText}">รายการ</text>`;
  o += `<text x="556" y="272" text-anchor="end" font-family='${SANS}' font-size="11" letter-spacing="2.2" fill="${C.goldText}">อัตรา</text>`;
  o += `<line x1="44" y1="283" x2="556" y2="283" stroke="${C.gold}" stroke-width="1.2"/>`;

  let y = PRINT.firstBaseline;
  items.forEach((f, i) => {
    if (i > 0) {
      o += `<line x1="44" y1="${y - 31}" x2="556" y2="${y - 31}" stroke="${C.hair}" stroke-width="1"/>`;
    }
    o += artAt(f.icon, 44, y - 30, PRINT.art, art);
    if (f.highlight) {
      o += `<rect x="36" y="${y - 24}" width="3" height="38" fill="${C.gold}"/>`;
    }
    const x = 110;
    o += `<text x="${x}" y="${y}" font-family='${SANS}' font-size="15" font-weight="${f.highlight ? 600 : 400}" fill="${C.ink}">${esc(f.title)}</text>`;
    if (f.note) {
      o += `<text x="${x}" y="${y + 18}" font-family='${SANS}' font-size="11" fill="${C.faint}">${esc(f.note)}</text>`;
    }
    o += `<line x1="${x + 214}" y1="${y - 4}" x2="378" y2="${y - 4}" stroke="${C.leader}" stroke-width="1.4" stroke-dasharray="1 5" stroke-linecap="round"/>`;
    o += `<text x="556" y="${y}" text-anchor="end" font-family='${DISPLAY}' font-size="16.5" font-weight="700" fill="${amountColor(f.amount, C.alert, C.ink)}">${esc(f.amount)}</text>`;
    y += PRINT.rowH;
  });

  const ruleY = H - 64;
  o += `<line x1="44" y1="${ruleY}" x2="556" y2="${ruleY}" stroke="${C.gold}" stroke-width="1.2"/>`;
  o += `<text x="44" y="${ruleY + 22}" font-family='${SANS}' font-size="10.5" fill="${C.faint}">อัตราข้างต้นเป็นราคาเริ่มต้น อาจเปลี่ยนตามรุ่นรถและระดับความเสียหาย</text>`;
  o += `<text x="44" y="${ruleY + 38}" font-family='${SANS}' font-size="10.5" fill="${C.faint}">รายละเอียดทั้งหมด · ${esc(host)}/fees</text>`;
  return o;
}

/* ---------------- ฉบับมือถือ · กว้าง 380 ----------------
   ยอดไม่ได้ชิดขวาแบบฉบับพิมพ์ แต่วางไว้ใต้ชื่อรายการ
   เพราะบนความกว้างเท่านี้ ชื่อรายการยาว ๆ กับยอดจะชนกันแน่นอน
   และไม่มีจุดไข่ปลา เพราะระยะสั้นเกินกว่าจะช่วยให้สายตาลากตามได้ */
function mobileBody(
  items: FeeItem[],
  securityDeposit: number,
  host: string,
  C: typeof FIXED,
  art: ArtPalette
): string {
  const W = MOBILE.w;
  const H = feePosterHeight(items.length, "mobile");
  const P = MOBILE.pad;
  let o = `<rect width="${W}" height="${H}" fill="${C.paper}"/>`;

  // หัวเอกสาร
  o += `<rect x="0" y="0" width="${W}" height="108" fill="${C.emerald}"/>`;
  o += `<rect x="0" y="108" width="${W}" height="4" fill="${C.gold}"/>`;
  o += `<text x="${P}" y="40" font-family='${SANS}' font-size="10.5" letter-spacing="2.6" fill="${C.pale}">PHUPING CORPORATION</text>`;
  o += `<text x="${P}" y="72" font-family='${DISPLAY}' font-size="25" font-weight="700" fill="${C.ivory}">อัตราค่าปรับและค่าบริการ</text>`;
  o += `<text x="${P}" y="94" font-family='${SANS}' font-size="11.5" fill="${C.pale}">เรียกเก็บเฉพาะเมื่อเกิดเหตุจริง</text>`;

  // แถบเงินประกัน
  o += `<rect x="${P}" y="130" width="${W - P * 2}" height="72" fill="${C.ivory}"/>`;
  o += `<rect x="${P}" y="130" width="4" height="72" fill="${C.gold}"/>`;
  o += `<text x="${P + 16}" y="154" font-family='${SANS}' font-size="11.5" fill="${C.sub}">เงินประกันความเสียหาย ชำระวันรับรถ</text>`;
  o += `<text x="${P + 16}" y="182" font-family='${DISPLAY}' font-size="23" font-weight="700" fill="${C.emerald}">${securityDeposit.toLocaleString()} บาท</text>`;
  o += `<text x="${W - P - 16}" y="182" text-anchor="end" font-family='${SANS}' font-size="11" fill="${C.sub}">คืนเต็มจำนวน</text>`;

  let top = MOBILE.rowsTop;
  items.forEach((f, i) => {
    if (i > 0) {
      o += `<line x1="${P}" y1="${top}" x2="${W - P}" y2="${top}" stroke="${C.hair}" stroke-width="1"/>`;
    }
    o += artAt(f.icon, P - 2, top + 14, MOBILE.art, art);
    if (f.highlight) {
      // ขีดทองอยู่ซ้ายสุดเหมือนฉบับพิมพ์ จะได้อ่านเป็นภาษาเดียวกันทั้งสองฉบับ
      o += `<rect x="4" y="${top + 14}" width="3" height="${MOBILE.art}" fill="${C.gold}"/>`;
    }
    const x = P + 58;
    o += `<text x="${x}" y="${top + 30}" font-family='${SANS}' font-size="14.5" font-weight="${f.highlight ? 600 : 400}" fill="${C.ink}">${esc(f.title)}</text>`;
    o += `<text x="${x}" y="${top + 54}" font-family='${DISPLAY}' font-size="18" font-weight="700" fill="${amountColor(f.amount, C.alert, C.ink)}">${esc(f.amount)}</text>`;
    if (f.note) {
      o += `<text x="${x}" y="${top + 72}" font-family='${SANS}' font-size="10.5" fill="${C.faint}">${esc(f.note)}</text>`;
    }
    top += MOBILE.rowH;
  });

  const ruleY = H - 52;
  o += `<line x1="${P}" y1="${ruleY}" x2="${W - P}" y2="${ruleY}" stroke="${C.gold}" stroke-width="1.2"/>`;
  o += `<text x="${P}" y="${ruleY + 20}" font-family='${SANS}' font-size="10" fill="${C.faint}">เป็นราคาเริ่มต้น อาจเปลี่ยนตามรุ่นรถและระดับความเสียหาย</text>`;
  o += `<text x="${P}" y="${ruleY + 35}" font-family='${SANS}' font-size="10" fill="${C.faint}">${esc(host)}/fees</text>`;
  return o;
}
