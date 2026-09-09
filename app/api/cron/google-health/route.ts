import { NextResponse } from "next/server";
import { checkAllCalendars } from "@/lib/google-health";
import { oauthConfigured } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

/**
 * ตรวจสุขภาพการเชื่อมปฏิทินของแอดมินทุกคน — ตั้งไว้ให้ Vercel Cron เรียกสัปดาห์ละครั้ง
 *
 * ตรวจสิทธิ์แบบเดียวกับ /api/cron/reminders คือ fail closed
 * ถ้าไม่ได้ตั้ง CRON_SECRET ปฏิเสธไปเลย ไม่งั้น endpoint นี้จะเปิดสาธารณะ
 * แล้วใครก็ยิงให้ส่ง LINE หาแอดมินได้
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron ยังไม่ได้ตั้งค่า" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!oauthConfigured()) {
    return NextResponse.json({ ok: true, skipped: "ยังไม่ได้ตั้งค่า Google OAuth" });
  }

  const result = await checkAllCalendars();
  return NextResponse.json({ ok: true, ...result });
}
