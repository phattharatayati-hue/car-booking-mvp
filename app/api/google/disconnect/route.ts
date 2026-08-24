import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revokeToken, accessTokenFor, deleteEvent } from "@/lib/google-calendar";

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

  // ลบ event ที่ค้างในปฏิทินก่อน แล้วจึงถอนสิทธิ์
  // ถ้า revoke ก่อน จะลบไม่ได้อีกเลย และข้อมูลลูกค้าจะค้างในปฏิทินส่วนตัวถาวร
  if (admin.googleRefreshToken && admin.googleCalendarId) {
    try {
      const token = await accessTokenFor(admin.googleRefreshToken);
      const mine = await prisma.bookingAssignment.findMany({
        where: { adminUserId: admin.id, googleEventId: { not: null } },
        select: { googleEventId: true },
      });
      for (const a of mine) {
        if (!a.googleEventId) continue;
        try {
          await deleteEvent(token, admin.googleCalendarId, a.googleEventId);
        } catch (err) {
          console.error("delete event on disconnect failed:", err);
        }
      }
    } catch (err) {
      console.error("cleanup before revoke failed:", err);
    }
  }

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

  // ล้าง id ทิ้ง เพื่อไม่ให้ระบบพยายามแก้ event ที่ลบไปแล้ว
  await prisma.bookingAssignment.updateMany({
    where: { adminUserId: admin.id },
    data: { googleEventId: null, syncedAt: null, syncError: null },
  });

  return back("/admin/account?gok=disconnected");
}
