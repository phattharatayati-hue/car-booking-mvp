import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file") as File | null;
    const rawKind = form.get("kind") as string;
    const kind =
      rawKind === "car" ? "cars" : rawKind === "document" ? "documents" : "slips";

    if (!file) {
      return NextResponse.json({ error: "ไม่พบไฟล์ที่อัปโหลด" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "รองรับเฉพาะไฟล์รูปภาพเท่านั้น (JPG, PNG, WEBP)" },
        { status: 400 }
      );
    }

    const maxSizeBytes = 8 * 1024 * 1024; // 8MB
    if (file.size > maxSizeBytes) {
      return NextResponse.json({ error: "ไฟล์ใหญ่เกินไป (สูงสุด 8MB)" }, { status: 400 });
    }

    // เก็บแบบ private — ต้องเรียกผ่าน /api/file เท่านั้น
    const blob = await put(`${kind}/${Date.now()}-${file.name}`, file, {
      access: "private",
      addRandomSuffix: true,
    });

    return NextResponse.json({
      url: `/api/file?p=${encodeURIComponent(blob.pathname)}`,
      pathname: blob.pathname,
    });
  } catch (err) {
    console.error("upload failed:", err);
    const message = err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
