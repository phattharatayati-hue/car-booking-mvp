import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jobViewOpen } from "@/lib/driver-jobs";

/**
 * ลิงก์งานของคนรับ-ส่งรถ เปิดไฟล์นี้ได้ไหม
 * ตรวจถึงระดับ "ไฟล์นี้เป็นเอกสารของการจองที่เขารับงานอยู่" เพื่อไม่ให้เอากุญแจไปเปิดของคนอื่น
 */
async function jobTokenAllows(token: string, pathname: string): Promise<boolean> {
  try {
    const job = await prisma.bookingAssignment.findUnique({
      where: { viewToken: token },
      select: { meetAt: true, bookingId: true },
    });
    if (!job || !jobViewOpen(job.meetAt)) return false;

    const url = `/api/file?p=${encodeURIComponent(pathname)}`;

    const doc = await prisma.bookingDocument.findFirst({
      where: { bookingId: job.bookingId, fileUrl: url, status: "APPROVED" },
      select: { id: true },
    });
    return Boolean(doc);
  } catch (err) {
    console.error("job token check failed:", err);
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pathname = searchParams.get("p");

  if (!pathname) {
    return NextResponse.json({ error: "missing p" }, { status: 400 });
  }

  // รูปรถเป็นของสาธารณะ — นอกนั้น (สลิป, บัตรประชาชน, ใบขับขี่) ต้องเป็นแอดมินที่ login แล้ว
  // ใช้แบบ allowlist ไว้ก่อน ถ้าเพิ่มโฟลเดอร์ใหม่ในอนาคตจะถูกปิดโดยปริยาย ไม่หลุดเงียบๆ
  const isPublic = pathname.startsWith("cars/");

  if (!isPublic) {
    const session = await auth();

    if (!session) {
      // ทางเข้าที่สอง: คนรับ-ส่งรถเปิดจากลิงก์งานของตัวเอง (/job/<token>)
      // ต้องผ่านครบ 3 ข้อ — กุญแจถูก, อยู่ในช่วงเวลาทำงาน, และไฟล์นี้เป็นเอกสารของการจองนั้นจริง
      const token = searchParams.get("t");
      const allowed = token ? await jobTokenAllows(token, pathname) : false;

      if (!allowed) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
    }
  }

  try {
    const result = await get(pathname, { access: "private" });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType ?? "application/octet-stream",
        "Cache-Control": isPublic
          ? "public, max-age=31536000, immutable"
          : "private, no-store",
      },
    });
  } catch (err) {
    console.error("file fetch failed:", err);
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
