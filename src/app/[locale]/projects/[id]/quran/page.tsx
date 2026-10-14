"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Check,
  Copy,
  Film,
  Info,
  Languages,
  Loader2,
  Pencil,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { AppShell, PageFrame } from "@/components/site/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/overlays";
import { SkeletonRows } from "@/components/ui/skeleton";
import { SwitchRow } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useFormat } from "@/components/providers/number-format";
import { getProject, putProject, getSetting, setSetting } from "@/lib/db";
import {
  ALL_SURAHS,
  detectProjectQuran,
  fetchCanonicalAyah,
  lookupAyah,
  type CanonicalAyah,
} from "@/lib/quran/canonical";
import { confidenceBand, requiresReview } from "@/lib/quran/normalize";
import { usePrefs } from "@/lib/prefs-store";
import { AyahAudioPlayer } from "@/components/quran/ayah-audio-player";
import { AddVerseDialog } from "@/components/quran/add-verse-dialog";
import { AlignSurahDialog } from "@/components/quran/align-surah-dialog";
import type { Project, QuranMatch, Word } from "@/lib/types";
import { cn } from "@/lib/cn";

type Band = "high" | "medium" | "low";

const BAND_TONE: Record<Band, { chip: string; badge: "primary" | "warn" | "danger" }> = {
  high: { chip: "border-primary/40 bg-primary-soft text-primary", badge: "primary" },
  medium: { chip: "border-gold/40 bg-gold/10 text-gold", badge: "warn" },
  low: { chip: "border-danger/40 bg-danger/10 text-danger", badge: "danger" },
};

