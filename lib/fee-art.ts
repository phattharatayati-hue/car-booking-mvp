/**
 * ภาพประกอบการ์ตูนประจำหัวข้อค่าปรับ — วาดด้วยรูปทรงพื้นฐานล้วน ไม่มีไฟล์รูปภายนอก
 *
 * ทุกตัววาดในกรอบ 64x64 แล้วย่อ-ขยายตอนใช้ จึงคมทุกขนาดและไฟล์เล็กมาก
 * คืนค่าเป็นสตริง SVG ไม่ใช่ JSX เพราะต้องใช้ทั้งใน React และใน route ที่ส่งไฟล์ .svg ดิบ
 *
 * สีรับมาจากพาเลตต์ที่ส่งเข้ามา ไม่ได้ฝังตายในแต่ละภาพ
 * เปลี่ยนโทนแบรนด์ทีเดียวเปลี่ยนครบทุกตัว
 */

export type ArtPalette = {
  ink: string;
  body: string;
  accent: string;
  light: string;
  alert: string;
  soft: string;
};

/** โทนแบรนด์ที่บริษัทส่งมา (ดู BRAND-COLORS.md) */
export const BRAND_ART_PALETTE: ArtPalette = {
  ink: "#17251f",
  body: "#1e5841",
  accent: "#b08d57",
  light: "#f5f0e1",
  alert: "#9a3412",
  soft: "#d9c29b",
};

/* ภาพชุดนี้ไม่มีตัวอักษรเลยแม้แต่ตัวเดียว — ตั้งใจให้เป็นแบบนั้น
   เพราะต้องแปลงเป็น PNG ส่งในแชท LINE ด้วย ซึ่งตัวอักษรในภาพ
   จะกลายเป็นสี่เหลี่ยมถ้าเครื่องที่เรนเดอร์ไม่มีฟอนต์ไทย */

/** รถมองด้านข้าง — ใช้ซ้ำหลายภาพ จึงแยกออกมาเป็นชิ้นส่วน */
function carSide(p: ArtPalette, x: number, y: number, s: number, fill: string, flip: boolean) {
  const t = `translate(${x},${y}) scale(${flip ? -s : s},${s})`;
  return (
    `<g transform="${t}">` +
    `<path d="M2 26 Q2 21 7 21 L11 12 Q12.5 8.5 16.5 8.5 L31 8.5 Q35 8.5 36.5 12 L41 21 Q46 21 46 26 L46 30 Q46 33 43 33 L5 33 Q2 33 2 30 Z" fill="${fill}"/>` +
    `<path d="M14.5 13 L11.5 20.5 L22 20.5 L22 13 Z" fill="${p.light}"/>` +
    `<path d="M25 13 L25 20.5 L35.5 20.5 L32.5 13 Z" fill="${p.light}"/>` +
    `<circle cx="13" cy="33" r="6" fill="${p.ink}"/>` +
    `<circle cx="13" cy="33" r="2.4" fill="${p.light}"/>` +
    `<circle cx="35" cy="33" r="6" fill="${p.ink}"/>` +
    `<circle cx="35" cy="33" r="2.4" fill="${p.light}"/>` +
    `</g>`
  );
}

/** ดาวกระจายแบบการ์ตูน */
function burst(cx: number, cy: number, r: number, fill: string) {
  let d = "";
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * 2 * i) / 12 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.5;
    d += `${i === 0 ? "M" : "L"}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)} `;
  }
  return `<path d="${d}Z" fill="${fill}"/>`;
}

type ArtFn = (p: ArtPalette) => string;

