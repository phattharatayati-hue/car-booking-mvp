import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  CUSTOMER_COOKIE,
  SESSION_TTL_MS,
  createSessionToken,
} from "@/lib/customer-session";
import {
  LINE_STATE_COOKIE,
  exchangeCode,
  readState,
  verifyIdToken,
} from "@/lib/line-login";
import { getProfileName } from "@/lib/line";

export const dynamic = "force-dynamic";

/**
 * LINE ส่งผู้ใช้กลับมาที่นี่พร้อม code
 *
 * บัญชี LINE ที่ LINE ยืนยันแล้ว = ตัวตนของลูกค้า
 * ยังไม่มีในระบบก็สร้างให้เลย ไม่ต้องถามเบอร์ตรงนี้
 * (เบอร์จะได้ตอนกรอกฟอร์มจอง ซึ่งเป็นข้อมูลติดต่อ ไม่ใช่กุญแจเข้าระบบ)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");

  const jar = await cookies();
  const saved = readState(jar.get(LINE_STATE_COOKIE)?.value);

  const fail = (reason: string) => {
    const res = NextResponse.redirect(new URL(`/my?e=${reason}`, request.url));
    res.cookies.delete(LINE_STATE_COOKIE);
    return res;
  };

  // ผู้ใช้กดยกเลิกที่หน้า LINE ก็มาทางนี้ — ไม่ใช่ข้อผิดพลาดของระบบ
  if (url.searchParams.get("error")) return fail("cancelled");
  if (!code || !saved || !returnedState || returnedState !== saved.state) {
    return fail("state");
  }

  const idToken = await exchangeCode(code);
  if (!idToken) return fail("exchange");

  const profile = await verifyIdToken(idToken, saved.nonce);
  if (!profile) return fail("verify");

  let customer = await prisma.customer.findUnique({
    where: { lineUserId: profile.lineUserId },
  });

  if (!customer) {
    const name =
      profile.name || (await getProfileName(profile.lineUserId)) || "ลูกค้า LINE";
    customer = await prisma.customer.create({
      data: { fullName: name, phone: "", lineUserId: profile.lineUserId },
    });
  }

  if (customer.isBlacklisted) return fail("blocked");

  const res = NextResponse.redirect(new URL(saved.next, request.url));
  res.cookies.delete(LINE_STATE_COOKIE);
  res.cookies.set(CUSTOMER_COOKIE, createSessionToken(customer.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return res;
}
