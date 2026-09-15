import { ImageResponse } from "next/og";
import { getFeeItems } from "@/lib/fees-server";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/line";
import { artAt, BRAND_ART_PALETTE } from "@/lib/fee-art";
import type { FeeItem } from "@/lib/fees";

/**
 * โปสเตอร์ค่าปรับเป็นไฟล์ .png — สำหรับส่งในแชท LINE และเซฟลงมือถือ
 *
 * ทำไมต้องมีทั้ง .svg และ .png:
 *   LINE กับ Facebook ไม่พรีวิวไฟล์ SVG ลูกค้าเซฟไม่ได้ ต้องเป็น PNG เท่านั้น
 *   ส่วน SVG ยังจำเป็นสำหรับฝังในหน้าเว็บและงานพิมพ์ เพราะคมทุกความละเอียด
 *
 * ทำไมไม่แปลง SVG เดิมเป็น PNG ตรง ๆ:
 *   ตัวแปลง SVG→PNG ต้องมีฟอนต์ไทยติดตั้งอยู่ในเครื่องที่เรนเดอร์
 *   ซึ่งเซิร์ฟเวอร์ของ Vercel ไม่มี ตัวหนังสือจะกลายเป็นสี่เหลี่ยมทั้งใบ
 *   ทางที่ชัวร์กว่าคือใช้ next/og แล้วส่งไฟล์ฟอนต์ให้มันตรง ๆ
 *
 * ฟอนต์ใช้ Sarabun จาก public/fonts (ชุดเดียวกับใบเสร็จ PDF)
 * ไม่ใช่ IBM Plex Sans Thai ของเว็บ เพราะตัวนั้นอยู่ใน node_modules ดึงตอน runtime ไม่ได้
 *
 * ภาพประกอบส่งเข้าไปเป็น data URI ของ SVG ซึ่งวาดด้วยรูปทรงล้วน ไม่มีตัวอักษร
 * จึงไม่ติดปัญหาฟอนต์เหมือนตัวหนังสือ
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCALE = 1.6; // ขยายจากขนาดออกแบบ 600px ให้คมพอสำหรับจอมือถือ
const px = (n: number) => Math.round(n * SCALE);

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
  alert: "#9a3412",
};

/** ภาพประกอบหนึ่งตัว ห่อเป็น data URI ให้ next/og วางเป็นรูปได้ */
function artDataUri(icon: string): string | null {
  const g = artAt(icon, 0, 0, 64, BRAND_ART_PALETTE);
  if (!g) return null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">${g}</svg>`;
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
}

function amountColor(amount: string) {
  return amount.includes("ไม่คืน") ? C.alert : C.ink;
}

async function loadFont(base: string, file: string): Promise<ArrayBuffer> {
  const res = await fetch(`${base}/fonts/${file}`);
  if (!res.ok) throw new Error(`โหลดฟอนต์ ${file} ไม่สำเร็จ (${res.status})`);
  return res.arrayBuffer();
}

function Row({ f }: { f: FeeItem }) {
  const uri = artDataUri(f.icon);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: px(14),
        padding: `${px(11)}px 0`,
        borderTop: `1px solid ${C.hair}`,
      }}
    >
      {f.highlight ? (
        <div style={{ width: px(3), height: px(38), background: C.gold, borderRadius: px(2) }} />
      ) : (
        <div style={{ width: px(3), height: px(38) }} />
      )}
      {uri ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={uri} width={px(52)} height={px(52)} alt="" />
      ) : (
        <div style={{ width: px(52), height: px(52) }} />
      )}
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div
          style={{
            fontSize: px(15),
            fontWeight: f.highlight ? 700 : 400,
            color: C.ink,
          }}
        >
          {f.title}
        </div>
        {f.note ? (
          <div style={{ fontSize: px(11), color: C.faint, marginTop: px(3) }}>{f.note}</div>
        ) : null}
      </div>
      <div
        style={{
          fontSize: px(16.5),
          fontWeight: 700,
          color: amountColor(f.amount),
          marginLeft: px(12),
        }}
      >
        {f.amount}
      </div>
    </div>
  );
}

