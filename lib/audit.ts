import { prisma } from "@/lib/prisma";

/**
 * บันทึกประวัติการใช้งานหลังบ้าน
 *
 * หลักการ
 *   - เขียน log ต้องไม่ทำให้งานหลักพัง จึง try/catch ทุกจุด
 *   - ไม่ import lib/auth.ts แบบปกติ เพราะ lib/auth.ts เรียก auditAs()
 *     ถ้า import ตรงจะวนกันเอง (circular import) จึงใช้ dynamic import ใน audit()
 *   - ห้ามเก็บรหัสผ่าน สลิป หรือข้อมูลบัตรลูกค้าลง detail
 */

export type AuditActor = {
  id: string | null;
  name: string;
  role: string | null;
};

export type AuditInput = {
  /** รหัสการกระทำ เช่น "booking.deposit_confirm" */
  action: string;
  /** ข้อความไทยอ่านง่าย ใช้แสดงในหน้าประวัติ */
  summary: string;
  entity?: string;
  entityId?: string;
  detail?: string;
};

/** กลุ่มของ action — ใช้ทำตัวกรองในหน้าประวัติ */
export const AUDIT_GROUPS: Record<string, string> = {
  auth: "เข้าสู่ระบบ",
  booking: "การจอง",
  assignment: "มอบหมายงาน",
  car: "รถและเรทราคา",
  user: "จัดการผู้ใช้",
  settings: "ตั้งค่าระบบ",
  master: "ข้อมูลพื้นฐาน",
};

/** ป้ายไทยของแต่ละ action — ที่ไม่มีในนี้จะใช้ summary แทน */
export const AUDIT_LABEL: Record<string, string> = {
  "auth.login": "เข้าสู่ระบบ",
  "auth.login_failed": "เข้าสู่ระบบไม่สำเร็จ",

  "booking.deposit_confirm": "ยืนยันค่าจอง",
  "booking.deposit_reject": "ปฏิเสธสลิปค่าจอง",
  "booking.document_approve": "อนุมัติเอกสาร",
  "booking.document_reject": "ปฏิเสธเอกสาร",
  "booking.request_approve": "อนุมัติคำขอ",
  "booking.request_reject": "ปฏิเสธคำขอ",
  "booking.cancel": "ยกเลิกการจอง",

  "assignment.assign": "มอบหมายงานรับ-ส่งรถ",
  "assignment.unassign": "ถอนคนออกจากงาน",
  "assignment.resync": "ซิงก์ปฏิทินใหม่",

  "car.status_toggle": "เปลี่ยนสถานะรถ",
  "car.rate_save": "บันทึกเรทราคาตามช่วงวัน",
  "car.rate_delete": "ลบเรทราคาตามช่วงวัน",

  "user.create": "สร้างบัญชีผู้ใช้",
  "user.delete": "ลบบัญชีผู้ใช้",
  "user.password_reset": "ตั้งรหัสผ่านใหม่ให้ผู้อื่น",
  "user.password_change": "เปลี่ยนรหัสผ่านตัวเอง",
  "user.role_change": "เปลี่ยนประเภทบัญชี",
  "user.line_unlink": "ตัดการผูก LINE",
  "user.line_link_code": "ขอรหัสผูก LINE",
  "user.calendar_disconnect": "ตัดการเชื่อมปฏิทิน",

  "settings.save": "บันทึกตั้งค่าระบบ",

  "master.after_hours_save": "บันทึกค่าบริการนอกเวลา",
  "master.after_hours_delete": "ลบค่าบริการนอกเวลา",
  "master.partner_add": "เพิ่มพาร์ตเนอร์",
  "master.partner_toggle": "เปิด/ปิดพาร์ตเนอร์",
  "master.partner_delete": "ลบพาร์ตเนอร์",
  "master.point_add": "เพิ่มจุดรับ-ส่งรถ",
  "master.point_toggle": "เปิด/ปิดจุดรับ-ส่งรถ",
  "master.point_delete": "ลบจุดรับ-ส่งรถ",
};

/** กลุ่มของ action (ส่วนหน้าก่อนจุด) */
export function auditGroup(action: string): string {
  return action.split(".")[0] ?? "other";
}

/** เขียน log โดยระบุคนทำมาเอง — ใช้ตอนที่ยังไม่มี session (เช่น หน้าล็อกอิน) */
export async function auditAs(actor: AuditActor, input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorName: actor.name.slice(0, 120),
        actorRole: actor.role,
        action: input.action,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
        summary: input.summary.slice(0, 500),
        detail: input.detail ? input.detail.slice(0, 2000) : null,
      },
    });
  } catch (err) {
    // ประวัติเขียนไม่ได้ ต้องไม่ทำให้งานที่ผู้ใช้กดล้มเหลว
    console.error("audit write failed:", input.action, err);
  }
}

/** เขียน log ของคนที่ล็อกอินอยู่ — ใช้ในหน้าหลังบ้านทั้งหมด */
export async function audit(input: AuditInput): Promise<void> {
  try {
    // dynamic import เพื่อตัดวงจร import กับ lib/auth.ts
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    const email = session?.user?.email;

    if (!email) {
      await auditAs({ id: null, name: "ไม่ทราบผู้ใช้", role: null }, input);
      return;
    }

    const me = await prisma.adminUser.findUnique({ where: { email } });
    await auditAs(
      {
        id: me?.id ?? null,
        name: me?.name ?? email,
        role: me?.role ?? null,
      },
      input
    );
  } catch (err) {
    console.error("audit failed:", input.action, err);
  }
}
