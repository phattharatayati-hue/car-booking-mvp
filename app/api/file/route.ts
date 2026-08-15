import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pathname = searchParams.get("p");

  if (!pathname) {
    return NextResponse.json({ error: "missing p" }, { status: 400 });
  }

  // สลิปมัดจำมีข้อมูลธนาคารของลูกค้า — ให้เฉพาะแอดมินที่ login แล้วดูได้
  if (pathname.startsWith("slips/")) {
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
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("file fetch failed:", err);
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
