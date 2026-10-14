import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

/**
 * Global 404 — the page for a URL that matches no route at all.
 *
 * `[locale]/not-found.tsx` covers the localised case (a segment called
 * `notFound()`), but an unmatched URL never reaches it: our root layout lives
 * inside the `[locale]` dynamic segment, so Next has no single layout to compose
 * a 404 from and falls back to its built-in default page. This file is the
 * documented answer for exactly that shape of app, and it bypasses the normal
 * render pipeline — so it imports the global stylesheet and renders its own
 * `<html>`/`<body>`, and it cannot know which locale the visitor wanted.
 *
 * Hence: no locale lookup, no header, no fonts beyond what the stylesheet
 * declares. It greets the visitor in all three supported languages and hands
 * them three ways back into the app.
 */
export const metadata: Metadata = {
  title: "404 — Page not found",
  description: "This address does not exist in IVS — Intelligent Video Studio.",
  robots: { index: false, follow: false },
};

const GREETINGS = [
  {
    href: "/ar",
    label: "العربية",
    dir: "rtl" as const,
    title: "الصفحة غير موجودة",
    body: "الرابط الذي طلبته غير صحيح أو تم نقله.",
  },
  {
    href: "/en",
    label: "English",
    dir: "ltr" as const,
    title: "Page not found",
    body: "The address you asked for is wrong, or it has moved.",
  },
  {
    href: "/fr",
    label: "Français",
    dir: "ltr" as const,
    title: "Page introuvable",
    body: "L’adresse demandée est incorrecte ou a été déplacée.",
  },
];

export default function GlobalNotFound() {
  return (
    <html lang="en" dir="ltr" data-theme="dark" data-digits="western">
      <body className="bg-ink text-fg min-h-dvh antialiased">
        <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center gap-8 px-5 py-16">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-subtle text-xs font-semibold tracking-[0.32em] uppercase">404</p>
            <h1 className="text-fg text-2xl font-semibold tracking-tight sm:text-3xl">
              Page not found · الصفحة غير موجودة · Page introuvable
            </h1>
            <p className="text-muted max-w-xl text-sm">
              This address is not part of IVS — Intelligent Video Studio.
              <br />
              <span dir="rtl">هذا العنوان غير موجود في استوديو IVS.</span>
              <br />
              Cette adresse ne fait pas partie de IVS — Intelligent Video Studio.
            </p>
          </div>

          <ul className="grid w-full gap-3 sm:grid-cols-3">
            {GREETINGS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  dir={item.dir}
                  className="border-border bg-surface hover:border-primary/40 hover:bg-raised flex h-full flex-col gap-1.5 rounded-xl border p-4 transition-colors"
                >
                  <span className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
                    {item.label}
                  </span>
                  <span className="text-fg text-sm font-semibold">{item.title}</span>
                  <span className="text-muted text-xs leading-relaxed">{item.body}</span>
                  <span className="text-fg mt-1 text-xs font-medium">
                    {item.dir === "rtl" ? "← ابدأ من هنا" : "Start here →"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </main>
      </body>
    </html>
  );
}
