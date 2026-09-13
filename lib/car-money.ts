/**
 * ค่าจองและเงินประกัน "ของรถคันนั้น" — ตรรกะล้วน ไม่แตะฐานข้อมูล
 *
 * ค่าตั้งต้นอยู่ที่ /admin/settings ใช้กับรถทุกคัน
 * คันไหนเก็บไม่เท่าคนอื่น (เช่น Fortuner ประกัน 5,000 ค่าจอง 1,000)
 * ให้ใส่ค่าเฉพาะคันในหน้าแก้ไขรถ แล้วค่านั้นจะชนะค่ากลาง
 *
 * ทำเป็นฟังก์ชันกลางเพราะยอดพวกนี้โผล่หลายที่มาก — หน้าจอง หน้าสถานะ
 * การ์ด LINE การ์ดงานคนขับ และตอนคืนเงินประกัน ถ้าคำนวณกันเองแต่ละที่
 * จะมีสักจุดที่ยังใช้ค่ากลางแล้วลูกค้าเห็นตัวเลขไม่ตรงกัน
 */

export type CarMoney = {
  bookingFee: number | null;
  securityDeposit: number | null;
};

export type MoneyDefaults = {
  bookingFee: number;
  securityDeposit: number;
};

/** ค่าจองที่ต้องโอนสำหรับรถคันนี้ */
export function bookingFeeOf(car: CarMoney | null | undefined, d: MoneyDefaults): number {
  return car?.bookingFee ?? d.bookingFee;
}

/** เงินประกันที่เก็บวันรับรถ และคืนให้เมื่อคืนรถเรียบร้อย */
export function securityDepositOf(car: CarMoney | null | undefined, d: MoneyDefaults): number {
  return car?.securityDeposit ?? d.securityDeposit;
}

/** ทั้งสองค่าพร้อมกัน — ใช้เวลาหน้าจอเดียวต้องใช้ทั้งคู่ */
export function moneyOf(car: CarMoney | null | undefined, d: MoneyDefaults) {
  return {
    bookingFee: bookingFeeOf(car, d),
    securityDeposit: securityDepositOf(car, d),
  };
}
