import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/roles";

/**
 * ใครส่งออกข้อมูลทั้งระบบได้
 *
 * ต้องเป็นบัญชี DEV เท่านั้น และถ้าตั้ง env `EXPORT_OWNER_EMAIL` ไว้
 * ต้องเป็นอีเมลนั้นเท่านั้น (ใช้ล็อกให้เหลือคนเดียวแม้มี DEV หลายบัญชี)
 */
export function isExportOwner(
  me: { role: string; email: string } | null | undefined
): boolean {
  if (!me || me.role !== "DEV") return false;
  const only = process.env.EXPORT_OWNER_EMAIL?.trim().toLowerCase();
  return !only || me.email.toLowerCase() === only;
}

/** ใช้บนสุดของหน้า export — ไม่ผ่านจะเด้งกลับแดชบอร์ด */
export async function requireExportOwner() {
  const me = await currentAdmin();
  if (!me) redirect("/login");
  if (!isExportOwner(me)) redirect("/admin?error=forbidden");
  return me;
}
