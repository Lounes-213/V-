"use client";

import { useTranslations } from "next-intl";
import { Compass, Film, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { AppShell, PageFrame } from "@/components/site/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/overlays";

/**
 * Localised 404, rendered inside the locale layout so it keeps the header, the
 * footer, the fonts and RTL. A missing URL is a normal end state for a user —
 * it gets a real screen with real ways out, not the framework default.
 */
export default function LocaleNotFound() {
  const states = useTranslations("states");
  const nav = useTranslations("nav");
  const landing = useTranslations("landing");

  return (
    <AppShell>
      <PageFrame width="narrow">
        <EmptyState
          icon={<Compass />}
          title={states("notFoundTitle")}
          description={states("notFoundBody")}
          action={
            <Button asChild variant="primary" icon={<Film />}>
              <Link href="/">{states("notFoundCta")}</Link>
            </Button>
          }
          secondary={
            <Button asChild variant="secondary" icon={<Sparkles />}>
              <Link href="/new">{nav("newProject")}</Link>
            </Button>
          }
        />
        <nav aria-label={nav("menu")} className="mt-6 flex flex-wrap justify-center gap-2">
          {[
            { href: "/dashboard", label: nav("dashboard") },
            { href: "/projects", label: landing("footerTemplates") },
            { href: "/settings", label: nav("settings") },
            { href: "/billing", label: nav("billing") },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-border bg-raised/50 px-3 py-1.5 text-xs text-muted transition-colors hover:border-primary/35 hover:text-fg"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </PageFrame>
    </AppShell>
  );
}
