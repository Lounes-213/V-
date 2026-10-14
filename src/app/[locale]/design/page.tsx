"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Bell,
  Check,
  Download,
  Film,
  Info,
  Layers,
  Lock,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
  Waves,
} from "lucide-react";
import { AppShell, PageFrame } from "@/components/site/app-shell";
import { Badge, ScoreBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, Chip, Stat } from "@/components/ui/card";
import { ColorPicker } from "@/components/ui/color-picker";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { EmptyState, Separator } from "@/components/ui/overlays";
import { ProgressBar, ProgressRing } from "@/components/ui/progress-ring";
import { SkeletonCard, SkeletonRows, SkeletonText } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Segmented, SwitchRow } from "@/components/ui/switch";
import { TabGroup, TabPanel, TabsList } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { useFormat } from "@/components/providers/number-format";
import { usePrefs } from "@/lib/prefs-store";
import { cn } from "@/lib/cn";

const COLOURS: { name: string; token: string; className: string }[] = [
  { name: "ink", token: "--color-ink", className: "bg-ink" },
  { name: "surface", token: "--color-surface", className: "bg-surface" },
  { name: "raised", token: "--color-raised", className: "bg-raised" },
  { name: "border", token: "--color-border", className: "bg-border" },
  { name: "primary", token: "--color-primary", className: "bg-primary" },
  { name: "gold", token: "--color-gold", className: "bg-gold" },
  { name: "danger", token: "--color-danger", className: "bg-danger" },
  { name: "info", token: "--color-info", className: "bg-info" },
  { name: "fg", token: "--color-fg", className: "bg-fg" },
  { name: "muted", token: "--color-muted", className: "bg-muted" },
];

const TYPE_SCALE = [
  { name: "display", className: "text-5xl font-semibold", sample: "قصّ فيديو بكلمة" },
  { name: "h1", className: "text-3xl font-semibold", sample: "Editor timeline" },
  { name: "h2", className: "text-xl font-semibold", sample: "Inspector" },
  { name: "body", className: "text-sm", sample: "تكتب، تحذف، والفيديو يتقصّ وحدو." },
  { name: "caption", className: "text-xs text-muted", sample: "40 words per minute" },
  { name: "mono", className: "font-mono text-xs num-tabular", sample: "00:12.480" },
];

