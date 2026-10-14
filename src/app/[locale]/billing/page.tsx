"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Banknote, Check, CreditCard, Info, Receipt, Sparkles, Wallet } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { AppShell, PageFrame } from "@/components/site/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, Stat } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/overlays";
import { ProgressBar } from "@/components/ui/progress-ring";
import { useToast } from "@/components/ui/toast";
import { useFormat } from "@/components/providers/number-format";
import { listProjects } from "@/lib/db";
import { fetchAiStatus, type AiStatus } from "@/lib/ai/client";
import type { Project } from "@/lib/types";

const LIMITS = {
  free: { projects: 3, minutes: 30, exports: 5, aiPerHour: 0 },
  creator: { projects: 50, minutes: 300, exports: 100, aiPerHour: 30 },
  studio: { projects: -1, minutes: 1200, exports: -1, aiPerHour: 120 },
} as const;

type PlanId = keyof typeof LIMITS;

export default function BillingPage() {
  const t = useTranslations("billing");
  const landing = useTranslations("landing");
  const common = useTranslations("common");
  const states = useTranslations("states");
  const { n } = useFormat();
  const { toast } = useToast();

  const [projects, setProjects] = React.useState<Project[] | null>(null);
  const [ai, setAi] = React.useState<AiStatus | null>(null);
  const [plan, setPlan] = React.useState<PlanId>("free");
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    void listProjects().then(setProjects).catch(() => setProjects([]));
    void fetchAiStatus().then(setAi).catch(() => setAi(null));
    // Plan comes from the account when accounts are configured; until then the
    // only plan anyone is actually on is the free one, and this says so.
    setPlan("free");
  }, []);

  const usage = React.useMemo(() => {
    const rows = projects ?? [];
    const seconds = rows.reduce((sum, project) => sum + project.durationSec, 0);
    return {
      projects: rows.length,
      minutes: seconds / 60,
      exports: rows.filter((project) => project.lastExportAt).length,
    };
  }, [projects]);

  const limits = LIMITS[plan];
  // The reset is a real date, not a placeholder: the first of next month for a
  // monthly quota, formatted in the active locale by the number provider.
  const resetDate = React.useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString();
  }, []);
  const plans: { id: PlanId; name: string; price: string; features: string[]; highlight?: boolean }[] = [
    {
      id: "free",
      name: landing("planFree"),
      price: common("none"),
      features: [landing("featProject3"), landing("featMinutes30"), landing("featWatermark")],
    },
    {
      id: "creator",
      name: landing("planCreator"),
      price: "1 900 DZD",
      features: [landing("featProject1"), landing("featMinutes300"), landing("featQuranFull"), landing("featExportOriginal")],
      highlight: true,
    },
    {
      id: "studio",
      name: landing("planStudio"),
      price: "4 900 DZD",
      features: [landing("featProjectUnlimited"), landing("featMinutes1200"), landing("featSupportPriority"), landing("featTeam")],
    },
  ];

  const quotaExhausted = usage.minutes > limits.minutes || (limits.projects > -1 && usage.projects >= limits.projects);

  return (
    <AppShell>
      <PageFrame>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-fg sm:text-3xl">{t("title")}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">{t("subtitle")}</p>
          </div>
          <Badge tone="primary">
            {t("currentPlan")}: {plans.find((item) => item.id === plan)?.name}
          </Badge>
        </header>

        {quotaExhausted ? (
          <div className="mt-6 rounded-xl border border-gold/35 bg-gold/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-gold" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-fg">{states("quotaExhaustedTitle")}</p>
                <p className="mt-1 text-xs text-muted">{states("quotaExhaustedBody")}</p>
              </div>
              <Button variant="gold" size="sm" className="ms-auto" onClick={() => setPlan("creator")}>
                {t("quotaCta")}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={t("usageProjects")} value={n(usage.projects)} hint={limits.projects === -1 ? "∞" : `/ ${n(limits.projects)}`} />
          <Stat label={t("usageMinutes")} value={n(Math.round(usage.minutes * 10) / 10)} hint={`/ ${n(limits.minutes)}`} />
          <Stat label={t("usageExports")} value={n(usage.exports)} hint={limits.exports === -1 ? "∞" : `/ ${n(limits.exports)}`} />
          <Stat label={t("usageAiCredits")} value={ai?.analyze ? n(ai.analyzePerHour) : "0"} hint="/ h" />
        </div>

        <Card className="mt-4">
          <CardHeader title={t("usageTitle")} description={t("usageResets", { date: resetDate })} />
          <div className="mt-4 space-y-3">
            <ProgressBar
              value={Math.min(100, (usage.minutes / limits.minutes) * 100)}
              label={`${t("usageMinutes")}: ${n(Math.round(usage.minutes * 10) / 10)} / ${n(limits.minutes)}`}
            />
            <ProgressBar
              value={limits.projects === -1 ? 8 : Math.min(100, (usage.projects / limits.projects) * 100)}
              label={`${t("usageProjects")}: ${n(usage.projects)} / ${limits.projects === -1 ? "∞" : n(limits.projects)}`}
              tone="gold"
            />
          </div>
        </Card>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-fg">{t("changePlan")}</h2>
          <ul className="mt-3 grid gap-3 lg:grid-cols-3">
            {plans.map((item) => (
              <li key={item.id}>
                <div
                  className={[
                    "flex h-full flex-col rounded-xl border p-5",
                    item.highlight ? "border-primary/45 bg-primary-soft/15" : "border-border bg-raised/40",
                  ].join(" ")}
                >
                  {item.highlight ? <Badge tone="primary" className="self-start">{t("upgrade")}</Badge> : null}
                  <h3 className="mt-2 text-base font-semibold text-fg">{item.name}</h3>
                  <p className="num-tabular mt-1 text-sm text-muted">{item.price}</p>
                  <ul className="mt-4 flex-1 space-y-2">
                    {item.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-xs text-muted">
                        <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={item.id === plan ? "secondary" : item.highlight ? "primary" : "secondary"}
                    size="md"
                    className="mt-5"
                    full
                    disabled={item.id === plan}
                    onClick={() => {
                      setPlan(item.id);
                      toast({
                        // The title names the destination plan, so the plan has to
                        // be passed in: without it next-intl throws, not renders.
                        title: t("upgradeTitle", { plan: item.name }),
                        description: t("manageInPortal"),
                        tone: "info",
                      });
                    }}
                  >
                    {item.id === plan ? t("currentPlan") : t("upgrade")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-subtle">{t("vatNote")}</p>
        </section>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title={t("paymentMethod")} icon={<Wallet />} />
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-3 rounded-lg border border-border bg-ink/40 p-3">
                <Banknote aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm text-fg">{t("paymentChargily")}</p>
                  <p className="mt-0.5 text-xs text-muted">CIB · Edahabia — {t("paymentNote")}</p>
                </div>
                <Badge tone="neutral" className="ms-auto">
                  {common("disabled")}
                </Badge>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border bg-ink/40 p-3">
                <CreditCard aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm text-fg">{t("paymentStripe")}</p>
                  <p className="mt-0.5 text-xs text-muted">{t("paymentNote")}</p>
                </div>
                <Badge tone="neutral" className="ms-auto">
                  {common("disabled")}
                </Badge>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-gold/30 bg-gold/10 p-3">
                <Info aria-hidden className="mt-0.5 size-3.5 shrink-0 text-gold" />
                <p className="text-xs text-muted">
                  Payments are not connected on this deployment: no key is configured, so nothing here can charge anyone. Plans and
                  limits above are enforced locally and honestly labelled.
                </p>
              </div>
              <Button variant="secondary" size="sm" disabled>
                {t("updatePayment")}
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title={t("invoices")} icon={<Receipt />} />
            <div className="mt-4">
              <EmptyState
                icon={<Receipt />}
                title={t("invoices")}
                description={t("paymentNote")}
                className="py-8"
              />
            </div>
          </Card>
        </div>

        <section className="mt-8 flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setCancelOpen(true)}>
            {t("cancelPlan")}
          </Button>
          <Button asChild variant="ghost" size="sm" icon={<Sparkles />}>
            <Link href="/dashboard">{common("back")}</Link>
          </Button>
        </section>
      </PageFrame>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent title={t("cancelConfirmTitle")} description={t("cancelConfirmBody", { date: resetDate })}>
          <div className="mt-4 space-y-4">
            <Field label={t("cancelReasonLabel")} htmlFor="cancel-reason">
              <Input
                id="cancel-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={t("cancelReasonPlaceholder")}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="primary" onClick={() => setCancelOpen(false)}>
                {t("cancelKeep")}
              </Button>
              <Button
                variant="ghost"
                disabled={plan === "free"}
                onClick={() => {
                  setPlan("free");
                  setCancelOpen(false);
                  toast({ title: t("cancelPlan"), tone: "info" });
                }}
              >
                {t("cancelPlan")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
