import { NextResponse } from "next/server";
import { purgeStaleDocuments, CRON_ACTOR, RETENTION_DAYS } from "@/lib/document-retention";

export const dynamic = "force-dynamic";

/**
 * ลบเอกสารส่วนบุคคลของลูกค้าที่เก็บเกินระยะที่กำหนด — Vercel Cron เรียกสัปดาห์ละครั้ง
 *
 * ตรวจสิทธิ์แบบ fail closed เหมือน cron ตัวอื่น ถ้าไม่ได้ตั้ง CRON_SECRET ปฏิเสธไปเลย
 * ไม่งั้นใครก็ยิง endpoint นี้ให้ลบเอกสารลูกค้าทิ้งได้
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron ยังไม่ได้ตั้งค่า" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await purgeStaleDocuments(CRON_ACTOR);
  return NextResponse.json({ ok: true, retentionDays: RETENTION_DAYS, ...result });
}
