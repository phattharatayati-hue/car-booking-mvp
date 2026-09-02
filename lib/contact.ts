/**
 * ข้อมูลติดต่อร้าน — แก้ที่เดียวแล้วเปลี่ยนทุกที่
 * ใช้ทั้งหน้าเว็บ ท้ายเว็บ และข้อความตอบกลับใน LINE
 */

/**
 * ชื่อบริษัท — ใช้ชุดเดียวกันทั้งหัวเว็บ ท้ายเว็บ หลังบ้าน และข้อความใน LINE
 * แก้ที่นี่ที่เดียวแล้วเปลี่ยนทั้งระบบ
 */
export const COMPANY = {
  /** ชื่อที่แสดงเป็นแบรนด์ */
  name: "PHUPING CORPORATION",
  /** คำแรกของชื่อ ใช้เป็นบรรทัดใหญ่ในตราบริษัท */
  nameTop: "PHUPING",
  /** คำที่สอง ใช้เป็นบรรทัดเล็กใต้ชื่อ */
  nameBottom: "CORPORATION",
  /** ชื่อจดทะเบียนภาษาไทย */
  nameTh: "บริษัท ภูพิงค์ คอร์เปอเรชั่น จำกัด",
  /** คำโปรยสั้น ๆ */
  tagline: "เช่ารถเชียงใหม่",
};

/** LINE Official Account ของบริษัท */
export const LINE_OA_ID = "@606ugqjs";

export const PHONES = ["061-280-9588", "092-745-8074"];

export const OFFICE_HOURS = [
  "จันทร์-ศุกร์ 08:00-20:00 น.",
  "เสาร์-อาทิตย์ 09:00-18:00 น.",
];

export const LOCATION = "อ.เมือง จ.เชียงใหม่";

/** เบอร์แบบไม่มีขีด สำหรับลิงก์ tel: */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/-/g, "")}`;
}

/** ข้อความติดต่อสำหรับส่งในแชท LINE */
export function contactMessage(siteUrl: string): string {
  return [
    "📞 ติดต่อเรา",
    "",
    `โทร: ${PHONES.join(" , ")}`,
    `เวลาทำการ: ${OFFICE_HOURS[0]}`,
    OFFICE_HOURS[1],
    "",
    "หรือพิมพ์คำถามทิ้งไว้ แอดมินจะติดต่อกลับครับ",
    `${siteUrl}/contact`,
  ].join("\n");
}

/**
 * บัญชีรับโอนค่าจอง — แก้ที่นี่แล้วเปลี่ยนทุกที่ (เว็บ, LIFF, แชท LINE)
 * แยกเป็นส่วน ๆ เพื่อให้หน้าเว็บจัดขึ้นบรรทัดใหม่ได้ ไม่ตัดคำกลางชื่อบริษัท
 */
export const BANK = {
  name: "ธ.กสิกรไทย",
  number: "230-3-22465-6",
  accountName: "บจก.ภูพิงค์ คอร์เปอเรชั่น",
};

/** บรรทัดเดียว สำหรับข้อความในแชท LINE ที่จัดบรรทัดเองไม่ได้ */
export const BANK_ACCOUNT = `${BANK.name} ${BANK.number} ชื่อบัญชี ${BANK.accountName}`;
