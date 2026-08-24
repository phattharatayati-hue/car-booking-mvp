import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyState, encryptSecret } from "@/lib/crypto";
import {
  exchangeCode,
  googleEmail,
  createAppCalendar,
  GOOGLE_SCOPE,
} from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

function siteBase(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

function back(path: string) {
  return NextResponse.redirect(new URL(path, siteBase()));
}

/** Google ส่งกลับมาที่นี่หลังแอดมินกดอนุญาต */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get("error")) {
    return back("/admin/account?gerror=denied");
  }

  const code = searchParams.get("code");
  const rawState = searchParams.get("state");
  if (!code || !rawState) return back("/admin/account?gerror=state");

  const payload = verifyState(rawState);
  if (!payload) return back("/admin/account?gerror=state");

  let adminId = "";
  try {
    const parsed = JSON.parse(payload) as { adminId: string; exp: number };
    if (!parsed.adminId || parsed.exp < Date.now()) {
      return back("/admin/account?gerror=expired");
    }
    adminId = parsed.adminId;
  } catch {
    return back("/admin/account?gerror=state");
  }

  try {
    const token = await exchangeCode(code);

    // ต้องได้ scope ที่ขอไว้จริง ไม่งั้นสร้างปฏิทินไม่ได้
    if (token.scope && !token.scope.includes(GOOGLE_SCOPE)) {
      return back("/admin/account?gerror=scope");
    }

    const accessToken = token.access_token ?? "";
    const email = await googleEmail(accessToken);

    // สร้างปฏิทินแยกให้คนนี้ ถ้ายังไม่มี
    const existing = await prisma.adminUser.findUnique({ where: { id: adminId } });
    const calendarId =
      existing?.googleCalendarId ?? (await createAppCalendar(accessToken));

    await prisma.adminUser.update({
      where: { id: adminId },
      data: {
        googleEmail: email,
        googleRefreshToken: encryptSecret(token.refresh_token as string),
        googleCalendarId: calendarId,
        googleConnectedAt: new Date(),
      },
    });

    return back("/admin/account?gok=connected");
  } catch (err) {
    console.error("google callback failed:", err);
    return back("/admin/account?gerror=failed");
  }
}
