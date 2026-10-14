import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { AppShell, PageFrame } from "@/components/site/app-shell";
import { getLegalDocument, LEGAL_SLUGS, type LegalSlug } from "@/content/legal";
import { routing } from "@/i18n/routing";

type Params = { locale: string; slug: string };

export function generateStaticParams() {
  return LEGAL_SLUGS.map((slug) => ({ slug }));
}

function isSlug(value: string): value is LegalSlug {
  return (LEGAL_SLUGS as string[]).includes(value);
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  if (!isSlug(slug)) return {};
  const document = getLegalDocument(locale, slug);
  // Title only: the locale layout's template appends the app name.
  return { title: document.title, description: document.summary };
}

export default async function LegalPage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  if (!isSlug(slug)) notFound();
  setRequestLocale(locale);

  const document = getLegalDocument(locale, slug);
  const back = locale === "ar" ? "رجوع" : locale === "fr" ? "Retour" : "Back";
  const contents = locale === "ar" ? "المحتوى" : locale === "fr" ? "Sommaire" : "Contents";
  const updated = locale === "ar" ? "آخر تحديث" : locale === "fr" ? "Dernière mise à jour" : "Last updated";
  const others = locale === "ar" ? "وثائق أخرى" : locale === "fr" ? "Autres documents" : "Other documents";

  return (
    <AppShell>
      <PageFrame width="narrow">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-fg [&_svg]:size-3.5"
        >
          <ArrowLeft className="rtl:rotate-180" aria-hidden />
          {back}
        </Link>

        <article className="mt-5">
          <header className="border-b border-hairline pb-5">
            <h1 className="text-2xl font-semibold text-fg sm:text-3xl">{document.title}</h1>
            <p className="mt-2 text-sm text-muted">{document.summary}</p>
            <p className="num-tabular mt-3 font-mono text-[11px] text-subtle">
              {updated}: {document.updated}
            </p>
          </header>

          <nav aria-label={contents} className="mt-5 rounded-xl border border-border bg-surface/50 p-4">
            <h2 className="text-xs font-semibold text-fg">{contents}</h2>
            <ol className="mt-2 space-y-1.5">
              {document.sections.map((section, index) => (
                <li key={section.heading}>
                  <a
                    href={`#s${index + 1}`}
                    className="text-xs text-muted transition-colors hover:text-primary"
                  >
                    <span className="num-tabular me-2 font-mono text-subtle">{index + 1}</span>
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-6 space-y-8">
            {document.sections.map((section, index) => (
              <section key={section.heading} id={`s${index + 1}`} className="scroll-mt-20">
                <h2 className="text-base font-semibold text-fg">
                  <span className="num-tabular me-2 font-mono text-xs text-primary">{index + 1}</span>
                  {section.heading}
                </h2>
                <div className="mt-2 space-y-3">
                  {section.body.map((paragraph) => (
                    <p key={paragraph.slice(0, 32)} className="text-sm leading-relaxed text-muted">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <footer className="mt-10 border-t border-hairline pt-5">
            <h2 className="text-xs font-semibold text-fg">{others}</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {LEGAL_SLUGS.filter((item) => item !== slug).map((item) => {
                const other = getLegalDocument(locale, item);
                return (
                  <li key={item}>
                    <Link
                      href={`/legal/${item}`}
                      className="inline-flex rounded-full border border-border bg-raised/50 px-3 py-1.5 text-xs text-muted transition-colors hover:border-primary/35 hover:text-fg"
                    >
                      {other.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-[11px] text-subtle">
              {routing.locales.join(" · ")}
            </p>
          </footer>
        </article>
      </PageFrame>
    </AppShell>
  );
}
