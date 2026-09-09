import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getSessionCustomer } from "@/lib/customer-session";
import FlashNotice from "@/components/FlashNotice";

/**
 * เปลือกหน้าลูกค้า — หัวเว็บ เนื้อหา ท้ายเว็บ
 *
 * hero = true สำหรับหน้าที่มีรูปใหญ่เต็มความกว้างอยู่บนสุด
 *   หัวเว็บจะลอยทับรูปแบบโปร่งใส และเนื้อหาไม่ต้องเว้นที่ด้านบน
 *   หน้าที่ไม่ใช่แบบนั้นต้องเว้นที่ให้หัวเว็บ เพราะหัวเว็บลอยอยู่นอกผัง
 */
export default async function PublicShell({
  children,
  hero = false,
}: {
  children: React.ReactNode;
  hero?: boolean;
}) {
  /* อ่านสถานะเข้าสู่ระบบที่นี่ที่เดียว แล้วส่งชื่อลงไปให้หัวเว็บ
     หัวเว็บเป็นคอมโพเนนต์ฝั่งเบราว์เซอร์ อ่านคุกกี้เองไม่ได้ */
  const me = await getSessionCustomer();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SiteHeader hero={hero} customerName={me?.fullName ?? null} />
      <main className={`flex-1 ${hero ? "" : "pt-16 md:pt-[104px]"}`}>
        {children}
      </main>
      <SiteFooter />
      <FlashNotice />
    </div>
  );
}
