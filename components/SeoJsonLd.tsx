import { siteUrl } from "@/lib/line";
import { COMPANY, PHONES, FACEBOOK_PAGE } from "@/lib/contact";

/**
 * ข้อมูลร้านแบบที่ Google อ่านได้ (schema.org AutoRental)
 * ช่วยให้ Google เข้าใจว่าเป็นร้านเช่ารถในเชียงใหม่ เบอร์อะไร เปิดกี่โมง
 */
export default function SeoJsonLd() {
  const site = siteUrl();
  const data = {
    "@context": "https://schema.org",
    "@type": "AutoRental",
    name: `${COMPANY.name} — เช่ารถเชียงใหม่`,
    alternateName: [COMPANY.nameTh, "ภูพิงค์ คอร์เปอเรชั่น", "Phuping Corporation"],
    url: site,
    logo: `${site}/logo.png`,
    image: `${site}/hero-car.webp`,
    telephone: PHONES.map((p) => "+66" + p.replace(/-/g, "").replace(/^0/, "")),
    priceRange: "฿฿",
    address: {
      "@type": "PostalAddress",
      addressLocality: "อำเภอเมืองเชียงใหม่",
      addressRegion: "เชียงใหม่",
      addressCountry: "TH",
    },
    areaServed: { "@type": "City", name: "เชียงใหม่" },
    openingHoursSpecification: [
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "08:00", closes: "20:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Saturday", "Sunday"], opens: "09:00", closes: "18:00" },
    ],
    sameAs: [FACEBOOK_PAGE, "https://line.me/R/ti/p/%40623oohcz"],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
