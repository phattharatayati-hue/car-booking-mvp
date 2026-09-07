import Link from "next/link";
import Brand from "@/components/Brand";
import {
  COMPANY,
  LINE_OA_ID,
  PHONES,
  OFFICE_HOURS,
  LOCATION,
  telHref,
} from "@/lib/contact";
import type { Dict } from "@/lib/i18n";

/**
 * ท้ายเว็บ 4 คอลัมน์ตามแบบที่อนุมัติ
 *   แบรนด์ · เมนู · ข้อกำหนด · ติดต่อ
 *
 * พื้นเขียวเข้มตัดกับพื้นครีมของเนื้อหา เส้นทองคาดบนสุด
 *
 * ชื่อจดทะเบียนภาษาไทยและข้อมูลติดต่อไม่แปลเป็นอังกฤษ
 * เพราะเป็นข้อมูลตามทะเบียนบริษัท ต้องตรงกับเอกสารจริง
 */
export default function SiteFooter({ t }: { t: Dict }) {
  const menu = [
    { href: "/cars", label: t.nav.cars },
    { href: "/how-to-book", label: t.nav.howTo },
    { href: "/fees", label: t.footer.feesLong },
    { href: "/my", label: t.nav.my },
    { href: "/line/connect", label: t.nav.line },
  ];

  const legal = [
    { href: "/terms", label: t.footer.terms },
    { href: "/privacy", label: t.footer.privacy },
    { href: "/login", label: t.nav.admin },
  ];

  return (
    <footer className="mt-auto bg-panel-deep text-white/85">
      <div className="h-1 bg-gradient-to-r from-amber-700 via-gold-fixed to-amber-700" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* แบรนด์ */}
          <div>
            <div className="mb-4">
              <Brand href={null} size="md" tone="white" />
            </div>
            <p className="text-sm leading-relaxed text-white/75">
              {COMPANY.nameTh} — {t.footer.about}
            </p>
          </div>

          {/* เมนู */}
          <FooterCol title={t.footer.menu}>
            {menu.map((m) => (
              <FooterLink key={m.href} href={m.href}>
                {m.label}
              </FooterLink>
            ))}
          </FooterCol>

          {/* ข้อกำหนด */}
          <FooterCol title={t.footer.legal}>
            {legal.map((m) => (
              <FooterLink key={m.href} href={m.href}>
                {m.label}
              </FooterLink>
            ))}
          </FooterCol>

          {/* ติดต่อ */}
          <FooterCol title={t.footer.contact}>
            {PHONES.map((phone) => (
              <li key={phone}>
                <a
                  href={telHref(phone)}
                  className="font-mono tracking-tight text-white/75 hover:text-gold-fixed transition-colors"
                >
                  {phone}
                </a>
              </li>
            ))}
            <li className="text-white/75">LINE: {LINE_OA_ID}</li>
            {OFFICE_HOURS.map((h) => (
              <li key={h} className="text-white/60">
                {h}
              </li>
            ))}
            <li className="text-white/60">{LOCATION}</li>
          </FooterCol>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 text-xs text-white/50">
          © {new Date().getFullYear()} {COMPANY.name} · {COMPANY.nameTh}
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-semibold text-sm mb-3.5 text-white">{title}</p>
      <ul className="flex flex-col gap-2 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="text-white/75 hover:text-gold-fixed transition-colors"
      >
        {children}
      </Link>
    </li>
  );
}
