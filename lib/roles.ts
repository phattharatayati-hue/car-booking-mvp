/**
 * สิทธิ์ผู้ใช้หลังบ้าน
 * ADMIN = พนักงานทั่วไป · DEV = ผู้ดูแลระบบ (เห็นหน้าตั้งค่าระบบและจัดการแอดมิน)
 * บัญชี DEV จะถูกซ่อนจากรายชื่อที่แอดมินทั่วไปเห็น
 */

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type Role = "ADMIN" | "DEV";

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "แอดมิน",
  DEV: "ผู้ดูแลระบบ",
};

/** เส้นทางที่เฉพาะ DEV เท่านั้นที่เข้าได้ */
export const DEV_ONLY_PATHS = ["/admin/users", "/admin/settings"];

/** ผู้ใช้ที่ล็อกอินอยู่ (อ่านจากฐานข้อมูล เพราะ session เก็บแค่อีเมล) */
export async function currentAdmin() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  return prisma.adminUser.findUnique({ where: { email } });
}

export async function isDev(): Promise<boolean> {
  const me = await currentAdmin();
  return me?.role === "DEV";
}

/** ใช้บนสุดของหน้า/แอ็กชันที่ให้เฉพาะ DEV — ไม่ผ่านจะเด้งกลับแดชบอร์ด */
export async function requireDev() {
  const me = await currentAdmin();
  if (!me) redirect("/login");
  if (me.role !== "DEV") redirect("/admin?error=forbidden");
  return me;
}
