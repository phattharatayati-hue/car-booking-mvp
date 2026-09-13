/**
 * ปิดเมนูของระบบจอง (rich menu ที่สร้างผ่าน Messaging API) ชั่วคราว
 *
 *   npx tsx scripts/richmenu-off.ts          ← ดูก่อนว่ามีเมนูอะไรอยู่
 *   npx tsx scripts/richmenu-off.ts --yes    ← ปิดจริง
 *   npx tsx scripts/richmenu-off.ts --yes --delete   ← ปิดแล้วลบเมนูทิ้งด้วย
 *
 * ปิดแล้วเกิดอะไร: ลูกค้าจะกลับไปเห็นเมนูที่ตั้งไว้ใน LINE OA Manager
 * (ถ้ามีเมนูที่ Active อยู่) หรือไม่เห็นเมนูเลยถ้าไม่มี
 * ตัวบอทยังทำงานปกติ — พิมพ์ "จองรถ" หรือ "เช็คสถานะ" ยังใช้ได้เหมือนเดิม
 * เพราะเมนูเป็นแค่ทางลัด ไม่ใช่ตัวระบบ
 *
 * เปิดกลับ: npx tsx scripts/setup-richmenu.ts
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const YES = process.argv.includes("--yes");
const DELETE = process.argv.includes("--delete");

async function main() {
  if (!TOKEN) {
    console.error("ไม่พบ LINE_CHANNEL_ACCESS_TOKEN ใน .env.local");
    process.exit(1);
  }
  const auth = { Authorization: `Bearer ${TOKEN}` };

  // เมนูที่ตั้งเป็นค่าเริ่มต้นของทุกคนตอนนี้
  const curRes = await fetch("https://api.line.me/v2/bot/user/all/richmenu", { headers: auth });
  if (curRes.ok) {
    const cur = (await curRes.json()) as { richMenuId?: string };
    console.log(`เมนูที่ใช้อยู่ตอนนี้: ${cur.richMenuId ?? "(ไม่มี)"}`);
  } else if (curRes.status === 404) {
    console.log("ตอนนี้ยังไม่ได้ตั้งเมนูเริ่มต้นผ่าน API");
  }

  const listRes = await fetch("https://api.line.me/v2/bot/richmenu/list", { headers: auth });
  const { richmenus = [] } = listRes.ok
    ? ((await listRes.json()) as { richmenus?: { richMenuId: string; name: string }[] })
    : { richmenus: [] };
  console.log(`เมนูที่สร้างผ่าน API ทั้งหมด: ${richmenus.length} ชุด`);
  for (const m of richmenus) console.log(`  - ${m.name} (${m.richMenuId})`);

  if (!YES) {
    console.log("\nนี่คือการดูเฉย ๆ — เติม --yes เพื่อปิดเมนูจริง\n");
    return;
  }

  /* ถอดเมนูออกจากผู้ใช้ทุกคน — ตัวเมนูยังอยู่ในระบบ LINE
     เปิดกลับได้เร็วโดยไม่ต้องอัปรูปใหม่ (ถ้าไม่ได้สั่ง --delete) */
  const unsetRes = await fetch("https://api.line.me/v2/bot/user/all/richmenu", {
    method: "DELETE",
    headers: auth,
  });
  if (!unsetRes.ok && unsetRes.status !== 404) {
    console.error("ปิดเมนูไม่สำเร็จ:", unsetRes.status, await unsetRes.text());
    process.exit(1);
  }
  console.log("ปิดเมนูของระบบแล้ว — ลูกค้าจะเห็นเมนูของ OA Manager แทน (ถ้ามี)");

  if (DELETE) {
    for (const m of richmenus) {
      await fetch(`https://api.line.me/v2/bot/richmenu/${m.richMenuId}`, {
        method: "DELETE",
        headers: auth,
      });
      console.log(`ลบเมนู: ${m.name}`);
    }
  }

  console.log("\nเปิดกลับเมื่อพร้อม:  npx tsx scripts/setup-richmenu.ts\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
