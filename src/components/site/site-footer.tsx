import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";
import { Logo } from "./logo";

export function SiteFooter() {
  const t = useTranslations("landing");
  const nav = useTranslations("nav");
  const year = new Date().getFullYear();

  const columns = [
    {
      title: t("footerProduct"),
      links: [
        { href: "/new", label: t("footerEditor") },
        { href: "/dashboard", label: t("footerTemplates") },
        { href: "/#quran", label: t("footerQuran") },
        { href: "/#pricing", label: t("footerPricing") },
      ],
    },
    {
      title: t("footerResources"),
      links: [
        { href: "/design", label: t("footerDocs") },
        { href: "/#faq", label: t("footerShortcuts") },
        { href: "/settings", label: nav("settings") },
        { href: "/billing", label: nav("billing") },
      ],
    },
    {
      title: t("footerLegal"),
      links: [
        { href: "/legal/privacy", label: t("footerPrivacy") },
        { href: "/legal/terms", label: t("footerTerms") },
        { href: "/legal/dmca", label: t("footerDmca") },
        { href: "/legal/ai-disclosure", label: t("footerAi") },
        { href: "/legal/reciter-rights", label: t("footerRights") },
        { href: "/legal/cookies", label: t("footerCookies") },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-ink-deep">
      <div className="mx-auto w-full max-w-[100rem] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <Logo className="size-9" />
              <span className="text-sm font-semibold tracking-tight text-fg">IVS — Intelligent Video Studio</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted">{t("footerMadeIn")}</p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary">
              <ShieldCheck aria-hidden className="size-3.5" />
              {t("privacyTitle")}
            </p>
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-xs font-semibold tracking-[0.16em] text-subtle uppercase">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted transition-colors hover:text-fg"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="num-tabular text-xs text-subtle">
            {t("footerCopyright", { year })}
          </p>
          <div className="flex items-center gap-2">
            <LocaleSwitcher compact />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
