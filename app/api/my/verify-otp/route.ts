import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  CUSTOMER_COOKIE,
  SESSION_TTL_MS,
  createSessionToken,
  normalizePhone,
  isValidPhone,
} from "@/lib/customer-session";

export const dynamic = "force-dynamic";

/** กรอกรหัสผิดได้ 5 ครั้งต่อรหัสหนึ่งชุด */
const MAX_ATTEMPTS = 5;

function hash(code: string, phone: string): string {
  return crypto
    .createHmac("sha256", process.env.AUTH_SECRET ?? "")
    .update(`${phone}:${code}`)
    .digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = normalizePhone(body?.phone);
    const code = String(body?.code ?? "").trim();

    if (!isValidPhone(phone) || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "รหัสไม่ถูกต้อง" }, { status: 400 });
    }

    const otp = await prisma.customerOtp.findUnique({ where: { phone } });

    if (!otp || otp.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "รหัสหมดอายุแล้ว กรุณาขอรหัสใหม่" },
        { status: 400 }
      );
    }

    if (otp.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: "กรอกรหัสผิดหลายครั้งเกินไป กรุณาขอรหัสใหม่" },
        { status: 429 }
      );
    }

    const given = Buffer.from(hash(code, phone));
    const stored = Buffer.from(otp.codeHash);
    const match =
      given.length === stored.length && crypto.timingSafeEqual(given, stored);

    if (!match) {
      await prisma.customerOtp.update({
        where: { phone },
        data: { attempts: { increment: 1 } },
      });
      const left = MAX_ATTEMPTS - otp.attempts - 1;
      return NextResponse.json(
        {
          error:
            left > 0
              ? `รหัสไม่ถูกต้อง เหลืออีก ${left} ครั้ง`
              : "กรอกรหัสผิดหลายครั้งเกินไป กรุณาขอรหัสใหม่",
        },
        { status: 400 }
      );
    }

    // รหัสใช้ได้ครั้งเดียว
    await prisma.customerOtp.delete({ where: { phone } });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(CUSTOMER_COOKIE, createSessionToken(phone), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });
    return res;
  } catch (err) {
    console.error("verify otp failed:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่" }, { status: 500 });
  }
}
