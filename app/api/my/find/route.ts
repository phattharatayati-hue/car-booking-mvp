import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone, isValidPhone } from "@/lib/customer-session";

export const dynamic = "force-dynamic";

/**
 * ค้นการจองด้วย "รหัสจอง + เบอร์โทร" — สำหรับคนที่จองโดยไม่เข้าสู่ระบบ
 * แล้วเปลี่ยนเครื่องหรือล้างข้อมูลเบราว์เซอร์จนลิงก์หาย
 *
 * ทำไมถึงปลอดภัยพอ ทั้งที่เราเพิ่งเลิกใช้เบอร์เป็นกุญแจไปหมาดๆ
 *   ต้องรู้ "สองอย่างพร้อมกัน" คือรหัส 8 ตัวที่เดาไม่ได้ กับเบอร์ที่ใช้จอง
 *   และเปิดได้แค่ "ใบเดียว" ที่รหัสตรง ไม่ใช่ประวัติทั้งหมดของคนนั้น
 *   ต่างจากช่องโหว่เดิมที่พิมพ์เบอร์อย่างเดียวแล้วเห็นทุกใบ
 *
 * ยังจำกัดจำนวนครั้งไว้กันไล่เดาแบบอัตโนมัติด้วย
 */

/** จำกัดการลองผิดต่อหนึ่ง IP */
const MAX_TRIES = 8;
const WINDOW_MS = 10 * 60 * 1000;

/* ตัวนับอยู่ในหน่วยความจำของ instance เดียว บน serverless จึงกันได้แค่หยาบๆ
   พอสำหรับกันสคริปต์ยิงรัว ถ้าต้องการของจริงจังต้องย้ายไปเก็บในฐานข้อมูล */
const tries = new Map<string, { n: number; until: number }>();

function tooMany(ip: string): boolean {
  const now = Date.now();
  const rec = tries.get(ip);

  if (!rec || rec.until < now) {
    tries.set(ip, { n: 1, until: now + WINDOW_MS });
    return false;
  }
  rec.n += 1;
  return rec.n > MAX_TRIES;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (tooMany(ip)) {
    return NextResponse.json(
      { error: "ลองมากเกินไป กรุณารอสักครู่แล้วลองใหม่" },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const code = String(body?.code ?? "").trim().toLowerCase();
  const phone = normalizePhone(body?.phone);

  if (!/^[a-z0-9]{8}$/.test(code) || !isValidPhone(phone)) {
    return NextResponse.json(
      { error: "กรอกรหัสจอง 8 ตัว และเบอร์โทรที่ใช้จองให้ถูกต้อง" },
      { status: 400 }
    );
  }

  const booking = await prisma.booking.findFirst({
    where: { id: { startsWith: code }, customer: { phone } },
    select: { id: true },
  });

  // ตอบข้อความเดียวกันทั้งกรณีรหัสผิดและเบอร์ผิด ไม่บอกใบ้ว่าผิดตรงไหน
  if (!booking) {
    return NextResponse.json(
      { error: "ไม่พบการจองที่ตรงกับรหัสและเบอร์นี้" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, bookingId: booking.id });
}