export default function DesignGalleryPage() {
  const t = useTranslations("gallery");
  const common = useTranslations("common");
  const a11y = useTranslations("a11y");
  const { tc, n } = useFormat();
  const { toast } = useToast();
  const prefs = usePrefs();

  const [loading, setLoading] = React.useState(true);
  const [dialog, setDialog] = React.useState(false);
  const [tab, setTab] = React.useState("one");
  const [chip, setChip] = React.useState("a");
  const [colour, setColour] = React.useState("#19C37D");
  const [switchOn, setSwitchOn] = React.useState(true);
  const [checked, setChecked] = React.useState(true);
  const [slider, setSlider] = React.useState(62);
  const [segment, setSegment] = React.useState("9:16");
  const [rtl, setRtl] = React.useState(prefs.digits === "arabic");

  React.useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <TooltipProvider>
      <AppShell>
      <PageFrame>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-fg sm:text-3xl">{t("title")}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">{t("subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<Layers />} onClick={() => setLoading(!loading)}>
              {loading ? t("stateLoading") : t("stateDefault")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRtl(!rtl)}>
              {t("rtlPreview")}
            </Button>
          </div>
        </header>

        <div className={cn("mt-8 space-y-10", rtl && "[direction:rtl]")} dir={rtl ? "rtl" : "ltr"}>
          {/* -------------------------------------------------------- tokens -- */}
          <section>
            <SectionTitle index="01" title={t("sectionColour")} note={t("colourRoles")} />
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {COLOURS.map((entry) => (
                <li key={entry.name} className="rounded-xl border border-border bg-surface/50 p-3">
                  <span className={cn("block h-12 w-full rounded-lg border border-hairline", entry.className)} />
                  <span className="mt-2 block text-xs text-fg">{entry.name}</span>
                  <span className="num-tabular block font-mono text-[10px] text-subtle">{entry.token}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <SectionTitle index="02" title={t("sectionType")} />
            <div className="mt-4 space-y-3 rounded-xl border border-border bg-surface/50 p-4">
              {TYPE_SCALE.map((entry) => (
                <div key={entry.name} className="flex flex-wrap items-baseline gap-4">
                  <span className="num-tabular w-20 shrink-0 font-mono text-[10px] text-subtle">{entry.name}</span>
                  <span className={entry.className}>{entry.sample}</span>
                </div>
              ))}
              <Separator />
              <p dir="rtl" className="font-quran text-2xl leading-[2.2] text-fg">
                قُلْ هُوَ ٱللَّهُ أَحَدٌ
              </p>
            </div>
          </section>

          <section>
            <SectionTitle index="03" title={t("sectionSpacing")} note={t("spacingNote")} />
            <div className="mt-4 flex flex-wrap items-end gap-3">
              {[1, 2, 3, 4, 6, 8, 10, 12].map((step) => (
                <div key={step} className="text-center">
                  <div className="rounded bg-primary/25" style={{ width: step * 4, height: 24 }} />
                  <span className="num-tabular mt-1 block font-mono text-[10px] text-subtle">{step}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ------------------------------------------------------- buttons -- */}
          <section>
            <SectionTitle index="04" title={t("sectionButtons")} />
            <div className="mt-4 space-y-4 rounded-xl border border-border bg-surface/50 p-4">
              <Row label={t("stateDefault")}>
                <Button variant="primary" icon={<Sparkles />}>
                  {common("apply")}
                </Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger" icon={<Trash2 />}>
                  {common("delete")}
                </Button>
                <Button variant="gold" icon={<Download />}>
                  Export
                </Button>
              </Row>
              <Row label={t("stateSelected")}>
                <Button variant="primary" size="xs">
                  xs
                </Button>
                <Button variant="primary" size="sm">
                  sm
                </Button>
                <Button variant="primary" size="md">
                  md
                </Button>
                <Button variant="primary" size="lg">
                  lg
                </Button>
              </Row>
              <Row label={t("stateDisabled")}>
                <Button disabled>Disabled</Button>
                <Button loading>Loading</Button>
                <IconButton label={a11y("liveRegion")} size="sm">
                  <Plus />
                </IconButton>
                <IconButton label="Locked" size="sm" disabled>
                  <Lock />
                </IconButton>
              </Row>
              <Row label={t("stateHover")}>
                <Tooltip content="Tooltip · 150ms">
                  <Button variant="secondary" icon={<Info />}>
                    Hover me
                  </Button>
                </Tooltip>
                <span className="text-xs text-subtle">focus rings follow :focus-visible</span>
              </Row>
            </div>
          </section>

          {/* -------------------------------------------------------- inputs -- */}
          <section>
            <SectionTitle index="05" title={t("sectionInputs")} />
            <div className="mt-4 grid gap-4 rounded-xl border border-border bg-surface/50 p-4 lg:grid-cols-3">
              <Field label="Project name" htmlFor="g-name">
                <Input id="g-name" placeholder="Ramadan day 12" />
              </Field>
              <Field label="With error" htmlFor="g-err" error="This field cannot be empty">
                <Input id="g-err" defaultValue="" />
              </Field>
              <Field label="With hint" htmlFor="g-hint" hint="Arabic or Latin, both are fine">
                <Input id="g-hint" defaultValue="دارجة" />
              </Field>
              <Field label="Notes" htmlFor="g-notes" className="lg:col-span-3">
                <Textarea id="g-notes" rows={3} placeholder="Write a caption draft…" />
              </Field>
              <div className="space-y-3">
                <SwitchRow label="Burn captions" checked={switchOn} onCheckedChange={setSwitchOn} />
                <SwitchRow label="Disabled" checked={false} onCheckedChange={() => {}} disabled />
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-fg">
                  <Checkbox checked={checked} onCheckedChange={(value) => setChecked(value === true)} />
                  Checkbox
                </label>
                <Segmented
                  label="Aspect"
                  value={segment}
                  onValueChange={setSegment}
                  options={[
                    { value: "9:16", label: "9:16" },
                    { value: "1:1", label: "1:1" },
                    { value: "16:9", label: "16:9" },
                  ]}
                />
              </div>
              <div className="space-y-3">
                <Slider label={`Text size · ${n(slider)}px`} value={slider} min={24} max={96} onValueChange={setSlider} />
                <ColorPicker value={colour} onChange={setColour} label="Highlight colour" />
              </div>
              <div className="flex flex-wrap gap-2 lg:col-span-3">
                {["a", "b", "c"].map((id) => (
                  <Chip key={id} selected={chip === id} onClick={() => setChip(id)}>
                    Chip {id}
                  </Chip>
                ))}
                <Badge tone="primary">primary</Badge>
                <Badge tone="gold">gold</Badge>
                <Badge tone="info">info</Badge>
                <Badge tone="warn">warn</Badge>
                <Badge tone="danger">danger</Badge>
                <ScoreBadge value={91} label="hook" />
              </div>
            </div>
          </section>

          {/* ------------------------------------------------------ feedback -- */}
          <section>
            <SectionTitle index="06" title={t("sectionFeedback")} />
            <div className="mt-4 grid gap-4 rounded-xl border border-border bg-surface/50 p-4 lg:grid-cols-3">
              <div className="space-y-3">
                <p className="text-xs text-subtle">Toasts</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => toast({ title: common("saved"), tone: "success" })}>
                    success
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => toast({ title: common("loading"), tone: "info", description: "…" })}>
                    info
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => toast({ title: common("retry"), tone: "danger" })}>
                    danger
                  </Button>
                </div>
                <Button size="sm" variant="secondary" icon={<Bell />} onClick={() => setDialog(true)}>
                  {t("sectionOverlays")}
                </Button>
              </div>
              <div className="space-y-3">
                <p className="text-xs text-subtle">Progress</p>
                <ProgressBar value={62} label="Export 62%" />
                <ProgressBar value={38} tone="gold" label="Quota 38%" />
                <ProgressBar value={0} indeterminate label="Indeterminate" />
                <div className="flex items-center gap-4">
                  <ProgressRing value={72} label="72%" sublabel="export" />
                  <ProgressRing value={94} tone="gold" label="94%" sublabel="score" />
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs text-subtle">Skeletons</p>
                <SkeletonText lines={3} />
                <SkeletonRows rows={2} />
              </div>
              <div className="lg:col-span-3">
                <p className="text-xs text-subtle">States</p>
                <div className="mt-2 grid gap-3 lg:grid-cols-2">
                  <EmptyState
                    icon={<Film />}
                    title="No projects yet"
                    description="Import a clip to start — it stays on your device."
                    action={<Button variant="primary" icon={<Plus />}>New project</Button>}
                  />
                  <EmptyState
                    icon={<Waves />}
                    title="Nothing to analyse"
                    description="Sound detection found no speech in this file."
                    action={<Button variant="secondary">Try another file</Button>}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------- data -- */}
          <section>
            <SectionTitle index="07" title={t("sectionData")} />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Projects" value={n(12)} icon={<Film />} />
              <Stat label="Minutes" value={n(48.5)} hint={tc(2910)} />
              <Stat label="Exports" value={n(31)} icon={<Download />} />
              <Stat label="Words" value={n(4820)} hint={tc(2910)} />
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <Card>
                <CardHeader title="Card with header" description="Used across dashboard and billing." icon={<Layers />} />
                <div className="mt-4">
                  <TabGroup value={tab} onValueChange={setTab} className="w-full">
                    <TabsList
                      label="Gallery tabs"
                      className="w-full"
                      items={[
                        { value: "one", label: "Style", icon: <Sparkles /> },
                        { value: "two", label: "Captions" },
                        { value: "three", label: "Export", icon: <Download /> },
                      ]}
                    />
                    <TabPanel value="one" className="mt-3 text-sm text-muted">
                      Panels keep their own scroll and never widen the pane.
                    </TabPanel>
                    <TabPanel value="two" className="mt-3 text-sm text-muted">
                      <span dir="rtl">الترجمات تتوسّط الشاشة وتتناسب مع الإطار.</span>
                    </TabPanel>
                    <TabPanel value="three" className="mt-3 text-sm text-muted">
                      <span className="num-tabular font-mono">{tc(96.4)}</span>
                    </TabPanel>
                  </TabGroup>
                </div>
              </Card>
              <Card>
                <CardHeader title={`${n(loading ? 0 : 100)} — ${loading ? t("stateLoading") : t("stateDefault")}`} />
                {loading ? (
                  <div className="mt-3">
                    <SkeletonCard />
                  </div>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm text-muted">
                    <li className="flex items-center gap-2">
                      <Check aria-hidden className="size-3.5 text-primary" /> every state has a real component
                    </li>
                    <li className="flex items-center gap-2">
                      <Check aria-hidden className="size-3.5 text-primary" /> RTL flips layout, not timecodes
                    </li>
                    <li className="flex items-center gap-2">
                      <Wand2 aria-hidden className="size-3.5 text-gold" /> toggle RTL above to check
                    </li>
                  </ul>
                )}
                <Button variant="ghost" size="sm" className="mt-3" icon={<ArrowRight className="rtl:rotate-180" />}>
                  {common("learnMore")}
                </Button>
              </Card>
            </div>
          </section>

          <p className="text-xs text-subtle">{t("rtlNote")}</p>
        </div>
      </PageFrame>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent title={t("sectionOverlays")} description="Dialog, sheet and tooltip primitives share one focus trap." size="sm">
          <div className="mt-4 space-y-3">
            <Field label="Caption text" htmlFor="d-caption">
              <Input id="d-caption" defaultValue="سلام وعليكم" dir="auto" />
            </Field>
            <p className="text-xs text-muted">Phone widths turn this into a bottom sheet automatically.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDialog(false)}>
                {common("cancel")}
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setDialog(false);
                  toast({ title: common("saved"), tone: "success" });
                }}
              >
                {common("save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>      </AppShell>
    </TooltipProvider>
  );
}

function SectionTitle({ index, title, note }: { index: string; title: string; note?: string }) {
  return (
    <div className="border-b border-hairline pb-2">
      <h2 className="flex items-center gap-3 text-base font-semibold text-fg">
        <span className="num-tabular font-mono text-xs text-primary">{index}</span>
        {title}
      </h2>
      {note ? <p className="mt-1 text-xs text-subtle">{note}</p> : null}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-subtle">{label}</span>
      {children}
    </div>
  );
}
