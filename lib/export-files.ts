import { get } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

/** จำนวนใบจองต่อไฟล์ ZIP หนึ่งชุด — แบ่งเพื่อไม่ให้เกินเวลา 300 วินาทีของ Vercel Hobby */
export const FILES_PER_PART = 8;

/** ใบจองที่มีไฟล์แนบอย่างน้อยหนึ่งไฟล์ เรียงตามวันที่สร้าง (เรียงเดิมทุกครั้งเพื่อให้แบ่งชุดตรงกัน) */
export async function bookingIdsWithFiles(): Promise<string[]> {
  const rows = await prisma.booking.findMany({
    where: {
      OR: [
        { documents: { some: {} } },
        { deposit: { isNot: null } },
        { refund: { is: { slipUrl: { not: null } } } },
        { assignments: { some: { photos: { some: {} } } } },
      ],
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/** /api/file?p=documents/xxx.jpg  →  documents/xxx.jpg */
export function pathnameOf(url: string): string | null {
  try {
    const q = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
    return new URLSearchParams(q).get("p");
  } catch {
    return null;
  }
}

export async function fetchBlob(url: string): Promise<{ buf: Buffer; ext: string } | null> {
  try {
    const pathname = url.startsWith("/api/file") ? pathnameOf(url) : url;
    if (!pathname) return null;
    const r = await get(pathname, { access: "private" });
    if (!r || r.statusCode !== 200 || !r.stream) return null;
    const buf = Buffer.from(await new Response(r.stream).arrayBuffer());
    const fromName = /\.([A-Za-z0-9]{2,5})$/.exec(pathname)?.[1]?.toLowerCase();
    const ct = r.blob.contentType ?? "";
    const ext =
      fromName ??
      (ct.includes("png") ? "png" : ct.includes("pdf") ? "pdf" : ct.includes("webp") ? "webp" : "jpg");
    return { buf, ext };
  } catch (err) {
    console.error("export: blob fetch failed:", url, err);
    return null;
  }
}
