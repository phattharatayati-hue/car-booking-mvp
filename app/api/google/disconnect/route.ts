import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revokeToken } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

function siteBase(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

function back(path: string) {
  return NextResponse.redirect(new URL(path, siteBase()));
}

/** ยกเลิกการเชื่อมปฏิทินของตัวเอง */
export async function POST() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return back("/login");

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) return back("/login");

  if (admin.googleRefreshToken) {
    try {
      await revokeToken(admin.googleRefreshToken);
    } catch (err) {
      console.error("revoke failed:", err);
    }
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: {
      googleEmail: null,
      googleRefreshToken: null,
      googleCalendarId: null,
      googleConnectedAt: null,
    },
  });

  // event เก่าที่ค้างในปฏิทินจะถูกเพิกเฉย — ล้าง id ทิ้งเพื่อไม่ให้ระบบพยายามแก้ต่อ
  await prisma.bookingAssignment.updateMany({
    where: { adminUserId: admin.id },
    data: { googleEventId: null, syncedAt: null, syncError: null },
  });

  return back("/admin/account?gok=disconnected");
}
