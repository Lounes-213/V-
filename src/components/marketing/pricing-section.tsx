"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/switch";
import { useFormat } from "@/components/providers/number-format";
import { cn } from "@/lib/cn";

type Plan = {
  id: "free" | "creator" | "studio";
  monthly: number;
  yearly: number;
  features: string[];
  highlight?: boolean;
  accent?: "primary" | "gold";
};

const PLANS: Plan[] = [
  {
    id: "free",
    monthly: 0,
    yearly: 0,
    features: ["featProject1", "featMinutes30", "featExport720", "featQuranBasic"],
  },
  {
    id: "creator",
    monthly: 9,
    yearly: 90,
    highlight: true,
    features: [
      "featProject5",
      "featMinutes300",
      "featExportOriginal",
      "featWatermark",
      "featQuranFull",
      "featSupport",
    ],
  },
  {
    id: "studio",
    monthly: 29,
    yearly: 290,
    accent: "gold",
    features: [
      "featProjectUnlimited",
      "featMinutes1200",
      "featExportOriginal",
      "featWatermark",
      "featQuranFull",
      "featSupportPriority",
      "featTeam",
    ],
  },
];

export function PricingSection() {
  const t = useTranslations("landing");
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const { n } = useFormat();

  return (
    <section id="pricing" className="scroll-mt-24 border-t border-border bg-ink-deep/60 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[100rem]">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            {t("pricingEyebrow")}
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-fg sm:text-4xl">{t("pricingTitle")}</h2>
          <p className="mt-4 text-base text-muted">{t("pricingSubtitle")}</p>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <Segmented
            label={t("billingMonthly")}
            value={cycle}
            onValueChange={(value) => setCycle(value)}
            options={[
              { value: "monthly", label: t("billingMonthly") },
              { value: "yearly", label: t("billingYearly") },
            ]}
          />
          {cycle === "yearly" ? (
            <Badge tone="primary">
              <Sparkles aria-hidden className="size-3" />
              {t("billingSave")}
            </Badge>
          ) : null}
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const price = cycle === "monthly" ? plan.monthly : plan.yearly;
            const isFree = price === 0;

            return (
              <div
                key={plan.id}
                className={cn(
                  "panel relative flex flex-col p-6",
                  plan.highlight && "border-primary/45 shadow-[var(--shadow-glow)]",
                  plan.accent === "gold" && "border-gold/40",
                )}
              >
                {plan.highlight ? (
                  <span className="absolute -top-3 start-6 rounded-full border border-primary/40 bg-ink px-3 py-0.5 text-[10px] font-semibold tracking-wider text-primary uppercase">
                    {t("planMostPopular")}
                  </span>
                ) : null}

                <h3 className="text-lg font-semibold text-fg">
                  {t(`plan${plan.id.charAt(0).toUpperCase()}${plan.id.slice(1)}` as "planFree")}
                </h3>
                <p className="mt-1 min-h-10 text-sm text-muted">
                  {t(
                    `plan${plan.id.charAt(0).toUpperCase()}${plan.id.slice(1)}Desc` as "planFreeDesc",
                  )}
                </p>

                <div className="mt-5 flex items-baseline gap-2">
                  {isFree ? (
                    <>
                      <span className="text-4xl font-semibold tracking-tight text-fg">
                        {t("planFreePrice")}
                      </span>
                      <span className="text-sm text-subtle">{t("planForever")}</span>
                    </>
                  ) : (
                    <>
                      <span className="num-tabular text-4xl font-semibold tracking-tight text-fg">
                        ${n(price)}
                      </span>
                      <span className="text-sm text-subtle">
                        {cycle === "monthly" ? t("perMonth") : t("perYear")}
                      </span>
                    </>
                  )}
                </div>
                {!isFree ? (
                  <p className="num-tabular mt-1 text-xs text-subtle">
                    ≈ {n(cycle === "monthly" ? price * 145 : price * 145)} DZD
                  </p>
                ) : null}

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-muted">
                      <Check
                        aria-hidden
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          plan.accent === "gold" ? "text-gold" : "text-primary",
                        )}
                        strokeWidth={3}
                      />
                      <span>{t(feature as "featProject1")}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  className="mt-6"
                  full
                  size="lg"
                  variant={plan.highlight ? "primary" : plan.accent === "gold" ? "gold" : "secondary"}
                >
                  <Link href="/new">{isFree ? t("planCtaFree") : t("planCtaPaid")}</Link>
                </Button>
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-sm text-subtle">{t("pricingNote")}</p>
      </div>
    </section>
  );
}
