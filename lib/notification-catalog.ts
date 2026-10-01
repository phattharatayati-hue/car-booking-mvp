/**
 * รายการแจ้งเตือน LINE ทั้งหมดของระบบ — ตัวเดียวที่หน้า /admin/notifications และโค้ดส่งข้อความใช้ร่วมกัน
 *
 *   instant = ส่งทันทีเมื่อเกิดเหตุการณ์ (เปิด/ปิดได้อย่างเดียว)
 *   before  = ส่งก่อนเวลานัด X นาที
 *   daily   = ส่งตามเวลาที่ตั้ง (HH:MM เวลาไทย) — ความหมายของ "วันไหน" ดูที่ dailyHint
 *
 * ไม่ใส่ในรายการนี้: ข้อความที่แอดมินกดส่งเอง (อัปเดตการจอง ใบเสร็จ โอนเงินประกันคืน การ์ดงานคนขับ)
 * และข้อความตอบกลับในแชท เพราะเกิดจากการกดปุ่มของคนอยู่แล้ว
 */

export type NotifyMode = "instant" | "before" | "daily";
export type Audience = "customer" | "admin";

export type NotificationDef = {
  key: string;
  audience: Audience;
  title: string;
  description: string;
  modes: NotifyMode[];
  defaults: { enabled: boolean; mode: NotifyMode; beforeMinutes?: number; dailyTime?: string };
  /** อธิบายโหมดรายวันของอันนี้ เช่น "วันก่อนรับรถ เวลา..." */
  dailyHint?: string;
  beforeHint?: string;
};

export const NOTIFICATIONS: NotificationDef[] = [
  // ---------- ลูกค้า ----------
  {
    key: "customer_slip_received",
    audience: "customer",
    title: "ได้รับสลิปค่าจองแล้ว",
    description: "ส่งทันทีที่ลูกค้าแนบสลิป พร้อมปุ่มส่งเอกสาร",
    modes: ["instant"],
    defaults: { enabled: true, mode: "instant" },
  },
  {
    key: "customer_deposit_confirmed",
    audience: "customer",
    title: "ยืนยันการจองแล้ว / พร้อมรับรถ",
    description: "ส่งเมื่อแอดมินยืนยันค่าจอง และอีกครั้งเมื่อเอกสารผ่านครบ (สรุปยอดวันรับรถ)",
    modes: ["instant"],
    defaults: { enabled: true, mode: "instant" },
  },
  {
    key: "customer_pickup_reminder",
    audience: "customer",
    title: "ให้ลูกค้ายืนยันการรับรถ",
    description: "การ์ดให้กด ยืนยันมารับรถตามนัด / ขอเปลี่ยนนัด",
    modes: ["before", "daily"],
    defaults: { enabled: true, mode: "before", beforeMinutes: 24 * 60, dailyTime: "18:00" },
    beforeHint: "ก่อนเวลารับรถ",
    dailyHint: "ส่งวันก่อนวันรับรถ ตามเวลานี้",
  },
  {
    key: "customer_return_reminder",
    audience: "customer",
    title: "เตือนก่อนคืนรถ",
    description: "ให้คืนรถตามเวลาและสถานที่ที่นัด พร้อมเรื่องค่าคืนล่าช้า",
    modes: ["before", "daily"],
    defaults: { enabled: true, mode: "before", beforeMinutes: 120, dailyTime: "08:00" },
    beforeHint: "ก่อนเวลาคืนรถ",
    dailyHint: "ส่งเช้าวันที่ต้องคืนรถ ตามเวลานี้",
  },
  {
    key: "customer_return_complete",
    audience: "customer",
    title: "คืนรถเรียบร้อย / แจ้งบัญชีรับเงินประกัน",
    description: "ส่งเมื่อคนรับรถปิดงานรับรถคืน",
    modes: ["instant"],
    defaults: { enabled: true, mode: "instant" },
  },
  // ---------- แอดมิน ----------
  {
    key: "admin_slip_uploaded",
    audience: "admin",
    title: "ลูกค้าส่งสลิปค่าจอง",
    description: "แจ้งแอดมินทุกคนให้ตรวจสลิป",
    modes: ["instant"],
    defaults: { enabled: true, mode: "instant" },
  },
  {
    key: "admin_documents_uploaded",
    audience: "admin",
    title: "ลูกค้าส่งเอกสาร",
    description: "แจ้งเมื่อลูกค้าอัปโหลดบัตรประชาชน ใบขับขี่ หรือเอกสารเดินทาง",
    modes: ["instant"],
    defaults: { enabled: true, mode: "instant" },
  },
  {
    key: "admin_new_request",
    audience: "admin",
    title: "คำขอจองรถพาร์ทเนอร์ / จองในแชท",
    description: "แจ้งเมื่อมีคำขอที่ต้องเช็คกับเจ้าของรถ หรือการจองที่เกิดในแชท LINE",
    modes: ["instant"],
    defaults: { enabled: true, mode: "instant" },
  },
  {
    key: "admin_pickup_reply",
    audience: "admin",
    title: "ลูกค้ายืนยัน / ขอเปลี่ยนนัดรับรถ",
    description: "แจ้งเมื่อลูกค้ากดปุ่มในการ์ดยืนยันการรับรถ",
    modes: ["instant"],
    defaults: { enabled: true, mode: "instant" },
  },
  {
    key: "admin_unassigned_jobs",
    audience: "admin",
    title: "งานรับ-ส่งรถที่ยังไม่มีคนรับ",
    description: "ทวงงานส่งรถ/รับรถคืนที่ยังไม่ได้มอบหมาย",
    modes: ["before", "daily"],
    defaults: { enabled: true, mode: "daily", beforeMinutes: 24 * 60, dailyTime: "09:00" },
    beforeHint: "เช็คงานที่จะถึงภายใน (ส่งครั้งเดียวต่องาน)",
    dailyHint: "สรุปทุกวันตามเวลานี้ (งานภายใน 24 ชม.)",
  },
  {
    key: "admin_unpaid_digest",
    audience: "admin",
    title: "สรุปใบจองที่ยังไม่โอน",
    description: "จำนวนใบที่รอสลิป และใบที่ถูกยกเลิกอัตโนมัติเพราะไม่โอน",
    modes: ["daily"],
    defaults: { enabled: true, mode: "daily", dailyTime: "09:00" },
    dailyHint: "สรุปทุกวันตามเวลานี้",
  },
];

export const NOTIFICATION_KEYS = NOTIFICATIONS.map((n) => n.key);

export function notificationDef(key: string): NotificationDef | undefined {
  return NOTIFICATIONS.find((n) => n.key === key);
}

/** "1 วัน 2 ชม." จากจำนวนนาที */
export function minutesLabel(m: number): string {
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  const parts = [d ? `${d} วัน` : "", h ? `${h} ชม.` : "", mm ? `${mm} นาที` : ""].filter(Boolean);
  return parts.join(" ") || "0 นาที";
}
