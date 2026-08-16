import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProfileName } from "@/lib/line";

export const dynamic = "force-dynamic";

async function verifyIdToken(idToken: string): Promise<string | null> {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!channelId) {
    console.error("LINE_LOGIN_CHANNEL_ID is not set");
    return null;
  }

  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
  });

  if (!res.ok) {
    console.error("verify id_token failed:", res.status, await res.text());
    return null;
  }

  const payload = (await res.json()) as { sub?: string };
  return payload.sub ?? null;
}

/**
 * ผูก LINE ของลูกค้าเข้ากับเบอร์โทร
 * ใช้จากหน้า "เชื่อมต่อ LINE" ที่ลูกค้ากดเองจากหน้าเว็บ
 */
export async function POST(request: Request) {
  try {
    const { idToken, phone } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: "ไม่พบข้อมูลยืนยันตัวตน" }, { status: 401 });
    }

    const lineUserId = await verifyIdToken(idToken);
    if (!lineUserId) {
      return NextResponse.json({ error: "ยืนยันตัวตนกับ LINE ไม่สำเร็จ" }, { status: 401 });
    }

    const normalized = String(phone ?? "").replace(/[\s-]/g, "");
    if (!/^0\d{8,9}$/.test(normalized)) {
      return NextResponse.json(
        { error: "เบอร์โทรไม่ถูกต้อง กรุณากรอกเบอร์ 10 หลัก" },
        { status: 400 }
      );
    }

    // LINE นี้ผูกกับเบอร์อื่นอยู่แล้วหรือเปล่า — ย้ายมาเบอร์ใหม่
    await prisma.customer.updateMany({
      where: { lineUserId, phone: { not: normalized } },
      data: { lineUserId: null },
    });

    const matched = await prisma.customer.findFirst({ where: { phone: normalized } });
    const name = (await getProfileName(lineUserId)) ?? "ลูกค้า LINE";

    if (matched) {
      await prisma.customer.update({
        where: { id: matched.id },
        data: { lineUserId },
      });

      const bookingCount = await prisma.booking.count({
        where: { customerId: matched.id },
      });

      return NextResponse.json({
        ok: true,
        matched: true,
        name: matched.fullName,
        bookingCount,
      });
    }

    // ยังไม่เคยจอง — สร้างโปรไฟล์ไว้ล่วงหน้า พอจองด้วยเบอร์นี้จะผูกให้อัตโนมัติ
    await prisma.customer.create({
      data: { fullName: name, phone: normalized, lineUserId },
    });

    return NextResponse.json({ ok: true, matched: false, name });
  } catch (err) {
    console.error("line connect failed:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่" }, { status: 500 });
  }
}
