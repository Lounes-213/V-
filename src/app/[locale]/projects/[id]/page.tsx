"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CalendarClock,
  Clock,
  Copy,
  ExternalLink,
  FileVideo,
  Film,
  Hash,
  Layers,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { AppShell, PageFrame } from "@/components/site/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, Stat } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/overlays";
import { SkeletonRows } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useFormat } from "@/components/providers/number-format";
import { deleteProject, getMedia, getProject, putProject } from "@/lib/db";
import { readMediaFile } from "@/lib/media-store";
import { demoMediaFor } from "@/lib/demo-media";
import { AlignSurahDialog } from "@/components/quran/align-surah-dialog";
import type { Project } from "@/lib/types";

type MediaState =
  | { kind: "loading" }
  | { kind: "playing"; url: string; name: string; poster?: string; credit?: string; license?: string; width?: number; height?: number }
  | { kind: "none" };

/**
 * Project overview: the screen between the library and the editor.
 *
 * It answers "what is in here?" with data the project actually carries — its
 * transcript, its clips, its measured suggestions — and it plays the media when
 * the bytes are still on this device.
 */
export default function ProjectOverviewPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? "";
  const t = useTranslations("projects");
  const dashboard = useTranslations("dashboard");
  const common = useTranslations("common");
  const states = useTranslations("states");
  const editor = useTranslations("editor");
  const { tc, n } = useFormat();
  const router = useRouter();
  const { toast } = useToast();

  const [project, setProject] = React.useState<Project | null>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "missing" | "error">("loading");
  const [media, setMedia] = React.useState<MediaState>({ kind: "loading" });
  const [renaming, setRenaming] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [alignSurahOpen, setAlignSurahOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    void (async () => {
      try {
        const stored = await getProject(projectId);
        if (cancelled) return;
        if (!stored) {
          setStatus("missing");
          return;
        }
        setProject(stored);
        setStatus("ready");

        // Media: OPFS first, then the blob fallback, then the bundled demo clip.
        const handle = await getMedia(projectId);
        const demo = demoMediaFor(projectId);
        let url: string | undefined;
        let name = stored.sourceName ?? handle?.name ?? "";

        if (handle?.blob) {
          url = URL.createObjectURL(handle.blob);
          name = handle.name || name;
        } else if (handle?.opfsPath) {
          const file = await readMediaFile(handle.opfsPath);
          if (file) {
            url = URL.createObjectURL(file);
            name = file.name || name;
          }
        }
        if (!url && demo) {
          url = demo.src;
          name = demo.fileName;
        }
        if (cancelled) {
          if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
          return;
        }

        if (!url) {
          setMedia({ kind: "none" });
          return;
        }
        if (url.startsWith("blob:")) created.push(url);
        setMedia({
          kind: "playing",
          url,
          name,
          poster: handle?.posterDataUrl,
          credit: demo?.credit,
          license: demo ? `${demo.license.name} — ${demo.license.author}` : undefined,
          width: handle?.width,
          height: handle?.height,
        });
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      for (const url of created) URL.revokeObjectURL(url);
    };
  }, [projectId]);

  const statusLabel = (value: Project) => {
    if (value.status === "draft") return t("statusDraft");
    if (value.status === "transcribing") return t("statusTranscribing");
    if (value.status === "review") return t("statusReview");
    return t("statusExported");
  };

  const rename = async (name: string) => {
    if (!project) return;
    const next = { ...project, name: name.trim() || project.name, updatedAt: Date.now() };
    await putProject(next);
    setProject(next);
    setRenaming(false);
    toast({ title: common("saved"), tone: "success" });
  };

  const remove = async () => {
    await deleteProject(projectId);
    router.push("/projects");
  };

  const duplicate = async () => {
    if (!project) return;
    const copy: Project = {
      ...structuredClone(project),
      id: `${project.id}-copy-${Date.now().toString(36)}`,
      name: `${project.name} (${common("copy")})`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await putProject(copy);
    toast({ title: dashboard("duplicate"), description: copy.name, tone: "success" });
    router.push(`/projects/${copy.id}`);
  };

  const preview = (project?.words ?? []).slice(0, 28);

  return (
    <AppShell>
      <PageFrame>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-fg [&_svg]:size-3.5"
        >
          <ArrowLeft className="rtl:rotate-180" aria-hidden />
          {t("backToLibrary")}
        </Link>

        {status === "loading" ? (
          <div className="mt-6" aria-busy="true">
            <SkeletonRows rows={5} />
          </div>
        ) : status === "missing" || status === "error" ? (
          <div className="mt-6">
            <EmptyState
              icon={<AlertTriangle />}
              title={status === "missing" ? states("notFoundTitle") : states("errorTitle")}
              description={status === "missing" ? states("notFoundBody") : states("errorBody")}
              action={
                <Button asChild variant="primary">
                  <Link href="/projects">{states("notFoundCta")}</Link>
                </Button>
              }
            />
          </div>
        ) : project ? (
          <>
            <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={project.mode === "quran" ? "gold" : "neutral"}>
                    {project.mode === "quran" ? dashboard("filterQuran") : project.mode}
                  </Badge>
                  <Badge tone={project.status === "exported" ? "primary" : "neutral"}>{statusLabel(project)}</Badge>
                  <span className="num-tabular font-mono text-[11px] text-subtle">
                    {project.aspect} · {project.language.toUpperCase()}
                  </span>
                </div>
                <h1 className="mt-2 truncate text-2xl font-semibold text-fg sm:text-3xl">
                  {project.name || dashboard("projectDraft")}
                </h1>
                <p className="mt-1 text-sm text-muted">{t("overviewSubtitle")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" icon={<Pencil />} onClick={() => setRenaming(true)}>
                  {dashboard("rename")}
                </Button>
                <Button variant="secondary" size="sm" icon={<Copy />} onClick={() => void duplicate()}>
                  {dashboard("duplicate")}
                </Button>
                <Button variant="ghost" size="sm" icon={<Trash2 />} onClick={() => setConfirmDelete(true)}>
                  {common("delete")}
                </Button>
                <Button variant="primary" size="sm" icon={<Film />} onClick={() => router.push(`/projects/${projectId}/editor`)}>
                  {dashboard("openEditor")}
                </Button>
              </div>
            </header>

            <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Stat label={t("statsDuration")} value={tc(project.durationSec)} icon={<Clock />} />
              <Stat label={t("statsWords")} value={n(project.words.length)} icon={<Hash />} />
              <Stat label={t("statsClips")} value={n(project.clips.length)} icon={<Layers />} />
              <Stat label={t("statsSuggestions")} value={n(project.suggestions.length)} icon={<Sparkles />} />
              <Stat label={t("statsVerses")} value={n(project.quran.length)} icon={<BookOpen />} />
              <Stat
                label={t("statsExports")}
                value={n(project.lastExportAt ? 1 : 0)}
                hint={project.lastExportAt ? new Date(project.lastExportAt).toLocaleString() : undefined}
                icon={<CalendarClock />}
              />
            </section>

            <section className="mt-8 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
              <Card className="overflow-hidden p-0">
                <div className="border-b border-hairline px-4 py-3">
                  <h2 className="text-sm font-semibold text-fg">{t("mediaTitle")}</h2>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {media.kind === "playing" ? media.name : t("mediaLocalTitle")}
                  </p>
                </div>

                {media.kind === "loading" ? (
                  <div className="aspect-video grid place-items-center bg-ink-deep text-xs text-subtle">
                    {common("loading")}
                  </div>
                ) : media.kind === "playing" ? (
                  <video
                    className="aspect-video w-full bg-ink-deep"
                    src={media.url}
                    poster={media.poster}
                    controls
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <div className="grid aspect-video place-items-center gap-2 bg-ink-deep p-6 text-center">
                    <FileVideo aria-hidden className="size-6 text-subtle" />
                    <p className="text-sm text-fg">{t("mediaMissingTitle")}</p>
                    <p className="max-w-sm text-xs text-muted">{t("mediaMissingBody")}</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Plus />}
                      onClick={() => router.push(`/new?project=${projectId}&mode=${project.mode}`)}
                    >
                      {t("mediaReplace")}
                    </Button>
                  </div>
                )}

                <div className="space-y-2 px-4 py-3">
                  <p className="text-xs text-muted">{t("mediaLocalBody")}</p>
                  {media.kind === "playing" && media.credit ? (
                    <dl className="grid gap-1 text-[11px] text-subtle sm:grid-cols-2">
                      <div className="flex gap-1.5">
                        <dt>{t("attributionLabel")}:</dt>
                        <dd className="text-muted">{media.credit}</dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt>{t("licenseLabel")}:</dt>
                        <dd className="text-muted">{media.license}</dd>
                      </div>
                    </dl>
                  ) : null}
                  {media.kind === "playing" && media.width && media.height ? (
                    <p className="num-tabular font-mono text-[11px] text-subtle">
                      {n(media.width)}×{n(media.height)}
                    </p>
                  ) : null}
                </div>
              </Card>

              <Card>
                <h2 className="text-sm font-semibold text-fg">{t("detailsTitle")}</h2>
                <dl className="mt-3 space-y-2 text-xs">
                  <Row label={t("detailMode")} value={project.mode} />
                  <Row label={t("detailStatus")} value={statusLabel(project)} />
                  <Row label={t("detailLanguage")} value={project.language.toUpperCase()} />
                  <Row label={t("detailAspect")} value={project.aspect} />
                  <Row label={t("detailSource")} value={project.sourceName ?? "—"} />
                  <Row label={t("detailMediaPath")} value={project.hasMedia ? `opfs://dz-media/${projectId}` : "—"} mono />
                  <Row label={t("detailCreated")} value={new Date(project.createdAt).toLocaleString()} />
                  <Row label={t("detailUpdated")} value={new Date(project.updatedAt).toLocaleString()} />
                  <Row label={t("detailSuggestions")} value={n(project.suggestions.length)} />
                  <Row label={t("detailAyahs")} value={n(project.quran.length)} />
                </dl>

                <div className="mt-4 border-t border-hairline pt-3">
                  <h3 className="text-xs font-semibold text-fg">{t("actionsTitle")}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="xs"
                      icon={<Sparkles />}
                      onClick={() => router.push(`/projects/${projectId}/suggestions`)}
                    >
                      {t("openSuggestions")}
                    </Button>
                    <Button
                      variant="secondary"
                      size="xs"
                      icon={<BookOpen />}
                      onClick={() => router.push(`/projects/${projectId}/quran`)}
                    >
                      {t("openQuran")}
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      icon={<Wand2 />}
                      className="border-primary/45 text-primary hover:bg-primary-soft/30"
                      onClick={() => setAlignSurahOpen(true)}
                    >
                      📖 ربط ومحاذاة سورة
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      icon={<ExternalLink />}
                      onClick={() => router.push(`/projects/${projectId}/editor?tab=export`)}
                    >
                      {t("openExport")}
                    </Button>
                  </div>
                </div>
              </Card>
            </section>

            <section className="mt-8">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-fg">{t("transcriptTitle")}</h2>
                  <p className="mt-0.5 text-xs text-muted">{t("transcriptSubtitle")}</p>
                </div>
                <Button variant="ghost" size="xs" icon={<Wand2 />} onClick={() => router.push(`/projects/${projectId}/editor`)}>
                  {editor("title")}
                </Button>
              </div>

              {preview.length === 0 ? (
                <div className="mt-3">
                  <EmptyState
                    icon={<FileVideo />}
                    title={t("transcriptTitle")}
                    description={t("transcriptEmpty")}
                    action={
                      <Button asChild variant="primary" icon={<Plus />}>
                        <Link href={`/new?project=${projectId}&mode=${project.mode}`}>{dashboard("emptyCta")}</Link>
                      </Button>
                    }
                  />
                </div>
              ) : (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {preview.map((word) => (
                    <li
                      key={word.id}
                      dir="auto"
                      className="flex items-center gap-2 rounded-full border border-border bg-raised/40 px-3 py-1.5"
                    >
                      <span className={word.deleted ? "text-sm text-subtle line-through" : "text-sm text-fg"}>
                        {word.text}
                      </span>
                      <span className="num-tabular font-mono text-[10px] text-subtle">{tc(word.start)}</span>
                    </li>
                  ))}
                  {project.words.length > preview.length ? (
                    <li className="num-tabular self-center font-mono text-[11px] text-subtle">
                      {t("transcriptMore", { count: project.words.length - preview.length })}
                    </li>
                  ) : null}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </PageFrame>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent title={dashboard("rename")}>
          {project ? (
            <RenameForm
              initial={project.name}
              label={dashboard("rename")}
              onCancel={() => setRenaming(false)}
              onSubmit={(name) => void rename(name)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent title={dashboard("deleteTitle")} description={dashboard("deleteBody")}>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              {common("cancel")}
            </Button>
            <Button variant="danger" onClick={() => void remove()}>
              {common("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {project ? (
        <AlignSurahDialog
          open={alignSurahOpen}
          onOpenChange={setAlignSurahOpen}
          project={project}
          onSuccess={(updated) => {
            setProject(updated);
            void putProject(updated);
            toast({ title: "تم ربط السورة وتحديث الآيات بنجاح", tone: "success" });
          }}
        />
      ) : null}
    </AppShell>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-hairline pb-1.5">
      <dt className="text-subtle">{label}</dt>
      <dd className={mono ? "num-tabular max-w-[60%] truncate font-mono text-muted" : "max-w-[60%] truncate text-muted"}>
        {value}
      </dd>
    </div>
  );
}

function RenameForm({
  initial,
  label,
  onSubmit,
  onCancel,
}: {
  initial: string;
  label: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const common = useTranslations("common");
  const [value, setValue] = React.useState(initial);

  return (
    <form
      className="mt-4 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(value);
      }}
    >
      <Field label={label} htmlFor="overview-project-name">
        <Input id="overview-project-name" value={value} onChange={(event) => setValue(event.target.value)} autoFocus />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {common("cancel")}
        </Button>
        <Button type="submit" variant="primary">
          {common("save")}
        </Button>
      </div>
    </form>
  );
}
