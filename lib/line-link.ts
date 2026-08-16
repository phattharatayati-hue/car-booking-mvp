import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/** รหัสผูกบัญชีมีอายุ 10 นาที */
export const LINK_CODE_TTL_MS = 10 * 60 * 1000;

/**
 * สร้างรหัส 6 หลักสำหรับผูก LINE ให้แอดมินคนหนึ่ง
 * รหัสเดิม (ถ้ามี) จะถูกแทนที่ทันที
 */
export async function createLinkCode(adminUserId: string): Promise<string> {
  // สุ่มจนกว่าจะได้รหัสที่ไม่ซ้ำกับที่ยังไม่หมดอายุ
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

    const clash = await prisma.adminUser.findUnique({ where: { lineLinkCode: code } });
    if (clash) continue;

    await prisma.adminUser.update({
      where: { id: adminUserId },
      data: {
        lineLinkCode: code,
        lineLinkExpiresAt: new Date(Date.now() + LINK_CODE_TTL_MS),
      },
    });

    return code;
  }

  throw new Error("ไม่สามารถสร้างรหัสได้ กรุณาลองใหม่");
}

export type LinkResult =
  | { ok: true; name: string }
  | { ok: false; reason: "not_found" | "expired" | "already_linked" };

/**
 * ใช้รหัสเพื่อผูก LINE User ID เข้ากับบัญชีแอดมิน
 * รหัสใช้ได้ครั้งเดียว — ผูกสำเร็จแล้วจะถูกล้างทิ้ง
 */
export async function consumeLinkCode(
  code: string,
  lineUserId: string
): Promise<LinkResult> {
  const admin = await prisma.adminUser.findUnique({ where: { lineLinkCode: code } });

  if (!admin) return { ok: false, reason: "not_found" };

  if (!admin.lineLinkExpiresAt || admin.lineLinkExpiresAt.getTime() < Date.now()) {
    // หมดอายุแล้ว — ล้างทิ้งเลยกันคนเดารหัสซ้ำ
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lineLinkCode: null, lineLinkExpiresAt: null },
    });
    return { ok: false, reason: "expired" };
  }

  // LINE นี้ผูกกับแอดมินคนอื่นอยู่แล้วหรือเปล่า
  const taken = await prisma.adminUser.findFirst({
    where: { lineUserId, NOT: { id: admin.id } },
  });
  if (taken) return { ok: false, reason: "already_linked" };

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lineUserId, lineLinkCode: null, lineLinkExpiresAt: null },
  });

  return { ok: true, name: admin.name };
}
