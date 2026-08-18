/** สถานะที่ถือว่ารถถูกจองอยู่จริง — ใช้เช็คการจองทับกัน */
export const ACTIVE_BOOKING_STATUSES = [
  "REQUESTED",
  "PENDING_DEPOSIT",
  "CONFIRMED",
] as const;

export const STATUS_LABEL: Record<string, string> = {
  REQUESTED: "รอเช็คกับเจ้าของรถ",
  REJECTED: "รถไม่ว่าง",
  PENDING_DEPOSIT: "รอตรวจสลิปค่าจอง",
  CONFIRMED: "ยืนยันแล้ว",
  CANCELLED: "ยกเลิกแล้ว",
  COMPLETED: "เสร็จสิ้น",
};

export const STATUS_CLASS: Record<string, string> = {
  REQUESTED: "bg-violet-50 text-violet-700 border-violet-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  PENDING_DEPOSIT: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  COMPLETED: "bg-slate-100 text-slate-600 border-slate-200",
};

/** รถคันนี้ต้องขออนุมัติจากเจ้าของก่อนไหม */
export function needsApproval(car: { source: string; partnerId?: string | null }) {
  return car.source === "PARTNER" || Boolean(car.partnerId);
}