const ART: Record<string, ArtFn> = {
  // รถชนกัน — ดาวกระจายตรงกลาง
  collision: (p) =>
    carSide(p, 1, 14, 0.62, p.body, false) +
    carSide(p, 63, 14, 0.62, p.accent, true) +
    burst(32, 30, 13, p.alert) +
    burst(32, 30, 7, "#ffffff") +
    `<path d="M29 25 L33 30 L29.5 30 L33.5 36" stroke="${p.alert}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,

  // บุหรี่ในรถ
  smoke: (p) =>
    `<g transform="rotate(-18 32 36)">` +
    `<rect x="12" y="32" width="34" height="9" rx="4.5" fill="${p.light}" stroke="${p.ink}" stroke-width="1.6"/>` +
    `<rect x="36" y="32" width="10" height="9" rx="4.5" fill="${p.accent}"/>` +
    `<circle cx="13" cy="36.5" r="4" fill="${p.alert}"/>` +
    `</g>` +
    `<path d="M20 24 q-5-5 0-9 t0-8" stroke="${p.body}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".85"/>` +
    `<path d="M29 21 q-4.5-4 0-7.5 t0-6" stroke="${p.body}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".55"/>`,

  // คราบยางมะตอย
  tar: (p) =>
    `<ellipse cx="32" cy="46" rx="24" ry="8" fill="${p.ink}"/>` +
    `<path d="M14 44 q4-14 12-14 t10 6 q6-2 9 4 t4 8 Z" fill="${p.ink}"/>` +
    `<circle cx="47" cy="22" r="4.5" fill="${p.ink}"/>` +
    `<circle cx="19" cy="24" r="3" fill="${p.ink}"/>` +
    `<ellipse cx="26" cy="41" rx="4" ry="2" fill="${p.light}" opacity=".35"/>`,

  // คราบสกปรกบนเบาะ
  dirty: (p) =>
    `<path d="M12 52 L12 22 Q12 15 20 15 L28 15 Q36 15 36 22 L36 42 L52 42 Q56 42 56 46 L56 52 Z" fill="${p.body}"/>` +
    `<rect x="16" y="20" width="16" height="4" rx="2" fill="${p.light}" opacity=".45"/>` +
    `<rect x="16" y="28" width="16" height="4" rx="2" fill="${p.light}" opacity=".45"/>` +
    `<path d="M38 44 q2-3 7-3 t7 3 q3 4 0 6 t-14 0 q-3-3 0-6 Z" fill="${p.alert}"/>` +
    `<path d="M40 40 q3-9 8-9 t7 7 q1 4-3 5" fill="${p.alert}" opacity=".9"/>` +
    `<circle cx="48" cy="26" r="3.4" fill="${p.alert}" opacity=".85"/>` +
    `<circle cx="54" cy="35" r="2.2" fill="${p.alert}" opacity=".7"/>`,

  // กุญแจหายทั้งชุด
  key: (p) =>
    `<rect x="14" y="14" width="22" height="30" rx="7" fill="${p.body}"/>` +
    `<circle cx="21" cy="23" r="3" fill="${p.light}"/>` +
    `<circle cx="29" cy="23" r="3" fill="${p.light}"/>` +
    `<rect x="19" y="31" width="12" height="4" rx="2" fill="${p.soft}"/>` +
    `<path d="M25 44 L25 52 L31 52 L31 48 L35 48 L35 44 Z" fill="${p.accent}"/>` +
    `<path d="M42 30 q0-7 6-7 t6 6 q0 4-5 5.5 v3" stroke="${p.accent}" stroke-width="3.4" fill="none" stroke-linecap="round"/>` +
    `<circle cx="48" cy="43" r="2.4" fill="${p.accent}"/>`,

  // ค่าบริการเรื่องกุญแจ
  keyService: (p) =>
    `<circle cx="22" cy="24" r="9" fill="none" stroke="${p.body}" stroke-width="5"/>` +
    `<path d="M28 30 L46 48" stroke="${p.body}" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M38 40 L34 44" stroke="${p.body}" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M46 16 l-7 7 4 4 7-7 a7 7 0 0 1-4-4 Z" fill="${p.accent}"/>` +
    `<path d="M40 22 L22 40" stroke="${p.accent}" stroke-width="4.5" stroke-linecap="round"/>` +
    `<circle cx="19" cy="43" r="4" fill="${p.accent}"/>`,

  // ลืมกุญแจไว้ในรถ
  unlock: (p) =>
    `<rect x="8" y="16" width="38" height="30" rx="6" fill="${p.body}"/>` +
    `<rect x="13" y="21" width="28" height="20" rx="3" fill="${p.light}"/>` +
    `<rect x="22" y="27" width="11" height="7" rx="3" fill="${p.body}"/>` +
    `<path d="M26 34 L26 39 L30 39 L30 37 L33 37 L33 34 Z" fill="${p.body}"/>` +
    `<rect x="40" y="34" width="18" height="15" rx="4" fill="${p.accent}"/>` +
    `<path d="M43 34 v-4 a6 6 0 0 1 12 0 v4" stroke="${p.accent}" stroke-width="3.4" fill="none"/>` +
    `<circle cx="49" cy="41" r="2.6" fill="${p.light}"/>`,

  // น้ำมันไม่เต็มถัง
  fuel: (p) =>
    `<path d="M12 50 L12 18 Q12 12 18 12 L30 12 Q36 12 36 18 L36 50 Z" fill="${p.body}"/>` +
    `<rect x="17" y="18" width="14" height="10" rx="2" fill="${p.light}"/>` +
    `<path d="M36 22 L44 22 Q48 22 48 26 L48 38 Q48 42 44 42 L42 42" stroke="${p.accent}" stroke-width="3.4" fill="none" stroke-linecap="round"/>` +
    `<rect x="8" y="50" width="32" height="5" rx="2.5" fill="${p.ink}"/>` +
    `<path d="M24 44 m-7 0 a7 7 0 1 1 14 0" stroke="${p.light}" stroke-width="2.4" fill="none"/>` +
    `<path d="M24 44 L18.5 39.5" stroke="${p.alert}" stroke-width="2.6" stroke-linecap="round"/>` +
    /* ขีดบอกระดับถังฝั่งซ้าย = ใกล้หมด วาดเป็นเส้น ไม่ใช้ตัวอักษร
       เพราะภาพชุดนี้ถูกแปลงเป็น PNG ด้วย ซึ่งตัวอักษรในภาพจะเสี่ยงไม่มีฟอนต์ */
    `<rect x="15" y="41" width="6" height="2.4" rx="1.2" fill="${p.light}"/>`,

  // รถลาก
  tow: (p) =>
    carSide(p, 2, 24, 0.5, p.soft, false) +
    `<path d="M30 48 L30 26 L46 26 L46 20 L56 20 L56 48 Z" fill="${p.body}"/>` +
    `<rect x="47" y="24" width="7" height="6" rx="1.5" fill="${p.light}"/>` +
    `<path d="M32 26 L20 14" stroke="${p.accent}" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="M20 14 L20 22 q0 4 4 4" stroke="${p.accent}" stroke-width="2.6" fill="none" stroke-linecap="round"/>` +
    `<circle cx="37" cy="50" r="5.5" fill="${p.ink}"/>` +
    `<circle cx="51" cy="50" r="5.5" fill="${p.ink}"/>` +
    `<circle cx="37" cy="50" r="2.2" fill="${p.light}"/>` +
    `<circle cx="51" cy="50" r="2.2" fill="${p.light}"/>`,

  // ใบสั่งจราจร
  ticket: (p) =>
    `<path d="M14 12 L46 12 Q50 12 50 16 L50 50 L42 45 L34 50 L26 45 L18 50 L14 47 Z" fill="${p.light}" stroke="${p.ink}" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<rect x="20" y="19" width="24" height="3.4" rx="1.7" fill="${p.body}"/>` +
    `<rect x="20" y="26" width="18" height="3" rx="1.5" fill="${p.soft}"/>` +
    `<rect x="20" y="32" width="21" height="3" rx="1.5" fill="${p.soft}"/>` +
    `<circle cx="41" cy="39" r="10" fill="none" stroke="${p.alert}" stroke-width="2.6"/>` +
    /* สัญลักษณ์บาทวาดด้วยเส้น ไม่ใช้ตัวอักษร ด้วยเหตุผลเดียวกับเกจน้ำมัน */
    `<path d="M41 32 v14" stroke="${p.alert}" stroke-width="2.2" stroke-linecap="round"/>` +
    `<path d="M38 34 h4 a2.6 2.6 0 0 1 0 5 h-4 v-5 Z" fill="${p.alert}"/>` +
    `<path d="M38 39 h4.6 a2.8 2.8 0 0 1 0 5.4 H38 Z" fill="${p.alert}"/>`,

  // คืนรถก่อนกำหนด
  earlyReturn: (p) =>
    `<rect x="10" y="16" width="38" height="36" rx="6" fill="${p.body}"/>` +
    `<rect x="10" y="16" width="38" height="10" rx="6" fill="${p.accent}"/>` +
    `<rect x="17" y="10" width="4.5" height="10" rx="2.2" fill="${p.ink}"/>` +
    `<rect x="36.5" y="10" width="4.5" height="10" rx="2.2" fill="${p.ink}"/>` +
    `<rect x="16" y="32" width="7" height="6" rx="1.5" fill="${p.light}"/>` +
    `<rect x="26" y="32" width="7" height="6" rx="1.5" fill="${p.light}" opacity=".5"/>` +
    `<rect x="16" y="42" width="7" height="6" rx="1.5" fill="${p.light}" opacity=".5"/>` +
    `<path d="M40 34 a11 11 0 1 1-4 8.5" stroke="${p.alert}" stroke-width="3.2" fill="none" stroke-linecap="round"/>` +
    `<path d="M34 28 L40 34 L34 39" stroke="${p.alert}" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
};

/**
 * วางภาพประกอบลงตำแหน่งที่ต้องการ
 * ชื่อที่ไม่มีในชุดจะคืนสตริงว่าง — โปสเตอร์ยังออกได้ แค่ไม่มีรูปในแถวนั้น
 */
export function artAt(
  name: string,
  x: number,
  y: number,
  size: number,
  p: ArtPalette = BRAND_ART_PALETTE
): string {
  const fn = ART[name];
  if (!fn) return "";
  const s = size / 64;
  return `<g transform="translate(${x},${y}) scale(${s})">${fn(p)}</g>`;
}

/** มีภาพประกอบของหัวข้อนี้ไหม */
export function hasArt(name: string): boolean {
  return Boolean(ART[name]);
}
