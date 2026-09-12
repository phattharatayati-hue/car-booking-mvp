import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentAdmin } from "@/lib/roles";
import { auditAs } from "@/lib/audit";

/**
 * บันทึกลายเซ็นของ "ตัวเอง" เท่านั้น
 *
 * ไม่มีพารามิเตอร์บอกว่าจะบันทึกให้ใคร — ใช้ id จากเซสชันตรง ๆ
 * เพื่อไม่ให้มีทางเขียนลายเซ็นทับบัญชีคนอื่นได้เลยแม้จะยิง request เอง
 */
export async function POST(request: Request) {
  const me = await currentAdmin();
  if (!me) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const raw = (body as { signatureUrl?: unknown })?.signatureUrl;

  // null = ขอลบลายเซ็นออก
  if (raw !== null) {
    if (typeof raw !== "string" || !raw.startsWith("/api/file?p=signatures")) {
      return NextResponse.json({ error: "ไฟล์ลายเซ็นไม่ถูกต้อง" }, { status: 400 });
    }
  }

  const signatureUrl = raw === null ? null : (raw as string);

  await prisma.adminUser.update({
    where: { id: me.id },
    data: { signatureUrl },
  });

  await auditAs(
    { id: me.id, name: me.name, role: me.role },
    {
      action: "user.signature",
      summary: signatureUrl ? "บันทึกลายเซ็นของตัวเอง" : "ลบลายเซ็นของตัวเอง",
      entity: "user",
      entityId: me.id,
    }
  );

  return NextResponse.json({ ok: true });
}
