/**
 * คลาสปุ่มกลางของระบบ — เดิมแต่ละหน้าเขียน className ยาว ๆ ซ้ำกันเอง
 * ทำให้ปุ่มแบบเดียวกันหน้าตาไม่เท่ากัน และแก้ทีต้องไล่แก้ทุกไฟล์
 *
 * ทุกปุ่มสูงอย่างน้อย 44px ตามเกณฑ์พื้นที่กดบนมือถือ (py-2.5 + text-sm)
 */

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-xl text-sm font-semibold " +
  "transition-colors disabled:opacity-60 disabled:cursor-not-allowed " +
  "focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20";

export const BTN = {
  /** ปุ่มหลักของหน้า */
  primary: `${BASE} px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25`,
  /** ยืนยัน/อนุมัติ */
  ok: `${BASE} px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/25`,
  /** ปฏิเสธ/ลบ — ทุกปุ่มกลุ่มนี้ต้องมี confirm เสมอ */
  danger: `${BASE} px-4 py-2.5 bg-white border border-red-200 text-red-700 hover:bg-red-50`,
  /** ปุ่มรอง */
  ghost: `${BASE} px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50`,
  /** ปุ่มเล็กในการ์ดเอกสาร (ยังกดง่ายเพราะกว้างเต็มการ์ด) */
  smOk: `${BASE} w-full px-3 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white`,
  smDanger: `${BASE} w-full px-3 py-2 text-xs border border-red-200 text-red-700 hover:bg-red-50`,
  /** ลิงก์ที่ทำหน้าที่เหมือนปุ่ม — ต้องสูงพอกดบนมือถือ */
  link: `${BASE} px-4 py-2.5 border border-slate-300 text-slate-700 hover:border-blue-600 hover:text-blue-700 font-semibold`,
} as const;

/** กล่องข้อความแจ้งผล — ใช้คู่กับ role="alert" */
export const NOTICE = {
  ok: "bg-emerald-50 border-emerald-200 text-emerald-800",
  error: "bg-red-50 border-red-200 text-red-800",
} as const;

/** ข้อความยืนยันมาตรฐาน จะได้ไม่เขียนคนละแบบในแต่ละหน้า */
export const CONFIRM = {
  del: (what: string) => `ลบ${what}ถาวร ย้อนกลับไม่ได้\n\nยืนยันหรือไม่?`,
  sendLine: (what: string) => `ระบบจะส่ง${what}เข้าแชท LINE ของลูกค้าทันที\n\nยืนยันหรือไม่?`,
  cancelBooking: "ยกเลิกการจองนี้ และรถจะกลับมาว่างให้คนอื่นจองได้\n\nยืนยันหรือไม่?",
} as const;
