import { prisma } from "@/lib/prisma";
import { pushMessage, siteUrl } from "@/lib/line";
import {
  accessTokenFor,
  isAuthExpired,
  renameAppCalendar,
  CALENDAR_NAME,
} from "@/lib/google-calendar";

/**
 * สุขภาพของการเชื่อมปฏิทิน Google ต่อแอดมินหนึ่งคน
 *
 * ทำไมต้องมีไฟล์นี้
 *   เดิมระบบจะรู้ว่าปฏิทินหลุดก็ต่อเมื่อมีการมอบหมายงานแล้ว sync ไม่ผ่าน
 *   คือรู้ตอนที่งานพังไปแล้ว และรู้เฉพาะแอดมินที่เปิดหน้ารายการจองดู
 *   ที่นี่จึงตรวจเชิงรุก แล้วบอกเจ้าตัวทาง LINE ให้ไปเชื่อมใหม่ก่อนงานเข้า
 *
 * หมายเหตุ — ตัวแก้จริงของอาการ "เชื่อมแล้วหลุดทุก 7 วัน" ไม่ได้อยู่ในโค้ด
 * แต่อยู่ที่สถานะ Publishing ของ OAuth consent screen ใน Google Cloud Console
 * (Testing = refresh token หมดอายุใน 7 วันเสมอ) ดู GOOGLE-CALENDAR.md
 */

type AdminRow = {
  id: string;
  name: string;
  lineUserId: string | null;
  googleRefreshToken: string | null;
  googleCalendarId: string | null;
};

/** ล้างสถานะการเชื่อมเมื่อ token ใช้ไม่ได้แล้ว แล้วบอกเจ้าตัว */
export async function markCalendarDisconnected(admin: AdminRow): Promise<void> {
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: {
      googleRefreshToken: null,
      googleConnectedAt: null,
      // เก็บ googleCalendarId กับ googleEmail ไว้ เพื่อให้เชื่อมใหม่แล้วใช้ปฏิทินใบเดิมต่อ
      // ไม่งั้นจะได้ปฏิทินใหม่ทุกครั้งที่หลุด แล้วงานเก่ากระจายอยู่หลายใบ
    },
  });

  if (!admin.lineUserId) return;

  await pushMessage(
    admin.lineUserId,
    [
      "⚠️ การเชื่อมปฏิทิน Google หลุดแล้ว",
      "",
      `คุณ${admin.name} — งานรับ-ส่งรถที่มอบหมายให้คุณจะไม่ขึ้นในปฏิทินจนกว่าจะเชื่อมใหม่`,
      "",
      "เข้าหน้า บัญชีของฉัน แล้วกดเชื่อมปฏิทินอีกครั้ง ใช้เวลาไม่ถึงนาที",
      `${siteUrl()}/admin/account`,
    ].join("\n")
  ).catch((err) => console.error("notify calendar disconnect failed:", err));
}

export type HealthResult = {
  /** จำนวนแอดมินที่เชื่อมปฏิทินไว้ทั้งหมด */
  checked: number;
  /** ต่ออายุ token ได้ปกติ — ไม่ใช้ชื่อ ok เพราะไปชนกับ ok ของ response */
  healthy: number;
  /** สิทธิ์หมดอายุ ตัดการเชื่อมและแจ้งเจ้าตัวแล้ว */
  expired: number;
  /** เปลี่ยนชื่อปฏิทินให้ตรงกับชื่อปัจจุบันสำเร็จ */
  renamed: number;
};

/**
 * ตรวจแอดมินทุกคนที่เชื่อมปฏิทินไว้
 *   ต่ออายุ token ได้     → ผ่าน และถือโอกาสแก้ชื่อปฏิทินให้ตรงชื่อปัจจุบัน
 *   ได้ invalid_grant     → ล้างสถานะ + แจ้งเจ้าตัวทาง LINE
 *   error อื่น (เน็ต/ล่ม) → ปล่อยไว้ ไม่ตัดการเชื่อม เพราะหายเองได้
 */
export async function checkAllCalendars(): Promise<HealthResult> {
  const admins = await prisma.adminUser.findMany({
    where: { googleRefreshToken: { not: null } },
    select: {
      id: true,
      name: true,
      lineUserId: true,
      googleRefreshToken: true,
      googleCalendarId: true,
    },
  });

  const result: HealthResult = {
    checked: admins.length,
    healthy: 0,
    expired: 0,
    renamed: 0,
  };

  for (const admin of admins) {
    if (!admin.googleRefreshToken) continue;

    try {
      const token = await accessTokenFor(admin.googleRefreshToken);
      result.healthy++;

      if (admin.googleCalendarId) {
        try {
          await renameAppCalendar(token, admin.googleCalendarId);
          result.renamed++;
        } catch (err) {
          // เปลี่ยนชื่อไม่สำเร็จไม่ใช่เรื่องคอขาดบาดตาย ปล่อยผ่าน
          console.error(`rename calendar failed for ${admin.id}:`, err);
        }
      }
    } catch (err) {
      if (isAuthExpired(err)) {
        result.expired++;
        await markCalendarDisconnected(admin);
      } else {
        console.error(`calendar health check failed for ${admin.id}:`, err);
      }
    }
  }

  return result;
}

/** ชื่อปฏิทินปัจจุบัน — ใช้แสดงในหน้าตั้งค่าและคู่มือ */
export const CURRENT_CALENDAR_NAME = CALENDAR_NAME;
