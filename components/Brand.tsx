import Image from "next/image";
import Link from "next/link";
import { COMPANY } from "@/lib/contact";

/**
 * ตราและชื่อบริษัท — ใช้ชุดเดียวกันทั้งหัวเว็บ ท้ายเว็บ หลังบ้าน และหน้าล็อกอิน
 * แก้ที่นี่ที่เดียวแล้วเปลี่ยนทั้งระบบ
 */
export default function Brand({
  href = "/",
  size = "md",
  subtitle = COMPANY.nameBottom,
  tone = "navy",
  className = "",
}: {
  /** ใส่ null ถ้าไม่อยากให้กดได้ */
  href?: string | null;
  size?: "sm" | "md" | "lg";
  /** navy = บนพื้นอ่อน · white = บนพื้นเข้ม */
  tone?: "navy" | "white";
  subtitle?: string | null;
  className?: string;
}) {
  const mark = { sm: 30, md: 38, lg: 52 }[size];
  const name = {
    sm: "text-[13px]",
    md: "text-[15px]",
    lg: "text-xl",
  }[size];

  const inner = (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src={tone === "white" ? "/logo-mark-white.png" : "/logo-mark.png"}
        alt=""
        width={mark}
        height={Math.round((mark * 233) / 454)}
        priority
        className="shrink-0"
      />
      <span className="leading-tight">
        <span
          className={`block font-display font-bold tracking-[0.04em] ${
            tone === "white" ? "text-white" : "text-blue-700"
          } ${name}`}
        >
          {COMPANY.nameTop}
        </span>
        {subtitle ? (
          <span
            className={`block text-[10px] font-mono tracking-[0.18em] uppercase ${
              tone === "white" ? "text-amber-300" : "text-amber-700"
            }`}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );

  if (!href) return inner;

  return (
    <Link href={href} className="shrink-0" aria-label={`${COMPANY.name} หน้าแรก`}>
      {inner}
    </Link>
  );
}
