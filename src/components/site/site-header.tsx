"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CreditCard, LayoutDashboard, LogOut, Menu, Play, Settings2, X } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/overlays";
import { useSession } from "@/lib/use-session";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";
import { Logo } from "./logo";
import { cn } from "@/lib/cn";

/**
 * The header shows the real session.
 *
 * It used to take a `signedIn` boolean that no screen ever passed, so a signed-in
 * creator still saw "Sign in" and had no way out of the account. The state now
 * comes from `GET /api/auth/session` (the cookie is httpOnly, so the browser
 * cannot read it directly), which also gives the header a sign-out.
 */
export function SiteHeader() {
  const t = useTranslations("nav");
  const landing = useTranslations("landing");
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, status, signOut } = useSession();
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const links = [
    { href: "/quran-video", label: t("quranStudio"), highlight: true },
    { href: "/#modes", label: landing("modesEyebrow") },
    { href: "/#quran", label: t("quran") },
    { href: "/#pricing", label: t("pricing") },
    { href: "/#faq", label: landing("faqTitle") },
    { href: "/dashboard", label: t("dashboard") },
  ];

  const displayName = user?.name?.trim() || user?.email?.trim() || t("account");
  const signedIn = Boolean(user);

  const accountItems = [
    { href: "/dashboard", label: t("dashboard"), icon: <LayoutDashboard /> },
    { href: "/settings", label: t("settings"), icon: <Settings2 /> },
    { href: "/billing", label: t("billing"), icon: <CreditCard /> },
  ];

  const onSignOut = async () => {
    setOpen(false);
    await signOut();
    router.replace("/");
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors duration-200",
        scrolled ? "border-border bg-ink/85 backdrop-blur-xl" : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[100rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label={landing("heroTitle")}>
          <Logo className="size-8" />
          <span className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight text-fg">IVS</span>
            <span className="text-[10px] font-medium tracking-[0.18em] text-subtle uppercase">
              Intelligent Video Studio
            </span>
          </span>
        </Link>

        <nav aria-label={t("home")} className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors",
                link.highlight
                  ? "border border-gold/40 bg-gold/10 font-semibold text-gold hover:bg-gold/20"
                  : "text-muted hover:bg-raised hover:text-fg",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <LocaleSwitcher compact />
          </div>
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden md:inline-flex"
            icon={<Play />}
          >
            <Link href="/new">{t("newProject")}</Link>
          </Button>

          {status !== "ready" ? (
            // Placeholder keeps the row from jumping once the session resolves.
            <span
              aria-hidden
              className="size-8 animate-pulse rounded-full border border-border bg-raised"
            />
          ) : signedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t("account")}
                  className="rounded-full ring-offset-2 ring-offset-ink outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Avatar name={displayName} size={32} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>
                  <span className="block max-w-56 truncate text-xs font-semibold text-fg">
                    {displayName}
                  </span>
                  {user?.email ? (
                    <span className="block max-w-56 truncate text-[11px] text-subtle">{user.email}</span>
                  ) : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {accountItems.map((item) => (
                  // Not `asChild`: DropdownMenuItem renders icon + label + shortcut
                  // as siblings, and Radix's Slot needs exactly one child — using
                  // asChild here threw and took the whole page into the error
                  // boundary. onSelect keeps the menu semantics and the icons.
                  <DropdownMenuItem
                    key={item.href}
                    icon={item.icon}
                    onSelect={() => router.push(item.href)}
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem icon={<LogOut />} danger onSelect={() => void onSignOut()}>
                  {t("signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/auth/sign-in">{t("signIn")}</Link>
              </Button>
              <Button asChild size="sm" variant="primary">
                <Link href="/new">{landing("planCtaFree")}</Link>
              </Button>
            </>
          )}

          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? t("closeMenu") : t("menu")}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex size-10 items-center justify-center rounded-md border border-border bg-raised text-fg lg:hidden"
          >
            {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-border bg-ink/98 backdrop-blur-xl lg:hidden">
          <nav aria-label={t("menu")} className="mx-auto flex max-w-2xl flex-col gap-1 p-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex min-h-12 items-center rounded-md px-3 text-base transition-colors",
                  link.highlight
                    ? "border border-gold/40 bg-gold/10 font-semibold text-gold hover:bg-gold/20"
                    : "text-fg hover:bg-raised",
                )}
              >
                {link.label}
              </Link>
            ))}

            <div className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
              {signedIn ? (
                <>
                  <p className="px-3 pt-1 pb-2 text-xs text-subtle">{displayName}</p>
                  {accountItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex min-h-12 items-center gap-2 rounded-md px-3 text-base text-fg transition-colors hover:bg-raised [&_svg]:size-4 [&_svg]:text-muted"
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={() => void onSignOut()}
                    className="flex min-h-12 items-center gap-2 rounded-md px-3 text-base text-danger transition-colors hover:bg-danger/10 [&_svg]:size-4"
                  >
                    <LogOut aria-hidden />
                    {t("signOut")}
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/sign-in"
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center rounded-md px-3 text-base text-fg transition-colors hover:bg-raised"
                >
                  {t("signIn")}
                </Link>
              )}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
