import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getLang } from "@/lib/locale-server";
import { dict } from "@/lib/i18n";

/**
 * เปลือกหน้าลูกค้า — หัวเว็บ เนื้อหา ท้ายเว็บ
 *
 * อ่านภาษาจากคุกกี้ที่นี่ที่เดียว แล้วส่งคำแปลลงไปให้หัวและท้ายเว็บ
 * ทั้งสองตัวเป็นคอมโพเนนต์ฝั่งเบราว์เซอร์ เรียก getLang() เองไม่ได้
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
  const lang = await getLang();
  const t = dict(lang);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SiteHeader lang={lang} t={t} hero={hero} />
      <main className={`flex-1 ${hero ? "" : "pt-16 md:pt-[104px]"}`}>
        {children}
      </main>
      <SiteFooter t={t} />
    </div>
  );
}
