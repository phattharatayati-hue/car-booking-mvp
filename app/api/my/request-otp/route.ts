import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pushMessage } from "@/lib/line";
import { normalizePhone, isValidPhone } from "@/lib/customer-session";

export const dynamic = "force-dynamic";

/** OTP มีอายุ 5 นาที */
const OTP_TTL_MS = 5 * 60 * 1000;
/** ขอรหัสใหม่ได้ทุก 60 วินาที */
const RESEND_COOLDOWN_MS = 60 * 1000;

function hash(code: string, phone: string): string {
  return crypto
    .createHmac("sha256", process.env.AUTH_SECRET ?? "")
    .update(`${phone}:${code}`)
    .digest("hex");
}

/**
 * ส่งรหัส 6 หลักไปทางแชท LINE ของลูกค้า
 *
 * ตอบข้อความเดียวกันเสมอไม่ว่าเบอร์นั้นจะมีอยู่จริงหรือไม่
 * เพื่อไม่ให้ใครไล่เดาว่าเบอร์ไหนเป็นลูกค้าของร้าน
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = normalizePhone(body?.phone);

    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { error: "เบอร์โทรไม่ถูกต้อง กรุณากรอกเบอร์ 10 หลัก" },
        { status: 400 }
      );
    }

    const existing = await prisma.customerOtp.findUnique({ where: { phone } });
    if (
      existing &&
      Date.now() - existing.updatedAt.getTime() < RESEND_COOLDOWN_MS
    ) {
      const wait = Math.ceil(
        (RESEND_COOLDOWN_MS - (Date.now() - existing.updatedAt.getTime())) / 1000
      );
      return NextResponse.json(
        { error: `ขอรหัสใหม่ได้ในอีก ${wait} วินาที` },
        { status: 429 }
      );
    }

    // ต้องเคยเชื่อมต่อ LINE ไว้ก่อน ไม่งั้นส่งรหัสไปไหนไม่ได้
    const linked = await prisma.customer.findFirst({
      where: { phone, lineUserId: { not: null } },
      select: { lineUserId: true },
    });

    if (linked?.lineUserId) {
      const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

      await prisma.customerOtp.upsert({
        where: { phone },
        create: {
          phone,
          codeHash: hash(code, phone),
          expiresAt: new Date(Date.now() + OTP_TTL_MS),
        },
        update: {
          codeHash: hash(code, phone),
          expiresAt: new Date(Date.now() + OTP_TTL_MS),
          attempts: 0,
        },
      });

      await pushMessage(
        linked.lineUserId,
        `รหัสยืนยันสำหรับดูประวัติการจองของคุณคือ ${code}\n\nรหัสมีอายุ 5 นาที\nถ้าคุณไม่ได้เป็นคนขอ ไม่ต้องทำอะไรและอย่าบอกรหัสนี้กับใคร`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("request otp failed:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่" }, { status: 500 });
  }
}
