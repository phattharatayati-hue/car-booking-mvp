/**
 * สิทธิ์ผู้ใช้หลังบ้าน
 *
 *   ADMIN  พนักงานทั่วไป — ใช้หลังบ้านได้ ยกเว้นหน้าตั้งค่าและจัดการแอดมิน
 *   DEV    ผู้ดูแลระบบ — ได้ทุกอย่าง และบัญชี DEV ถูกซ่อนจากรายชื่อที่คนอื่นเห็น
 *   DRIVER คนรับ-ส่งรถ — รับงานทางแชท LINE เท่านั้น
 *          เข้าหลังบ้านได้แค่หน้า "บัญชีของฉัน" เพื่อผูก LINE และเชื่อมปฏิทิน
 */

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type Role = "ADMIN" | "DEV" | "DRIVER";

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "แอดมิน",
  DEV: "ผู้ดูแลระบบ",
  DRIVER: "คนรับ-ส่งรถ",
};

/** หน้าเดียวที่คนรับ-ส่งรถเข้าได้ — ไว้ผูก LINE และเชื่อมปฏิทินของตัวเอง */
export const DRIVER_ALLOWED_PATHS = ["/admin/account"];

/** เส้นทางที่เฉพาะ DEV เท่านั้นที่เข้าได้ */
export const DEV_ONLY_PATHS = ["/admin/users", "/admin/settings", "/admin/audit"];

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

export async function isDriver(): Promise<boolean> {
  const me = await currentAdmin();
  return me?.role === "DRIVER";
}

/**
 * ใช้บนสุดของทุกหน้าหลังบ้านที่ไม่ใช่ "บัญชีของฉัน"
 * คนรับ-ส่งรถจะถูกเด้งออก เพราะไม่ควรเห็นรายการจอง เอกสารลูกค้า หรือรายได้
 */
export async function requireStaff() {
  const me = await currentAdmin();
  if (!me) redirect("/login");
  if (me.role === "DRIVER") redirect("/admin/account?driver=1");
  return me;
}

/** ใช้บนสุดของหน้า/แอ็กชันที่ให้เฉพาะ DEV — ไม่ผ่านจะเด้งกลับแดชบอร์ด */
export async function requireDev() {
  const me = await currentAdmin();
  if (!me) redirect("/login");
  if (me.role !== "DEV") redirect("/admin?error=forbidden");
  return me;
}
