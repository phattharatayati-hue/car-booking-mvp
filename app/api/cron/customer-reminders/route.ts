import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import {
  cronAuthError,
  sendPickupReminders,
  sendReturnReminders,
} from "@/lib/customer-reminders";

export const dynamic = "force-dynamic";

/**
 * เตือนลูกค้าตามเวลานัด — ยิงถี่ ๆ ได้ (แนะนำทุก 15 นาที)
 *
 * แยกจาก /api/cron/reminders เพราะตัวนั้นมีสรุปให้แอดมินที่ควรส่งวันละครั้ง
 * ถ้าเอามารวมแล้วยิงทุก 15 นาที แอดมินจะได้ข้อความสรุปซ้ำทั้งวัน
 *
 * Vercel Hobby ตั้ง cron ถี่กว่าวันละครั้งไม่ได้ — ใช้ cron ภายนอก (เช่น cron-job.org)
 * ยิง GET มาที่ /api/cron/customer-reminders พร้อม header
 *   Authorization: Bearer <CRON_SECRET>   หรือ   ?key=<CRON_SECRET>
 */
export async function GET(request: Request) {
  const authErr = cronAuthError(request);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  const force = new URL(request.url).searchParams.get("force") === "1";
  const settings = await getSettings();

  const pickup = await sendPickupReminders(settings);
  const ret = await sendReturnReminders(settings, force);

  return NextResponse.json({ ok: true, pickup, return: ret });
}
