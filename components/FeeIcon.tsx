import type { FeeIconKey } from "@/lib/fees";

/**
 * ไอคอนของแต่ละรายการค่าปรับ — SVG เส้น ใช้สีตามตัวอักษรที่ครอบอยู่
 * ขนาดคุมด้วย className ที่ส่งเข้ามา
 */
export default function FeeIcon({
  name,
  className = "w-7 h-7",
}: {
  name: FeeIconKey;
  className?: string;
}) {
  const common = {
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {name === "smoke" && (
        <>
          <path d="M3 16h12v3H3z" {...common} />
          <path d="M17 16h1.5a2.5 2.5 0 000-5H17" {...common} />
          <path d="M20 19h1" {...common} />
          <path d="M4 5l15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {name === "tar" && (
        <>
          <circle cx="12" cy="10" r="6" {...common} />
          <circle cx="12" cy="10" r="2.2" {...common} />
          <path d="M5 19c2 0 2.5-1.4 4.5-1.4S12 19 14 19s2.5-1.4 4.5-1.4" {...common} />
        </>
      )}
      {name === "dirty" && (
        <>
          <circle cx="12" cy="8" r="4" {...common} />
          <path d="M9 13c0 3 1.4 5 3 5s3-2 3-5" {...common} />
          <path d="M8 21c1.2-1 2.6-1 4-1s2.8 0 4 1" {...common} />
        </>
      )}
      {name === "key" && (
        <>
          <circle cx="8" cy="8" r="4" {...common} />
          <path d="M11 11l8 8M16 16l2-2M18.5 18.5l1.5-1.5" {...common} />
        </>
      )}
      {name === "keyService" && (
        <>
          <circle cx="9" cy="7" r="3.2" {...common} />
          <path d="M11.4 9.4L18 16M15.5 13.5l1.6-1.6M17.6 15.6l1.4-1.4" {...common} />
          <path d="M4 21c0-2.5 2.2-4 5-4" {...common} />
        </>
      )}
      {name === "unlock" && (
        <>
          <rect x="4" y="10" width="12" height="10" rx="2.5" {...common} />
          <path d="M8 10V7.5A3.5 3.5 0 0115 6.6" {...common} />
          <circle cx="10" cy="15" r="1.4" {...common} />
        </>
      )}
      {name === "fuel" && (
        <>
          <circle cx="12" cy="12" r="8.5" {...common} />
          <path d="M12 12l4-3" {...common} />
          <path d="M5 14a7 7 0 0114 0" {...common} />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
        </>
      )}
      {name === "tow" && (
        <>
          <path d="M2 17h9l3-5h4l3 3v2" {...common} />
          <circle cx="7" cy="19" r="2" {...common} />
          <circle cx="18" cy="19" r="2" {...common} />
          <path d="M14 12V8h3" {...common} />
        </>
      )}
      {name === "ticket" && (
        <>
          <rect x="5" y="3" width="14" height="18" rx="2.5" {...common} />
          <path d="M9 8h6M9 12h6M9 16h3" {...common} />
        </>
      )}
      {name === "earlyReturn" && (
        <>
          <path d="M4 15h13l2-4h-4l-2-3H8L6 11H4v4z" {...common} />
          <circle cx="8" cy="17.5" r="1.6" {...common} />
          <circle cx="16" cy="17.5" r="1.6" {...common} />
          <path d="M9 5H3m0 0l2.5-2.5M3 5l2.5 2.5" {...common} />
        </>
      )}
      {name === "collision" && (
        <>
          <path d="M2 16h7l1.5-4H6L4.5 15" {...common} />
          <path d="M22 16h-7l-1.5-4H18l1.5 3" {...common} />
          <path d="M12 5v3M9.5 6.5l1.5 2M14.5 6.5L13 8.5" {...common} />
          <circle cx="6" cy="18" r="1.5" {...common} />
          <circle cx="18" cy="18" r="1.5" {...common} />
        </>
      )}
    </svg>
  );
}
