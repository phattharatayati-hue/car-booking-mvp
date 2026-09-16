/**
 * ติดตั้ง Rich Menu ให้ LINE OA
 *
 * ใช้ครั้งเดียวตอนตั้งค่า (หรือรันซ้ำเมื่ออยากเปลี่ยนเมนู)
 *
 * ต้องมีใน .env:
 *   LINE_CHANNEL_ACCESS_TOKEN
 *   NEXT_PUBLIC_SITE_URL   (ไม่ใส่จะใช้ค่า default)
 *
 * รัน:  npx tsx scripts/setup-richmenu.ts
 */

/* โหลด env ตามลำดับเดียวกับที่ Next.js ใช้ (.env.local ทับ .env)
   ไม่งั้นสคริปต์จะอ่านแต่ .env แล้วไปยิงใส่ OA ตัวเก่าโดยไม่รู้ตัว */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });
import fs from "fs";
import path from "path";

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const FALLBACK_SITE = "https://car-booking-mvp.vercel.app";

/* ปุ่มในเมนูเป็นลิงก์ที่ลูกค้ากดจากมือถือ — ถ้าเผลอรันโดยที่ .env.local ตั้ง
   NEXT_PUBLIC_SITE_URL เป็น localhost เมนูจะถูกตั้งด้วยลิงก์ที่กดแล้วไม่มีอะไรเกิดขึ้น
   และต้องมานั่งหาสาเหตุทีหลัง จึงกันไว้ตรงนี้เลย */
const RAW_SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK_SITE).replace(/\/$/, "");
const SITE = /localhost|127\.0\.0\.1|^http:\/\//.test(RAW_SITE) ? FALLBACK_SITE : RAW_SITE;
if (SITE !== RAW_SITE) {
  console.warn(`ข้าม NEXT_PUBLIC_SITE_URL=${RAW_SITE} (ใช้กับเมนูจริงไม่ได้) → ใช้ ${SITE} แทน`);
}
// เบอร์ร้าน — ตอนนี้เมนูไม่มีปุ่มโทรตรงแล้ว แต่เก็บไว้เผื่อเพิ่มกลับ
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PHONE = process.env.SHOP_PHONE ?? "053000000";

/* รูปเมนู — LINE รับได้ทั้ง .jpg และ .png ขนาดไม่เกิน 1 MB
   ใช้ .jpg เป็นหลักเพราะรูปแบบภาพถ่าย/ภาพวาดบีบเป็น PNG แล้วเกิน 1 MB */
const IMAGE_PATH = ["richmenu.jpg", "richmenu.png"]
  .map((f) => path.join(__dirname, f))
  .find((f) => fs.existsSync(f)) ?? path.join(__dirname, "richmenu.jpg");
const IMAGE_TYPE = IMAGE_PATH.endsWith(".png") ? "image/png" : "image/jpeg";

/**
 * ผัง 4 ช่อง — ปุ่มใหญ่เต็มความกว้างด้านบน + 3 ปุ่มเรียงด้านล่าง
 *
 * ขนาดที่ LINE รับคือ 2500x1686 เท่านั้น (หรือ 2500x843 สำหรับเมนูเตี้ย)
 * รูปเมนูต้องวางองค์ประกอบให้ตรงกับพิกัดข้างล่างนี้ ไม่งั้นกดแล้วไม่ตรงปุ่ม:
 *
 *   ┌───────────────────────────────────────┐ y=0
 *   │         ค่าบริการและการจอง            │
 *   ├───────────┬───────────┬───────────────┤ y=880
 *   │  ค่าปรับ  │ การจองของฉัน │  ติดต่อเรา  │
 *   └───────────┴───────────┴───────────────┘ y=1686
 *   x=0        833         1666          2500
 *
 * พื้นที่กดครอบคลุมทั้งรูปแบบไม่มีช่องว่าง — คนกดพลาดขอบนิดหน่อยก็ยังโดนปุ่ม
 */
const W = 2500;
const H = 1686;
const TOP_H = 880;
const BOTTOM_H = H - TOP_H;
const COL_W = Math.floor(W / 3);

/** ช่องแถวล่าง — ช่องขวาสุดกินเศษที่หารไม่ลงตัว จะได้ไม่เหลือแถบกดไม่ได้ */
function bottom(col: number) {
  const x = col * COL_W;
  return {
    x,
    y: TOP_H,
    width: col === 2 ? W - x : COL_W,
    height: BOTTOM_H,
  };
}

