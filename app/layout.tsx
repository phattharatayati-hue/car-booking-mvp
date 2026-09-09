import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

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
    <html
      lang="th"
      data-theme="light"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {/*
          ตั้งโหมดสว่าง/มืดก่อนหน้าเว็บวาดครั้งแรก
          ไม่งั้นคนที่เลือกโหมดมืดไว้จะเห็นหน้าขาวแวบทุกครั้งที่เปลี่ยนหน้า

          ต้องใช้ next/script strategy="beforeInteractive" ไม่ใช่ <script> ธรรมดา
          เพราะ React 19 ไม่รัน <script> ที่เขียนเป็น JSX ตอน render ฝั่งเบราว์เซอร์
          และจะเตือน "Encountered a script tag while rendering React component"
          next/script จะฝังสคริปต์ลง HTML ชุดแรกให้เอง นอกต้นไม้ของ React

          เนื้อสคริปต์เป็นข้อความคงที่ในโค้ดเราเอง ไม่มีข้อมูลจากผู้ใช้ปนเข้าไป
        */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        {children}
      </body>
    </html>
  );
}
