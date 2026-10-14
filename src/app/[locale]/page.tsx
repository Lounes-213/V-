import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  AudioLines,
  BadgeCheck,
  Captions,
  Crop,
  FileAudio,
  ListOrdered,
  Mic,
  ScanText,
  ShieldCheck,
  Sparkles,
  Type,
  Upload,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { isLocale } from "@/i18n/routing";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { HeroDemo } from "@/components/marketing/hero-demo";
import { PricingSection } from "@/components/marketing/pricing-section";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionItem } from "@/components/ui/overlays";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "landing" });
  return { title: t("heroTitle"), description: t("heroSubtitle") };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("landing");
  const nav = await getTranslations("nav");
  const quran = await getTranslations("quran");

  const modes = [
    {
      id: "auto",
      icon: Sparkles,
      title: t("modeAutoTitle"),
      desc: t("modeAutoDesc"),
      time: t("modeAutoTime"),
      best: t("modeAutoBest"),
      accent: "primary" as const,
    },
    {
      id: "manual",
      icon: Mic,
      title: t("modeManualTitle"),
      desc: t("modeManualDesc"),
      time: t("modeManualTime"),
      best: t("modeManualBest"),
      accent: "info" as const,
    },
    {
      id: "hybrid",
      icon: ListOrdered,
      title: t("modeHybridTitle"),
      desc: t("modeHybridDesc"),
      time: t("modeHybridTime"),
      best: t("modeHybridBest"),
      accent: "primary" as const,
    },
  ];

  const features = [
    { icon: Type, title: t("featureTextTitle"), desc: t("featureTextDesc") },
    { icon: AudioLines, title: t("featureWaveTitle"), desc: t("featureWaveDesc") },
    { icon: Captions, title: t("featureCaptionTitle"), desc: t("featureCaptionDesc") },
    { icon: Crop, title: t("featureSafeTitle"), desc: t("featureSafeDesc") },
    { icon: ShieldCheck, title: t("featurePrivacyTitle"), desc: t("featurePrivacyDesc") },
    { icon: BadgeCheck, title: t("featureQuranTitle"), desc: t("featureQuranDesc") },
  ];

  const steps = [
    { icon: Sparkles, title: t("stepOne"), desc: t("stepOneDesc") },
    { icon: Upload, title: t("stepTwo"), desc: t("stepTwoDesc") },
    { icon: ScanText, title: t("stepThree"), desc: t("stepThreeDesc") },
    { icon: FileAudio, title: t("stepFour"), desc: t("stepFourDesc") },
  ];

  const faq = [
    { q: t("faqQ1"), a: t("faqA1") },
    { q: t("faqQ2"), a: t("faqA2") },
    { q: t("faqQ3"), a: t("faqA3") },
    { q: t("faqQ4"), a: t("faqA4") },
    { q: t("faqQ5"), a: t("faqA5") },
    { q: t("faqQ6"), a: t("faqA6") },
  ];

  return (
    <>
      <SiteHeader />

      <main id="main" className="min-h-dvh">
        {/* ---------------------------------------------------------- hero -- */}
        <section className="relative overflow-hidden bg-[image:var(--gradient-hero)]">
          <div className="mx-auto grid w-full max-w-[100rem] items-center gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-8 lg:pt-20">
            <div>
              <Badge tone="primary" size="lg" className="backdrop-blur">
                <ShieldCheck aria-hidden className="size-3.5" />
                {t("badge")}
              </Badge>

              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance text-fg sm:text-5xl">
                {t("heroTitle")}
              </h1>
              <p className="mt-5 max-w-2xl text-lg text-pretty text-muted">{t("heroSubtitle")}</p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="xl" variant="primary" iconEnd={<ArrowRight />}>
                  <Link href="/new">{t("heroCtaPrimary")}</Link>
                </Button>
                <Button asChild size="xl" variant="outline">
                  <Link href="/#modes">{t("heroCtaSecondary")}</Link>
                </Button>
              </div>

              <p className="mt-4 text-sm text-subtle">{t("heroNote")}</p>

              <dl className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: ShieldCheck, label: t("proofOffline") },
                  { icon: Captions, label: t("proofLanguages") },
                  { icon: BadgeCheck, label: t("proofRights") },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2.5 rounded-lg border border-border bg-surface/70 px-3 py-2.5 backdrop-blur"
                  >
                    <item.icon aria-hidden className="size-4 shrink-0 text-primary" />
                    <dt className="text-xs leading-snug font-medium text-muted">{item.label}</dt>
                  </div>
                ))}
              </dl>
            </div>

            <HeroDemo />
          </div>
        </section>

        {/* --------------------------------------------------------- modes -- */}
        <section id="modes" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[100rem]">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                {t("modesEyebrow")}
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-fg sm:text-4xl">{t("modesTitle")}</h2>
              <p className="mt-4 text-base text-muted">{t("modesSubtitle")}</p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {modes.map((mode) => (
                <Card key={mode.id} interactive className="flex flex-col p-6">
                  <span
                    className={
                      mode.accent === "primary"
                        ? "grid size-11 place-items-center rounded-xl border border-primary/30 bg-primary-soft text-primary"
                        : "grid size-11 place-items-center rounded-xl border border-info/30 bg-info-soft text-info"
                    }
                  >
                    <mode.icon aria-hidden className="size-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-fg">{mode.title}</h3>
                  <p className="mt-2 flex-1 text-sm text-muted">{mode.desc}</p>
                  <dl className="mt-4 space-y-2 border-t border-hairline pt-4 text-xs">
                    <div className="flex gap-2">
                      <dt className="shrink-0 text-subtle">·</dt>
                      <dd className="text-muted">{mode.time}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="shrink-0 text-subtle">·</dt>
                      <dd className="text-muted">{mode.best}</dd>
                    </div>
                  </dl>
                </Card>
              ))}
            </div>

            {/* Quran highlight — the one place gold is allowed to lead */}
            <div
              id="quran"
              className="glow-gold relative mt-6 scroll-mt-24 overflow-hidden rounded-2xl border border-gold/35 bg-[linear-gradient(135deg,rgb(232_176_75/0.12),transparent_58%)] p-6 sm:p-8"
            >
              <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold-soft px-3 py-1 text-xs font-semibold text-gold">
                    <Sparkles aria-hidden className="size-3.5" />
                    {t("modeQuranTitle")}
                  </span>
                  <h3 className="mt-4 text-2xl font-semibold text-fg">{t("modeQuranDesc")}</h3>
                  <p className="mt-3 max-w-2xl text-sm text-muted">{quran("reviewIntro")}</p>
                  <p className="mt-3 text-sm text-gold">{t("modeQuranRights")}</p>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Button asChild variant="gold" size="lg">
                      <Link href="/quran-video">
                        {locale === "ar" ? "دخول استوديو القرآن المتقدم (9:16)" : nav("quranStudio")}
                      </Link>
                    </Button>
                    <Button asChild variant="secondary" size="lg">
                      <Link href="/new?mode=quran">{t("ctaButton")}</Link>
                    </Button>
                    <Button asChild variant="ghost" size="lg">
                      <Link href="/dashboard">{nav("dashboard")}</Link>
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-gold/25 bg-ink/70 p-5">
                  <p className="text-[10px] font-semibold tracking-[0.18em] text-gold uppercase">
                    {t("modeQuranBest")}
                  </p>
                  <p
                    dir="rtl"
                    className="font-quran mt-4 text-2xl text-fg"
                    style={{ fontFeatureSettings: '"liga" 1' }}
                  >
                    قُلْ هُوَ ٱللَّهُ أَحَدٌ
                  </p>
                  <p className="mt-2 text-xs text-muted" dir="rtl">
                    ١١٢ · الإخلاص · ١
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge tone="primary">{quran("confidenceHigh")}</Badge>
                    <Badge tone="warn">{quran("confidenceMedium")}</Badge>
                    <Badge tone="danger">{quran("confidenceLow")}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ features -- */}
        <section className="border-y border-border bg-ink-deep/60 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[100rem]">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                {t("featuresEyebrow")}
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-fg sm:text-4xl">{t("featuresTitle")}</h2>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="panel p-5">
                  <span className="grid size-10 place-items-center rounded-lg border border-border bg-raised text-primary">
                    <feature.icon aria-hidden className="size-4.5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-fg">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ workflow -- */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[100rem]">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                {t("workflowEyebrow")}
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-fg sm:text-4xl">{t("workflowTitle")}</h2>
            </div>

            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <li key={step.title} className="panel relative p-5">
                  <span className="num-tabular absolute end-4 top-4 font-mono text-3xl font-semibold text-border-strong">
                    {index + 1}
                  </span>
                  <span className="grid size-10 place-items-center rounded-lg border border-border bg-raised text-primary">
                    <step.icon aria-hidden className="size-4.5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-fg">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted">{step.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------- privacy -- */}
        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[100rem]">
            <div className="panel glow-primary overflow-hidden p-6 sm:p-10">
              <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                    <ShieldCheck aria-hidden className="size-3.5" />
                    {t("badge")}
                  </span>
                  <h2 className="mt-4 text-2xl font-semibold text-fg sm:text-3xl">
                    {t("privacyTitle")}
                  </h2>
                  <p className="mt-4 max-w-2xl text-base text-muted">{t("privacyDesc")}</p>
                </div>
                <ul className="space-y-3">
                  {[t("privacyPointLocal"), t("privacyPointServer"), t("privacyPointDelete")].map(
                    (point) => (
                      <li
                        key={point}
                        className="flex items-start gap-3 rounded-lg border border-border bg-ink/50 p-3.5"
                      >
                        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span className="text-sm text-muted">{point}</span>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <PricingSection />

        {/* ----------------------------------------------------------- faq -- */}
        <section id="faq" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-[100rem] gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 className="text-3xl font-semibold text-fg sm:text-4xl">{t("faqTitle")}</h2>
              <p className="mt-4 text-sm text-muted">
                {t("ctaSubtitle")}
              </p>
              <Button asChild variant="outline" className="mt-6">
                <Link href="/new">{t("ctaButton")}</Link>
              </Button>
            </div>
            <Accordion type="single" collapsible defaultValue="faq-0" className="panel px-5">
              {faq.map((item, index) => (
                <AccordionItem key={item.q} value={`faq-${index}`} question={item.q}>
                  {item.a}
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ----------------------------------------------------------- cta -- */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[100rem]">
            <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-[linear-gradient(120deg,rgb(25_195_125/0.16),transparent_55%)] p-8 text-center sm:p-14">
              <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" />
              <div className="relative">
                <h2 className="mx-auto max-w-3xl text-3xl font-semibold text-balance text-fg sm:text-4xl">
                  {t("ctaTitle")}
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-base text-muted">{t("ctaSubtitle")}</p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button asChild size="xl" variant="primary" iconEnd={<ArrowRight />}>
                    <Link href="/new">{t("ctaButton")}</Link>
                  </Button>
                  <Button asChild size="xl" variant="secondary">
                    <Link href="/dashboard">{t("ctaSecondary")}</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
