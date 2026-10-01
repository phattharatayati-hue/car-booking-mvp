import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/line";

/** บอก Google ว่าเก็บหน้าไหนได้ — หลังบ้าน หน้าลูกค้า และ API ไม่ต้องขึ้นผลค้นหา */
export default function robots(): MetadataRoute.Robots {
  const site = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/my", "/job", "/booking", "/receipt", "/line/", "/login", "/cars/*/book"],
    },
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
