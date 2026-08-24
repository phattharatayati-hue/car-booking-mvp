import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signState } from "@/lib/crypto";
import { authUrl, oauthConfigured } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

function siteBase(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

/** เริ่มเชื่อมบัญชี Google ของแอดมินที่ล็อกอินอยู่ */
export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.redirect(new URL("/login", siteBase()));
  }

  if (!oauthConfigured()) {
    return NextResponse.redirect(
      new URL("/admin/account?gerror=notconfigured", siteBase())
    );
  }

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) {
    return NextResponse.redirect(new URL("/login", siteBase()));
  }

  // state ผูกกับ id ของแอดมินและมีอายุ 10 นาที กันคนยิงลิงก์ callback ปลอม
  const state = signState(
    JSON.stringify({ adminId: admin.id, exp: Date.now() + 10 * 60000 })
  );

  return NextResponse.redirect(authUrl(state));
}
