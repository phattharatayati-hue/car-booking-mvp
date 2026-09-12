import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/line";
import { renderReceiptPdf } from "@/lib/receipt-pdf";
import type { ReceiptItem } from "@/lib/receipt";

/* react-pdf ต้องรันบน Node ไม่ใช่ Edge — มันใช้ Buffer กับ stream ของ Node */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ไฟล์ PDF ของใบเสร็จ เปิดด้วยกุญแจสุ่มในลิงก์เหมือนหน้าเว็บใบเสร็จ
 *
 * ใส่ ?dl=1 เพื่อบังคับให้เบราว์เซอร์ดาวน์โหลดแทนการเปิดดู
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const receipt = await prisma.receipt.findUnique({ where: { viewToken: token } });
  if (!receipt) {
    return new Response("ไม่พบใบเสร็จนี้", { status: 404 });
  }

  const settings = await getSettings();
  const base = siteUrl();

  try {
    const buffer = await renderReceiptPdf(
      { ...receipt, items: receipt.items as unknown as ReceiptItem[] },
      {
        taxId: settings.companyTaxId,
        branch: settings.companyBranch,
        address: settings.companyAddress,
      },
      base,
      // รูปเก็บเป็น path ภายใน (/api/file?p=...) ต้องเติมโดเมนให้โหลดจากฝั่งเซิร์ฟเวอร์ได้
      (u) => (u ? (u.startsWith("http") ? u : `${base}${u}`) : null)
    );

    const download = new URL(request.url).searchParams.get("dl") === "1";

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${receipt.number}.pdf"`,
        // ใบเสร็จไม่เปลี่ยนหลังออกแล้ว แต่ยกเลิกได้ จึงไม่แคชนาน
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    /* ส่วนใหญ่พังเพราะยังไม่ได้วางไฟล์ฟอนต์ไทยใน public/fonts/
       บอกสาเหตุตรง ๆ ดีกว่าปล่อย 500 เปล่า ๆ ให้ไปไล่หาเอง */
    console.error("render receipt pdf failed:", err);
    return new Response(
      "สร้าง PDF ไม่สำเร็จ — ตรวจว่ามีไฟล์ public/fonts/Sarabun-Regular.ttf และ Sarabun-Bold.ttf แล้วหรือยัง",
      { status: 500 }
    );
  }
}
