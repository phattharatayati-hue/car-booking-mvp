import { lineLoginReady } from "@/lib/line-login";

/**
 * ปุ่ม "เข้าสู่ระบบด้วย LINE" — ลิงก์ธรรมดา ไม่ต้องใช้ JavaScript
 *
 * next = หน้าที่จะกลับมาหลังเข้าสู่ระบบเสร็จ
 * ถ้ายังไม่ได้ตั้งค่า LINE Login ในไฟล์ env ปุ่มจะไม่ขึ้นเลย ไม่ใช่ขึ้นแล้วกดไม่ได้
 *
 * สีเขียว #06C755 เป็นสีทางการของ LINE ตามคู่มือแบรนด์ จึงไม่ใช้ตัวแปรสีของเรา
 * และไม่สลับตามโหมดมืด
 */
export default function LineLoginButton({
  next = "/my",
  label = "เข้าสู่ระบบด้วย LINE",
  className = "",
}: {
  next?: string;
  label?: string;
  className?: string;
}) {
  if (!lineLoginReady()) return null;

  return (
    <a
      href={`/api/line/login?next=${encodeURIComponent(next)}`}
      className={`btn w-full gap-2 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-semibold py-3 px-5 transition-colors ${className}`}
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true" fill="currentColor">
        <path d="M12 3C6.9 3 3 6.4 3 10.5c0 3.7 3.2 6.8 7.5 7.4.3.1.7.2.8.5.1.3 0 .7 0 1l-.1.8c0 .2-.2.9.8.5s5.3-3.1 7.2-5.3c1.3-1.4 1.8-2.9 1.8-4.9C21 6.4 17.1 3 12 3zM8.3 12.8h-1.5c-.2 0-.4-.2-.4-.4V9.2c0-.2.2-.4.4-.4s.4.2.4.4v2.8h1.1c.2 0 .4.2.4.4s-.2.4-.4.4zm1.8-.4c0 .2-.2.4-.4.4s-.4-.2-.4-.4V9.2c0-.2.2-.4.4-.4s.4.2.4.4v3.2zm3.9 0c0 .2-.1.3-.3.4h-.1c-.1 0-.2-.1-.3-.2l-1.4-1.9v1.7c0 .2-.2.4-.4.4s-.4-.2-.4-.4V9.2c0-.2.1-.3.3-.4h.1c.1 0 .2 0 .3.2l1.4 1.9V9.2c0-.2.2-.4.4-.4s.4.2.4.4v3.2zm2.6-2c.2 0 .4.2.4.4s-.2.4-.4.4h-1.1v.7h1.1c.2 0 .4.2.4.4s-.2.4-.4.4h-1.5c-.2 0-.4-.2-.4-.4V9.2c0-.2.2-.4.4-.4h1.5c.2 0 .4.2.4.4s-.2.4-.4.4h-1.1v.7h1.1z" />
      </svg>
      {label}
    </a>
  );
}
