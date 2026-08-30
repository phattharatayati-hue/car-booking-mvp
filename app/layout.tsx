import type { Metadata } from "next";
import "./globals.css";

/**
 * ฟอนต์ทั้งหมดฝังมากับโปรเจกต์ (@fontsource) ไม่ดึงจาก Google Fonts ตอน build
 * ต่อเน็ตไม่ได้ก็ยัง build ผ่าน และเว็บโหลดเร็วกว่าเพราะไม่ต้องต่อโดเมนนอก
 *
 *   Anuphan            — หัวข้อและตัวเลขใหญ่
 *   IBM Plex Sans Thai — เนื้อความ
 *   IBM Plex Mono      — ทะเบียนรถ รหัสจอง ป้ายกำกับ
 *
 * ไฟล์ตามน้ำหนักแต่ละไฟล์มีครบทุก subset (ไทยและละติน) อยู่แล้ว
 */
import "@fontsource/anuphan/500.css";
import "@fontsource/anuphan/600.css";
import "@fontsource/anuphan/700.css";
import "@fontsource/ibm-plex-sans-thai/400.css";
import "@fontsource/ibm-plex-sans-thai/500.css";
import "@fontsource/ibm-plex-sans-thai/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";

export const metadata: Metadata = {
  title: "PHUPING CORPORATION · เช่ารถเชียงใหม่ จองง่าย ได้รถชัวร์",
  description:
    "ภูพิงค์ คอร์ปอเรชั่น — บริการเช่ารถคุณภาพในเชียงใหม่ จองออนไลน์ได้ 24 ชม. รถสะอาด ราคาชัดเจน ไม่มีค่าใช้จ่ายแอบแฝง",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
