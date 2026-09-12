import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentAdmin } from "@/lib/roles";
import { SETTINGS_ID } from "@/lib/settings";
import { auditAs } from "@/lib/audit";

/** ตราประทับเป็นของบริษัท ไม่ใช่ของบุคคล — ให้ผู้ดูแลระบบเท่านั้นที่เปลี่ยนได้ */
export async function POST(request: Request) {
  const me = await currentAdmin();
  if (!me) return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  if (me.role !== "DEV") {
    return NextResponse.json({ error: "เฉพาะผู้ดูแลระบบเท่านั้น" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const raw = (body as { stampUrl?: unknown })?.stampUrl;

  if (raw !== null) {
    if (typeof raw !== "string" || !raw.startsWith("/api/file?p=signatures")) {
      return NextResponse.json({ error: "ไฟล์ตราประทับไม่ถูกต้อง" }, { status: 400 });
    }
  }
  const stampUrl = raw === null ? null : (raw as string);

  await prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, stampUrl },
    update: { stampUrl },
  });

  await auditAs(
    { id: me.id, name: me.name, role: me.role },
    {
      action: "settings.stamp",
      summary: stampUrl ? "อัปโหลดตราประทับบริษัท" : "ลบตราประทับบริษัท",
      entity: "settings",
    }
  );

  return NextResponse.json({ ok: true });
}
