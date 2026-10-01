import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/line";

/** รายชื่อหน้าสาธารณะให้ Google — ส่งลิงก์ /sitemap.xml ใน Search Console */
export default function sitemap(): MetadataRoute.Sitemap {
  const site = siteUrl();
  const now = new Date();
  const pages: [string, number, MetadataRoute.Sitemap[number]["changeFrequency"]][] = [
    ["", 1.0, "daily"],
    ["/cars", 0.9, "daily"],
    ["/how-to-book", 0.7, "monthly"],
    ["/fees", 0.6, "monthly"],
    ["/contact", 0.6, "monthly"],
    ["/terms", 0.3, "yearly"],
    ["/privacy", 0.3, "yearly"],
  ];
  return pages.map(([path, priority, changeFrequency]) => ({
    url: `${site}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
