/** ค่าที่ใช้ฝั่งหน้าเว็บ (ไม่ใช่ความลับ) */

/** LINE OA id เช่น @606ugqjs */
export function lineOaId(): string {
  return process.env.NEXT_PUBLIC_LINE_OA_ID ?? "@606ugqjs";
}

/** ลิงก์เพิ่มเพื่อน LINE OA */
export function lineAddFriendUrl(): string {
  const id = lineOaId().replace(/^@/, "");
  return `https://line.me/R/ti/p/%40${id}`;
}
