import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

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
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
