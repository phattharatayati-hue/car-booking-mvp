import { cookies } from "next/headers";
import { LANG_COOKIE, toLang, type Lang } from "@/lib/locale";

/**
 * อ่านภาษาปัจจุบันในคอมโพเนนต์ฝั่งเซิร์ฟเวอร์
 *
 * แยกไฟล์ออกมาจาก lib/locale.ts เพราะ next/headers ใช้ได้แต่ฝั่งเซิร์ฟเวอร์
 * ถ้าอยู่ไฟล์เดียวกัน คอมโพเนนต์ฝั่งเบราว์เซอร์ที่ import ชื่อคุกกี้
 * จะลาก next/headers ไปด้วยแล้ว build ไม่ผ่าน
 */
export async function getLang(): Promise<Lang> {
  const jar = await cookies();
  return toLang(jar.get(LANG_COOKIE)?.value);
}
