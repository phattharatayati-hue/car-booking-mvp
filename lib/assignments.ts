/**
 * งานมอบหมายรับ-ส่งรถ — ค่าคงที่และตัวช่วยที่ไม่แตะฐานข้อมูล
 * (ห้าม import prisma ที่นี่ เพราะ component ฝั่ง client ใช้ป้ายกำกับจากไฟล์นี้)
 */

export type HandoffKind = "DELIVERY" | "PICKUP";

export const HANDOFF_KINDS: HandoffKind[] = ["DELIVERY", "PICKUP"];

export const HANDOFF_LABEL: Record<HandoffKind, string> = {
  DELIVERY: "ไปส่งรถ",
  PICKUP: "ไปรับรถคืน",
};

export const HANDOFF_CLASS: Record<HandoffKind, string> = {
  DELIVERY: "bg-blue-50 text-blue-700 border-blue-200",
  PICKUP: "bg-violet-50 text-violet-700 border-violet-200",
};

/** เวลาเผื่อเดินทางก่อนถึงเวลานัด (นาที) */
export const TRAVEL_BUFFER_MIN = 30;
/** ความยาว event ในปฏิทิน (นาที) — เผื่อ 30 นาทีก่อนนัด และ 30 นาทีหลังนัด */
export const EVENT_DURATION_MIN = 60;

/**
 * ช่วงเวลาที่จะลงปฏิทิน จากเวลานัดจริง
 * นัด 09:00 → ลงปฏิทิน 08:30-09:30 เพื่อกันคนรับงานตั้งนัดอื่นชนช่วงเดินทาง
 */
export function eventWindow(meetAt: Date): { start: Date; end: Date } {
  const start = new Date(meetAt.getTime() - TRAVEL_BUFFER_MIN * 60000);
  return { start, end: new Date(start.getTime() + EVENT_DURATION_MIN * 60000) };
}

/** เวลานัดตั้งต้นของแต่ละงาน — ส่งรถใช้เวลารับรถ รับคืนใช้เวลาคืนรถ */
export function defaultMeetAt(
  booking: { startDate: Date; endDate: Date },
  kind: HandoffKind
): Date {
  return kind === "DELIVERY" ? new Date(booking.startDate) : new Date(booking.endDate);
}

/** จุดนัดตั้งต้น — จากจุดที่ลูกค้าเลือกไว้ตอนจอง */
export function defaultPlace(
  booking: { pickupPlace?: string | null; returnPlace?: string | null },
  kind: HandoffKind
): string | null {
  return (kind === "DELIVERY" ? booking.pickupPlace : booking.returnPlace) ?? null;
}

/** สถานะการซิงก์ปฏิทิน แปลงเป็นป้ายสั้นๆ */
/**
 * แปลข้อความผิดพลาดของ Google เป็นภาษาไทยที่แอดมินอ่านแล้วรู้ว่าต้องทำอะไร
 * ข้อความดิบเป็นภาษาอังกฤษและไม่บอกวิธีแก้ เช่น "Token has been expired or revoked."
 */
export function syncErrorText(raw: string): string {
  const e = raw.toLowerCase();

  if (e.includes("expired") || e.includes("revoked") || e.includes("invalid_grant")) {
    return "สิทธิ์เชื่อมปฏิทินหมดอายุแล้ว — ให้เจ้าตัวเข้าหน้า “บัญชีของฉัน” กดตัดการเชื่อมแล้วเชื่อมใหม่";
  }
  if (e.includes("insufficient") || e.includes("permission") || e.includes("forbidden")) {
    return "สิทธิ์ไม่พอ — ให้เจ้าตัวเชื่อมปฏิทินใหม่แล้วกดอนุญาตให้ครบทุกข้อ";
  }
  if (e.includes("not found") || e.includes("404")) {
    return "ไม่พบปฏิทินของคนนี้ — อาจถูกลบไปแล้ว ให้เชื่อมใหม่";
  }
  if (e.includes("quota") || e.includes("rate") || e.includes("429")) {
    return "Google จำกัดจำนวนครั้งชั่วคราว — รอสักครู่แล้วกดซิงก์ใหม่";
  }
  return `ซิงก์ปฏิทินไม่สำเร็จ — กดซิงก์ใหม่อีกครั้ง (${raw.slice(0, 60)})`;
}

export function syncBadge(a: {
  googleEventId?: string | null;
  syncError?: string | null;
}): { label: string; className: string } {
  if (a.syncError) {
    return { label: "ปฏิทินไม่ผ่าน", className: "text-red-600" };
  }
  if (a.googleEventId) {
    return { label: "ลงปฏิทินแล้ว", className: "text-emerald-600" };
  }
  return { label: "ยังไม่ลงปฏิทิน", className: "text-slate-400" };
}