export default function QuranModePage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? "";
  const locale = useLocale();
  const t = useTranslations("quran");
  const common = useTranslations("common");
  const states = useTranslations("states");
  const editor = useTranslations("editor");
  const { tc, n } = useFormat();
  const router = useRouter();
  const { toast } = useToast();
  const prefs = usePrefs();

  const [project, setProject] = React.useState<Project | null>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "missing" | "error">("loading");
  const [showTranslation, setShowTranslation] = React.useState(prefs.showTranslationByDefault);
  const [showTransliteration, setShowTransliteration] = React.useState(false);
  const [rightsAcknowledged, setRightsAcknowledged] = React.useState<boolean | null>(null);
  const [correcting, setCorrecting] = React.useState<QuranMatch | null>(null);
  const [addingVerse, setAddingVerse] = React.useState(false);
  const [aligningSurah, setAligningSurah] = React.useState(false);
  const [ackBusy, setAckBusy] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await getProject(projectId);
        if (cancelled) return;
        if (!stored) {
          setStatus("missing");
          return;
        }
        // Detection is derived from the transcript every time it is missing, so
        // this screen never shows a match that the matcher would not produce.
        const quran = stored.quran.length > 0 ? stored.quran : detectProjectQuran(stored.words);
        const next = quran === stored.quran ? stored : { ...stored, quran };
        if (quran !== stored.quran) await putProject(next);
        const ack = await getSetting<number>("quran-rights-ack", 0);
        if (cancelled) return;
        setProject(next);
        setRightsAcknowledged(ack > 0);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const save = async (next: Project) => {
    setProject(next);
    await putProject({ ...next, updatedAt: Date.now() });
  };

  const review = matches(project).filter((match) => requiresReview(match.confidence));
  const lockedForExport = review.some((match) => !match.reviewed);

  const approve = async (match: QuranMatch) =>
    save({
      ...project!,
      quran: project!.quran.map((item) => (item.id === match.id ? { ...item, reviewed: true } : item)),
    });

  const approveAll = async () =>
    save({ ...project!, quran: project!.quran.map((item) => ({ ...item, reviewed: true })) });

  /** Replaces the matched words with the canonical text, or generates new caption words */
  const applyToCaptions = async (match: QuranMatch) => {
    let canonical = lookupAyah(match.surah, match.ayah);
    if (!canonical) {
      canonical = await fetchCanonicalAyah(match.surah, match.ayah);
    }
    if (!canonical || !project) return;

    const inside = project.words.filter(
      (word) => word.start >= match.start - 0.05 && word.end <= match.end + 0.05,
    );

    const pieces = canonical.uthmani.split(/\s+/).filter(Boolean);
    const weights = pieces.map((piece) => Math.max(1, piece.replace(/[^\p{L}\p{N}]/gu, "").length));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    const span = Math.max(0.8, (inside[inside.length - 1]?.end ?? match.end) - (inside[0]?.start ?? match.start));
    let cursor = inside[0]?.start ?? match.start;

    let updatedWords = [...project.words];

    if (inside.length === 0) {
      // Create new words spanning the verse duration so captions show on screen
      const generatedWords: Word[] = pieces.map((piece, index) => {
        const duration = (span * (weights[index] ?? 1)) / total;
        const w: Word = {
          id: `w-q-${match.surah}-${match.ayah}-${index}-${Date.now().toString(36)}`,
          text: piece,
          start: Number(cursor.toFixed(3)),
          end: Number((cursor + duration).toFixed(3)),
          ayahRef: `${match.surah}:${match.ayah}`,
        };
        cursor += duration;
        return w;
      });
      updatedWords = [...updatedWords, ...generatedWords].sort((a, b) => a.start - b.start);
    } else {
      const replacements = new Map<string, { text: string; start: number; end: number }>();
      pieces.forEach((piece, index) => {
        const duration = (span * (weights[index] ?? 1)) / total;
        const word = inside[Math.min(index, inside.length - 1)];
        if (word && !replacements.has(word.id)) {
          replacements.set(word.id, {
            text: piece,
            start: Number(cursor.toFixed(3)),
            end: Number((cursor + duration).toFixed(3)),
          });
        }
        cursor += duration;
      });

      updatedWords = updatedWords.map((word) => {
        const replacement = replacements.get(word.id);
        return replacement ? { ...word, ...replacement, ayahRef: `${match.surah}:${match.ayah}` } : word;
      });
    }

    await save({
      ...project,
      words: updatedWords,
      quran: project.quran.map((item) => (item.id === match.id ? { ...item, reviewed: true } : item)),
    });
    toast({ title: t("applied"), description: `${match.surahName} · ${match.ayah}`, tone: "success" });
  };

  const correct = async (match: QuranMatch, surah: number, ayah: number) => {
    let canonical = lookupAyah(surah, ayah);
    if (!canonical) {
      canonical = await fetchCanonicalAyah(surah, ayah);
    }
    if (!canonical || !project) return;

    await save({
      ...project,
      quran: project.quran.map((item) =>
        item.id === match.id
          ? {
              ...item,
              surah,
              ayah,
              surahName: canonical.surahNameArabic,
              uthmani: canonical.uthmani,
              translation: canonical.translation,
              correctedAyah: ayah,
              confidence: 1,
              reviewed: true,
            }
          : item,
      ),
    });
    setCorrecting(null);
    toast({ title: t("correctionSaved"), tone: "success" });
  };

  const addVerseMatch = async (match: QuranMatch, shouldApplyToCaptions: boolean) => {
    if (!project) return;
    const nextQuran = [...project.quran, match].sort((a, b) => a.start - b.start);
    const nextProject = { ...project, quran: nextQuran };
    await save(nextProject);

    toast({
      title: locale === "ar" ? "تمت إضافة الآية بنجاح" : "Verse added to project",
      description: `${match.surahName} · الآية ${match.ayah}`,
      tone: "success",
    });

    if (shouldApplyToCaptions) {
      await applyToCaptions(match);
    }
  };

  const removeVerseMatch = async (matchId: string) => {
    if (!project) return;
    await save({
      ...project,
      quran: project.quran.filter((item) => item.id !== matchId),
    });
    toast({
      title: locale === "ar" ? "تم حذف الآية من المشروع" : "Verse removed from project",
      tone: "info",
    });
  };

  const copyUthmani = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast({
      title: locale === "ar" ? "تم نسخ النص القرآني" : "Quran text copied",
      tone: "info",
    });
  };

  return (
    <AppShell>
      <PageFrame>
        <Link
          href={`/projects/${projectId}/editor`}
          className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-fg [&_svg]:size-3.5"
        >
          <ArrowLeft className="rtl:rotate-180" aria-hidden />
          {common("back")}
        </Link>

        <header className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone="gold">
                <BookOpen aria-hidden className="size-3" /> {editor("quranMode")}
              </Badge>
              {project ? <span className="num-tabular font-mono text-[11px] text-subtle">{tc(project.durationSec)}</span> : null}
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-fg sm:text-3xl">{t("title")}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">{t("subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Sparkles className="text-gold" />}
              onClick={() => setAligningSurah(true)}
            >
              {locale === "ar" ? "محاذاة سورة كاملة مع الصوت" : "Auto-align Surah"}
            </Button>
            <Button
              variant="gold"
              size="sm"
              icon={<Plus />}
              onClick={() => setAddingVerse(true)}
            >
              {locale === "ar" ? "إضافة آية قرآنية" : "Add Quran Verse"}
            </Button>
            <Button variant="secondary" size="sm" icon={<Film />} onClick={() => router.push(`/projects/${projectId}/editor`)}>
              {editor("tabStyle")}
            </Button>
          </div>
        </header>

        {/* ------------------------------------------------- reciter rights -- */}
        <div className="mt-6 rounded-xl border border-gold/35 bg-gold/10 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-gold" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">{t("reciterRightsTitle")}</p>
              <p className="mt-1 text-xs text-muted">{t("reciterRightsBody")}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              variant={rightsAcknowledged ? "secondary" : "gold"}
              size="sm"
              icon={rightsAcknowledged ? <Check /> : <Info />}
              disabled={ackBusy || rightsAcknowledged === true}
              onClick={async () => {
                setAckBusy(true);
                await setSetting("quran-rights-ack", Date.now());
                setRightsAcknowledged(true);
                setAckBusy(false);
                toast({ title: t("reciterRightsAck"), tone: "success" });
              }}
            >
              {rightsAcknowledged ? t("reciterRightsAck") : t("reciterRightsTitle")}
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/legal/reciter-rights">{t("source")}</Link>
            </Button>
          </div>
        </div>

        {/* ------------------------------------------------------ review gate -- */}
        {project && matches(project).length > 0 ? (
          <div
            className={cn(
              "mt-4 rounded-xl border p-4",
              lockedForExport ? "border-danger/40 bg-danger/10" : "border-primary/35 bg-primary-soft/15",
            )}
          >
            <div className="flex items-start gap-3">
              {lockedForExport ? (
                <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
              ) : (
                <BadgeCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-fg">
                  {lockedForExport
                    ? t("reviewBannerTitle", {
                        count: n(review.filter((match) => !match.reviewed).length),
                      })
                    : t("allReviewed")}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {lockedForExport ? t("reviewBannerBody") : t("reviewIntro")}
                </p>
                {lockedForExport ? (
                  <p className="num-tabular mt-1 text-[11px] text-danger">
                    {n(review.filter((match) => !match.reviewed).length)} · {t("reviewBannerLocked")}
                  </p>
                ) : null}
              </div>
              {lockedForExport ? (
                <Button variant="secondary" size="sm" className="ms-auto" onClick={() => void approveAll()}>
                  {t("approveAll")}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* --------------------------------------------------------- controls -- */}
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface/50 p-4">
          <SwitchRow
            label={t("translationToggle")}
            description={t("translationLabel")}
            checked={showTranslation}
            onCheckedChange={setShowTranslation}
          />
          <SwitchRow
            label={t("transliterationToggle")}
            checked={showTransliteration}
            onCheckedChange={setShowTransliteration}
          />
          <div className="ms-auto flex items-center gap-2 text-xs text-subtle">
            <Languages aria-hidden className="size-3.5" />
            {t("scriptLabel")}: {t("scriptUthmani")}
          </div>
        </div>

        {/* ------------------------------------------------------------ list -- */}
        {status === "loading" ? (
          <div className="mt-6">
            <SkeletonRows rows={4} />
          </div>
        ) : status === "missing" ? (
          <div className="mt-6">
            <EmptyState
              icon={<AlertTriangle />}
              title={states("notFoundTitle")}
              description={states("notFoundBody")}
              action={
                <Button asChild variant="primary">
                  <Link href="/dashboard">{states("notFoundCta")}</Link>
                </Button>
              }
            />
          </div>
        ) : status === "error" ? (
          <div className="mt-6">
            <EmptyState icon={<AlertTriangle />} title={states("errorTitle")} description={states("errorBody")} />
          </div>
        ) : matches(project).length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<BookOpen />}
              title={locale === "ar" ? "لم يتم اكتشاف آيات تلقائياً" : t("ayahEmpty")}
              description={
                locale === "ar"
                  ? "يمكنك الآن إضافة وتصفح أي آية من القرآن الكريم الـ 114 سورة بنقرة زر وضبط توقيتها."
                  : t("reviewIntro")
              }
              action={
                <Button
                  variant="gold"
                  icon={<Plus />}
                  onClick={() => setAddingVerse(true)}
                >
                  {locale === "ar" ? "إضافة آية الآن" : "Add Verse Now"}
                </Button>
              }
              secondary={
                <Button variant="secondary" icon={<Sparkles />} onClick={() => router.push(`/projects/${projectId}/editor`)}>
                  {common("open")}
                </Button>
              }
            />
          </div>
        ) : (
          <ol className="mt-6 space-y-3">
            {matches(project).map((match) => {
              const band = confidenceBand(match.confidence) as Band;
              const tone = BAND_TONE[band];
              return (
                <li key={match.id}>
                  <Card className="p-4 border-gold/30 hover:border-gold/60 transition-colors">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge tone="gold">
                          سورة {match.surahName} · {n(match.surah)}:{n(match.ayah)}
                        </Badge>
                        <span className={cn("num-tabular rounded-full border px-2 py-0.5 text-[11px]", tone.chip)}>
                          {band === "high" ? t("confidenceChipHigh") : band === "medium" ? t("confidenceChipMedium") : t("confidenceChipLow")}{" "}
                          {Math.round(match.confidence * 100)}%
                        </span>
                        {match.correctedAyah ? <Badge tone="neutral">{t("correct")}</Badge> : null}
                        {match.reviewed ? <Badge tone="primary">{common("done")}</Badge> : null}
                      </div>
                      <div className="num-tabular flex items-center gap-2 font-mono text-[11px] text-subtle">
                        {tc(match.start)} → {tc(match.end)}
                      </div>
                    </div>

                    <p
                      dir="rtl"
                      className="font-quran mt-3 text-xl leading-[2.2] text-fg text-center py-2"
                    >
                      {match.uthmani}
                      <span className="text-gold mx-2">۝</span>
                    </p>

                    {showTranslation && match.translation ? (
                      <p dir="ltr" className="mt-2 border-s-2 border-gold/40 ps-3 text-xs text-muted">
                        {match.translation}
                      </p>
                    ) : null}
                    {showTransliteration && match.transliteration ? (
                      <p dir="ltr" className="mt-2 text-xs text-subtle">
                        {match.transliteration}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <AyahAudioPlayer surah={match.surah} ayah={match.ayah} />
                      <Button
                        variant={match.reviewed ? "secondary" : "primary"}
                        size="sm"
                        icon={<Check />}
                        disabled={match.reviewed}
                        onClick={() => void approve(match)}
                      >
                        {match.reviewed ? common("done") : t("approve")}
                      </Button>
                      <Button variant="secondary" size="sm" icon={<BookOpen />} onClick={() => void applyToCaptions(match)}>
                        {t("applyToCaptions")}
                      </Button>
                      <Button variant="ghost" size="sm" icon={<Pencil />} onClick={() => setCorrecting(match)}>
                        {t("correct")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Copy />}
                        onClick={() => copyUthmani(match.uthmani)}
                        title="Copy text"
                      >
                        {locale === "ar" ? "نسخ" : "Copy"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 />}
                        onClick={() => void removeVerseMatch(match.id)}
                        className="text-subtle hover:text-danger"
                      >
                        {common("delete")}
                      </Button>
                      <span className="num-tabular ms-auto text-[11px] text-subtle">
                        {match.fromCache ? t("offlineNotice") : t("source")}
                      </span>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ol>
        )}

        {project ? (
          <p className="num-tabular mt-6 text-[11px] text-subtle">
            {t("segmentsLabel")}: {n(matches(project).length)} · {t("wordCount", { count: n(project.words.length) })}
          </p>
        ) : null}
      </PageFrame>

      {/* Dialog for correcting a verse with all 114 surahs */}
      <Dialog open={correcting !== null} onOpenChange={(open) => !open && setCorrecting(null)}>
        <DialogContent title={t("correctLabel")} description="اختر السورة والآية الصحيحة من المصحف الشريف لتحديث النص العثماني والترجمة.">
          {correcting ? (
            <CorrectionForm
              match={correcting}
              onSubmit={(surah, ayah) => void correct(correcting, surah, ayah)}
              onCancel={() => setCorrecting(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Dialog for adding new verse */}
      <AddVerseDialog
        open={addingVerse}
        onOpenChange={setAddingVerse}
        projectDuration={project?.durationSec || 60}
        onAdd={addVerseMatch}
      />

      {/* Dialog for auto-aligning full Surah to audio */}
      {project ? (
        <AlignSurahDialog
          open={aligningSurah}
          onOpenChange={setAligningSurah}
          project={project}
          onSuccess={(updated) => setProject(updated)}
        />
      ) : null}
    </AppShell>
  );
}

/** Narrowing helper: the screen always has a project once it is ready. */
function matches(project: Project | null): QuranMatch[] {
  return project?.quran ?? [];
}

function CorrectionForm({
  match,
  onSubmit,
  onCancel,
}: {
  match: QuranMatch;
  onSubmit: (surah: number, ayah: number) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("quran");
  const common = useTranslations("common");
  const [surah, setSurah] = React.useState(match.surah);
  const [ayah, setAyah] = React.useState(match.ayah);
  const [canonical, setCanonical] = React.useState<CanonicalAyah | null>(lookupAyah(match.surah, match.ayah) ?? null);
  const [loading, setLoading] = React.useState(false);

  const activeSurahMeta = ALL_SURAHS.find((s) => s.number === surah) ?? ALL_SURAHS[0]!;

  React.useEffect(() => {
    let cancelled = false;
    const direct = lookupAyah(surah, ayah);
    if (direct) {
      setCanonical(direct);
      return;
    }
    setLoading(true);
    void fetchCanonicalAyah(surah, ayah).then((res) => {
      if (cancelled) return;
      setCanonical(res ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [surah, ayah]);

  return (
    <form
      className="mt-4 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(surah, ayah);
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-fg mb-1">{t("surahLabel")}</label>
          <Select
            value={String(surah)}
            onValueChange={(val) => {
              const num = Number(val);
              setSurah(num);
              setAyah(1);
            }}
          >
            <SelectTrigger id="surah" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto">
              {ALL_SURAHS.map((s) => (
                <SelectItem key={s.number} value={String(s.number)}>
                  <span className="font-mono text-xs text-subtle me-1.5">{s.number}.</span>
                  <span className="font-semibold text-fg">{s.nameArabic}</span>
                  <span className="text-xs text-muted ms-1.5">({s.nameSimple} · {s.ayahCount} آية)</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-xs font-medium text-fg mb-1">
            {t("ayahLabel", { number: ayah })} (1 - {activeSurahMeta.ayahCount})
          </label>
          <Input
            id="ayah"
            type="number"
            min={1}
            max={activeSurahMeta.ayahCount}
            value={ayah}
            onChange={(event) => {
              const val = Math.max(1, Math.min(activeSurahMeta.ayahCount, Number(event.target.value) || 1));
              setAyah(val);
            }}
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-ink/40 p-4 flex items-center justify-center text-xs text-subtle">
          <Loader2 className="size-4 animate-spin text-gold me-2" />
          جاري جلب نص الآية...
        </div>
      ) : canonical ? (
        <div className="rounded-lg border border-gold/40 bg-gold/5 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-gold">
            <span className="font-medium">سورة {canonical.surahNameArabic} · الآية {canonical.ayah}</span>
            <AyahAudioPlayer surah={surah} ayah={ayah} />
          </div>
          <p dir="rtl" className="font-quran text-xl leading-[2.3] text-fg text-center py-1">
            {canonical.uthmani} <span className="text-gold mx-1">۝</span>
          </p>
          {canonical.translation ? (
            <p dir="ltr" className="text-xs text-muted border-t border-border/40 pt-2">
              {canonical.translation}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-xs text-danger">{t("ayahEmpty")}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {common("cancel")}
        </Button>
        <Button type="submit" variant="primary" disabled={!canonical || loading}>
          {common("save")}
        </Button>
      </div>
    </form>
  );
}
