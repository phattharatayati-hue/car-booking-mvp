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

import "dotenv/config";
import fs from "fs";
import path from "path";

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://car-booking-mvp.vercel.app").replace(
  /\/$/,
  ""
);
const PHONE = process.env.SHOP_PHONE ?? "053000000";

const IMAGE_PATH = path.join(__dirname, "richmenu.png");

/** ขนาดมาตรฐานของ LINE: 2500 x 1686 แบ่ง 3 คอลัมน์ 2 แถว */
const W = 2500;
const H = 1686;
const CELL_W = Math.floor(W / 3);
const CELL_H = Math.floor(H / 2);

function cell(col: number, row: number) {
  return { x: col * CELL_W, y: row * CELL_H, width: CELL_W, height: CELL_H };
}

const richMenu = {
  size: { width: W, height: H },
  selected: true,
  name: "เมนูหลัก - ระบบจองรถ",
  chatBarText: "เมนู",
  areas: [
    // แถวบน — "จองรถ" เริ่มขั้นตอนจองในแชทเลย ไม่เด้งออกเว็บ
    {
      bounds: cell(0, 0),
      action: { type: "postback", label: "จองรถ", data: "action=start_booking", displayText: "จองรถ" },
    },
    { bounds: cell(1, 0), action: { type: "uri", label: "รถทั้งหมด", uri: `${SITE}/cars` } },
    {
      bounds: cell(2, 0),
      action: { type: "message", label: "เช็คสถานะ", text: "เช็คสถานะ" },
    },
    // แถวล่าง
    {
      bounds: cell(0, 1),
      action: { type: "uri", label: "วิธีการจอง", uri: `${SITE}/how-to-book` },
    },
    {
      bounds: cell(1, 1),
      action: { type: "message", label: "ติดต่อเรา", text: "ติดต่อแอดมิน" },
    },
    { bounds: cell(2, 1), action: { type: "uri", label: "โทรหาเรา", uri: `tel:${PHONE}` } },
  ],
};

async function main() {
  if (!TOKEN) {
    console.error("ไม่พบ LINE_CHANNEL_ACCESS_TOKEN ใน .env");
    process.exit(1);
  }
  if (!fs.existsSync(IMAGE_PATH)) {
    console.error(`ไม่พบไฟล์รูป: ${IMAGE_PATH}`);
    console.error("รัน  python3 scripts/make-richmenu-image.py  ก่อน");
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
      headers: { ...auth, "Content-Type": "image/png" },
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
