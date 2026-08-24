import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

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

    // สลิปและเอกสารต้องให้ลูกค้าอัปได้โดยไม่ล็อกอิน (เก็บ private อยู่แล้ว)
    // แต่ cars/ เปิดสาธารณะผ่าน /api/file จึงต้องเป็นแอดมินเท่านั้น
    // ไม่งั้นใครก็อัปรูปอะไรก็ได้มาฝากไว้บนโดเมนเรา
    if (kind === "cars") {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
      }
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "รองรับเฉพาะไฟล์รูปภาพเท่านั้น (JPG, PNG, WEBP)" },
        { status: 400 }
      );
    }

    // Vercel ปฏิเสธ request body เกินราว 4.5MB ด้วย 413 ก่อนถึงโค้ดนี้
    // เราจึงกันไว้ต่ำกว่านั้น เพื่อให้ได้ข้อความบอกเหตุผลจริงๆ แทน 413 เปล่าๆ
    const maxSizeBytes = 4 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: "ไฟล์ใหญ่เกินไป (สูงสุด 4MB) กรุณาย่อรูปก่อนอัปโหลด" },
        { status: 400 }
      );
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