const richMenu = {
  size: { width: W, height: H },
  selected: true,
  name: "เมนูหลัก 4 ช่อง - ระบบจองรถ",
  chatBarText: "เมนู",
  areas: [
    /* 1. ค่าบริการและการจอง — เปิดหน้ารถทั้งหมดบนเว็บ
          หน้านั้นมีทั้งรูปรถ ราคาต่อวัน และปุ่มจองในตัว จบได้ในหน้าเดียว */
    {
      bounds: { x: 0, y: 0, width: W, height: TOP_H },
      action: { type: "uri", label: "ค่าบริการและการจอง", uri: `${SITE}/cars` },
    },

    /* 2. ค่าปรับและค่าเสียหาย — ตอบเป็นการ์ดในแชท เร็วกว่าเปิดเว็บ
          คำว่า "ค่าปรับ" เป็นคีย์เวิร์ดที่ webhook จับอยู่แล้ว */
    {
      bounds: bottom(0),
      action: { type: "message", label: "ค่าปรับและค่าเสียหาย", text: "ค่าปรับ" },
    },

    /* 3. รายการจองของฉัน — ต้องล็อกอินด้วย LINE ที่หน้านี้
          ดูประวัติการจองและอัปโหลดเอกสารได้ */
    {
      bounds: bottom(1),
      action: { type: "uri", label: "รายการจองของฉัน", uri: `${SITE}/my` },
    },

    /* 4. ติดต่อเรา — การ์ดเบอร์โทรกดโทรออกได้เลยจากในแชท */
    {
      bounds: bottom(2),
      action: { type: "message", label: "ติดต่อเรา", text: "ติดต่อแอดมิน" },
    },
  ],
};

async function main() {
  if (!TOKEN) {
    console.error("ไม่พบ LINE_CHANNEL_ACCESS_TOKEN ใน .env");
    process.exit(1);
  }
  if (!fs.existsSync(IMAGE_PATH)) {
    console.error(`ไม่พบไฟล์รูป: ${IMAGE_PATH}`);
    console.error("วางไฟล์ scripts/richmenu.jpg ขนาด 2500x1686 ไม่เกิน 1 MB ก่อน");
    console.error("ผัง: ปุ่มบนเต็มความกว้างสูง 880px · ปุ่มล่าง 3 ช่อง ช่องละ 833px สูง 806px");
    process.exit(1);
  }

  const auth = { Authorization: `Bearer ${TOKEN}` };

  // 1) ลบเมนูเดิมทิ้ง กันเมนูค้างซ้อนกัน
  const listRes = await fetch("https://api.line.me/v2/bot/richmenu/list", { headers: auth });
  if (listRes.ok) {
    const { richmenus = [] } = (await listRes.json()) as { richmenus?: { richMenuId: string }[] };
    for (const m of richmenus) {
      await fetch(`https://api.line.me/v2/bot/richmenu/${m.richMenuId}`, {
        method: "DELETE",
        headers: auth,
      });
      console.log(`ลบเมนูเดิม: ${m.richMenuId}`);
    }
  }

  // 2) สร้างเมนูใหม่
  const createRes = await fetch("https://api.line.me/v2/bot/richmenu", {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify(richMenu),
  });

  if (!createRes.ok) {
    console.error("สร้างเมนูไม่สำเร็จ:", createRes.status, await createRes.text());
    process.exit(1);
  }

  const { richMenuId } = (await createRes.json()) as { richMenuId: string };
  console.log(`สร้างเมนูแล้ว: ${richMenuId}`);

  // 3) อัปโหลดรูป (ต้องใช้ api-data.line.me)
  const image = fs.readFileSync(IMAGE_PATH);
  const uploadRes = await fetch(
    `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
    {
      method: "POST",
      headers: { ...auth, "Content-Type": IMAGE_TYPE },
      body: new Uint8Array(image),
    }
  );

  if (!uploadRes.ok) {
    console.error("อัปโหลดรูปไม่สำเร็จ:", uploadRes.status, await uploadRes.text());
    process.exit(1);
  }
  console.log("อัปโหลดรูปแล้ว");

  // 4) ตั้งเป็นเมนูเริ่มต้นของทุกคน
  const setRes = await fetch(
    `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
    { method: "POST", headers: auth }
  );

  if (!setRes.ok) {
    console.error("ตั้งเป็นเมนูเริ่มต้นไม่สำเร็จ:", setRes.status, await setRes.text());
    process.exit(1);
  }

  console.log("\nติดตั้ง Rich Menu เรียบร้อย!");
  console.log("เปิดแชท LINE ของร้านดูได้เลย (อาจต้องปิด-เปิดแชทใหม่)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
