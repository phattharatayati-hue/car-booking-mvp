import { getFeeItems } from "@/lib/fees-server";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/line";
import { buildFeePosterSvg } from "@/lib/fee-poster";

/**
 * โปสเตอร์ค่าปรับเป็นไฟล์ .svg — เอาไว้ปรินต์ ส่งต่อ หรือฝังที่อื่น
 *
 * ไม่ฝังฟอนต์มาด้วย เพราะฟอนต์ของเว็บอยู่ใน @fontsource (node_modules)
 * ดึงตอน runtime ไม่ได้ และถ้าฝังเป็น base64 ไฟล์จะบวมจาก 8KB เป็นกว่า 200KB
 * จึงประกาศเป็นลำดับฟอนต์สำรองแทน — เครื่องที่ไม่มี IBM Plex Sans Thai
 * จะตกไปใช้ Noto Sans Thai หรือ Tahoma ซึ่งอ่านภาษาไทยได้ครบทุกเครื่อง
 *
 * หมายเหตุ: ปรินต์จากหน้า /fees โดยตรงจะได้ฟอนต์ตรงแบรนด์เป๊ะกว่า
 * เพราะหน้านั้นโหลดฟอนต์ของเว็บไว้แล้ว
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const [items, settings] = await Promise.all([getFeeItems(), getSettings()]);

  const svg = buildFeePosterSvg({
    items,
    securityDeposit: settings.securityDeposit,
    siteUrl: siteUrl(),
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      /* ให้ CDN เก็บไว้ 1 ชั่วโมง แต่เสิร์ฟของเก่าระหว่างดึงใหม่ได้ 1 วัน
         แอดมินแก้ราคาแล้วเห็นผลช้าสุด 1 ชั่วโมง ซึ่งรับได้สำหรับไฟล์แจก
         ส่วนในหน้า /fees เห็นผลทันทีเพราะวาดใหม่ทุกครั้ง */
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