export async function GET() {
  const base = siteUrl();
  const [items, settings, regular, bold] = await Promise.all([
    getFeeItems(),
    getSettings(),
    loadFont(base, "Sarabun-Regular.ttf"),
    loadFont(base, "Sarabun-Bold.ttf"),
  ]);

  const host = base.replace(/^https?:\/\//, "");

  /* ความสูงคำนวณจากจำนวนรายการจริง เหมือนฝั่ง SVG
     เพิ่มรายการในหลังบ้านแล้วรูปยาวขึ้นเอง ไม่ต้องแก้โค้ด */
  const height = px(136 + 96 + 46) + items.length * px(76) + px(96);

  return new ImageResponse(
    (
      <div
        style={{
          width: px(600),
          height,
          display: "flex",
          flexDirection: "column",
          background: C.paper,
          fontFamily: "Sarabun",
        }}
      >
        {/* หัวเอกสาร */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            background: C.emerald,
            padding: `0 ${px(44)}px`,
            height: px(132),
            borderBottom: `${px(4)}px solid ${C.gold}`,
          }}
        >
          <div style={{ fontSize: px(12), letterSpacing: px(3.4), color: C.pale }}>
            PHUPING CORPORATION
          </div>
          <div style={{ fontSize: px(31), fontWeight: 700, color: C.ivory, marginTop: px(6) }}>
            อัตราค่าปรับและค่าบริการ
          </div>
          <div style={{ fontSize: px(13), color: C.pale, marginTop: px(6) }}>
            เรียกเก็บเฉพาะเมื่อเกิดเหตุจริง — คืนรถเรียบร้อยไม่มีค่าใช้จ่ายเหล่านี้
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: `${px(28)}px ${px(44)}px 0` }}>
          {/* แถบเงินประกัน */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: C.ivory,
              borderLeft: `${px(4)}px solid ${C.gold}`,
              padding: `${px(14)}px ${px(20)}px`,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ fontSize: px(12.5), color: "#55655d" }}>
                เงินประกันความเสียหาย ชำระวันรับรถ
              </div>
              <div style={{ fontSize: px(13), color: C.ink, marginTop: px(4) }}>
                คืนเต็มจำนวนเมื่อคืนรถเรียบร้อย
              </div>
            </div>
            <div style={{ fontSize: px(27), fontWeight: 700, color: C.emerald }}>
              {settings.securityDeposit.toLocaleString()} บาท
            </div>
          </div>

          {/* หัวตาราง */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: px(26),
              paddingBottom: px(9),
              borderBottom: `${px(1.4)}px solid ${C.gold}`,
            }}
          >
            <div style={{ fontSize: px(11), letterSpacing: px(2.2), color: C.goldText }}>รายการ</div>
            <div style={{ fontSize: px(11), letterSpacing: px(2.2), color: C.goldText }}>อัตรา</div>
          </div>

          {/* รายการ */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {items.map((f, i) => (
              <Row key={`${f.title}-${i}`} f={f} />
            ))}
          </div>

          {/* ท้ายเอกสาร */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: px(18),
              paddingTop: px(16),
              borderTop: `${px(1.4)}px solid ${C.gold}`,
            }}
          >
            <div style={{ fontSize: px(10.5), color: C.faint }}>
              อัตราข้างต้นเป็นราคาเริ่มต้น อาจเปลี่ยนตามรุ่นรถและระดับความเสียหาย
            </div>
            <div style={{ fontSize: px(10.5), color: C.faint, marginTop: px(4) }}>
              รายละเอียดทั้งหมด · {host}/fees
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: px(600),
      height,
      fonts: [
        { name: "Sarabun", data: regular, weight: 400, style: "normal" },
        { name: "Sarabun", data: bold, weight: 700, style: "normal" },
      ],
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
