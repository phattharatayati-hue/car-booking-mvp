"use client";

/**
 * ความจำระดับ "เครื่อง" ของการจอง — ใช้กับลูกค้าที่จองโดยไม่เข้าสู่ระบบ
 *
 * เก็บแค่รหัสการจองไว้ใน localStorage ของเบราว์เซอร์ ไม่มีวันหมดอายุ
 * ไม่ใช่การยืนยันตัวตน เป็นแค่ประวัติของเครื่องเครื่องนี้
 * เหมือนกับที่เบราว์เซอร์จำหน้าที่เคยเข้าไว้ — ใครถือเครื่องนี้ก็เห็น
 * จึงเก็บเฉพาะรหัสการจอง ไม่เก็บชื่อ เบอร์ หรือข้อมูลส่วนตัวใดๆ
 */

const KEY = "cb_device_bookings";
/** เก็บสูงสุด 20 ใบ พอสำหรับลูกค้าประจำ และไม่ทำให้ localStorage บวม */
const MAX = 20;

export type DeviceBooking = {
  id: string;
  code: string;
  carLabel: string;
  /** เวลาที่บันทึก ใช้เรียงลำดับเท่านั้น */
  at: number;
};

function read(): DeviceBooking[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter(
      (b) => b && typeof b.id === "string" && typeof b.code === "string"
    );
  } catch {
    // โหมดส่วนตัว หรือเบราว์เซอร์บล็อกที่เก็บข้อมูล — ถือว่าไม่มีประวัติ
    return [];
  }
}

export function listRemembered(): DeviceBooking[] {
  return read().sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
}

export function remember(b: Omit<DeviceBooking, "at">) {
  try {
    const list = read().filter((x) => x.id !== b.id);
    list.unshift({ ...b, at: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // เขียนไม่ได้ก็ไม่เป็นไร ลิงก์ยังใช้ได้ตามปกติ
  }
}

export function forget(id: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify(read().filter((x) => x.id !== id)));
  } catch {
    // ไม่ต้องทำอะไร
  }
}
