"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  BookOpen,
  Clock,
  Copy,
  Film,
  Grid2x2,
  List,
  Mic,
  Pencil,
  Plus,
  Search,
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
import { Field, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { EmptyState } from "@/components/ui/overlays";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useFormat } from "@/components/providers/number-format";
import { listProjects, putProject, deleteProject, storageEstimate } from "@/lib/db";
import { createEmptyProject, createDemoProject, createSecondDemoProject } from "@/lib/project-factory";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/cn";

type Filter = "all" | "draft" | "quran" | "exported";
type Sort = "recent" | "name" | "duration";
type View = "grid" | "list";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const common = useTranslations("common");
  const states = useTranslations("states");
  const { tc, n } = useFormat();
  const router = useRouter();
  const { toast } = useToast();

  const [projects, setProjects] = React.useState<Project[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");
  const [sort, setSort] = React.useState<Sort>("recent");
  const [view, setView] = React.useState<View>("grid");
  const [storage, setStorage] = React.useState<{ usage: number; quota: number } | null>(null);
  const [renaming, setRenaming] = React.useState<Project | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<Project | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const rows = await listProjects();
      setProjects(rows.sort((a, b) => b.updatedAt - a.updatedAt));
      setError(null);
      setStorage(await storageEstimate());
    } catch (caught) {
      setError((caught as Error).message);
      setProjects([]);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const visible = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = (projects ?? []).filter((project) => {
      if (filter === "draft" && project.status !== "draft") return false;
      if (filter === "quran" && project.mode !== "quran") return false;
      if (filter === "exported" && !project.lastExportAt) return false;
      if (!needle) return true;
      return (
        project.name.toLowerCase().includes(needle) ||
        (project.sourceName ?? "").toLowerCase().includes(needle) ||
        project.words.some((word) => word.text.includes(needle))
      );
    });

    const sorted = [...filtered];
    if (sort === "recent") sorted.sort((a, b) => b.updatedAt - a.updatedAt);
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "duration") sorted.sort((a, b) => b.durationSec - a.durationSec);
    return sorted;
  }, [projects, query, filter, sort]);

  const stats = React.useMemo(() => {
    const rows = projects ?? [];
    const minutes = rows.reduce((sum, project) => sum + project.durationSec, 0) / 60;
    const exports = rows.filter((project) => project.lastExportAt).length;
    return { projects: rows.length, minutes, exports };
  }, [projects]);

  const openEditor = (project: Project) => router.push(`/projects/${project.id}/editor`);
  const fmt = (value: number) => n(value);

  const duplicate = async (project: Project) => {
    const copy: Project = {
      ...structuredClone(project),
      id: `${project.id}-copy-${Date.now().toString(36)}`,
      name: `${project.name} (${common("copy")})`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await putProject(copy);
    await load();
    toast({ title: t("duplicate"), tone: "success" });
  };

  const remove = async (project: Project) => {
    setBusy(true);
    try {
      await deleteProject(project.id);
      await load();
      toast({ title: common("delete"), description: project.name, tone: "success" });
    } finally {
      setBusy(false);
      setConfirmDelete(null);
    }
  };

  const rename = async (project: Project, name: string) => {
    await putProject({ ...project, name: name.trim() || project.name, updatedAt: Date.now() });
    await load();
    setRenaming(null);
    toast({ title: common("saved"), tone: "success" });
  };

  const templates = [
    { id: "reel", label: t("templateReel"), desc: t("templateReelDesc"), icon: <Film />, mode: "hybrid" as const },
    { id: "podcast", label: t("templatePodcast"), desc: t("templatePodcastDesc"), icon: <Mic />, mode: "manual" as const },
    { id: "tilawa", label: t("templateTilawa"), desc: t("templateTilawaDesc"), icon: <BookOpen />, mode: "quran" as const },
    { id: "lesson", label: t("templateLesson"), desc: t("templateLessonDesc"), icon: <Sparkles />, mode: "auto" as const },
  ];

  const applyTemplate = async (mode: Project["mode"]) => {
    if (mode === "quran") {
      router.push("/quran-video");
      return;
    }
    const project: Project = { ...createEmptyProject(`new-${Date.now().toString(36)}`), mode };
    await putProject(project);
    router.push(`/new?project=${project.id}&mode=${mode}`);
  };

  const quotaMinutes = 30;
  const usagePercent = Math.min(100, Math.round((stats.minutes / quotaMinutes) * 100));

  return (
    <AppShell>
      <PageFrame>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-fg sm:text-3xl">{t("title")}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">{t("subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="gold" size="md" icon={<BookOpen />}>
              <Link href="/quran-video">استوديو القرآن (9:16)</Link>
            </Button>
            <Button asChild variant="secondary" size="md" icon={<Film />}>
              <Link href="/projects/demo-darja-reel/editor">{common("preview")}</Link>
            </Button>
            <Button asChild variant="primary" size="md" icon={<Plus />}>
              <Link href="/new">{t("newProject")}</Link>
            </Button>
          </div>
        </header>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label={t("statsProjects")} value={fmt(stats.projects)} icon={<Film />} />
          <Stat
            label={t("statsMinutes")}
            value={fmt(Math.round(stats.minutes * 10) / 10)}
            hint={tc(stats.minutes * 60)}
            icon={<Clock />}
          />
          <Stat label={t("statsExports")} value={fmt(stats.exports)} icon={<Sparkles />} />
        </div>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-fg">{t("templates")}</h2>
          <p className="mt-0.5 text-xs text-muted">{t("templatesSubtitle")}</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {templates.map((template) => (
              <li key={template.id}>
                <button
                  type="button"
                  onClick={() => void applyTemplate(template.mode)}
                  className="h-full w-full rounded-xl border border-border bg-raised/40 p-4 text-start transition-colors hover:border-primary/40 hover:bg-primary-soft/20"
                >
                  <span className="grid size-9 place-items-center rounded-lg border border-border bg-ink text-primary [&_svg]:size-4">
                    {template.icon}
                  </span>
                  <span className="mt-3 block text-sm font-medium text-fg">{template.label}</span>
                  <span className="mt-1 block text-xs text-muted">{template.desc}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search aria-hidden className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-subtle" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchLabel")}
              className="ps-9"
            />
          </div>
          <Select value={filter} onValueChange={(value) => setFilter(value as Filter)}>
            <SelectTrigger className="w-36" aria-label={t("filterAll")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterAll")}</SelectItem>
              <SelectItem value="draft">{t("filterDrafts")}</SelectItem>
              <SelectItem value="quran">{t("filterQuran")}</SelectItem>
              <SelectItem value="exported">{t("filterExported")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(value) => setSort(value as Sort)}>
            <SelectTrigger className="w-36" aria-label={t("sortLabel")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">{t("sortRecent")}</SelectItem>
              <SelectItem value="name">{t("sortName")}</SelectItem>
              <SelectItem value="duration">{t("sortDuration")}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <IconButton label={t("viewGrid")} size="sm" selected={view === "grid"} onClick={() => setView("grid")}>
              <Grid2x2 />
            </IconButton>
            <IconButton label={t("viewList")} size="sm" selected={view === "list"} onClick={() => setView("list")}>
              <List />
            </IconButton>
          </div>
        </div>

        {error ? (
          <div className="mt-6">
            <EmptyState
              icon={<Trash2 />}
              title={states("errorTitle")}
              description={states("errorBody")}
              action={
                <Button variant="secondary" onClick={() => void load()}>
                  {states("errorRetry")}
                </Button>
              }
            />
          </div>
        ) : projects === null ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-6">
            {projects.length === 0 ? (
              <EmptyState
                icon={<Film />}
                title={t("emptyTitle")}
                description={t("emptyBody")}
                action={
                  <Button asChild variant="primary" icon={<Plus />}>
                    <Link href="/new">{t("emptyCta")}</Link>
                  </Button>
                }
                secondary={
                  <Button
                    variant="secondary"
                    icon={<Wand2 />}
                    onClick={async () => {
                      const demo = createDemoProject();
                      await putProject(demo);
                      const second = createSecondDemoProject();
                      await putProject(second);
                      await load();
                    }}
                  >
                    {t("emptySecondary")}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<Search />}
                title={t("noResultsTitle")}
                description={t("noResultsBody")}
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery("");
                      setFilter("all");
                    }}
                  >
                    {t("clearFilters")}
                  </Button>
                }
              />
            )}
          </div>
        ) : (
          <ul
            className={cn(
              "mt-4 grid gap-3",
              view === "grid" ? "sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1",
            )}
          >
            {visible.map((project) => (
              <li key={project.id}>
                <Card
                  interactive
                  selected={false}
                  className={cn("h-full", view === "list" && "flex flex-wrap items-center gap-4")}
                >
                  <div className={cn("flex items-start justify-between gap-3", view === "list" && "min-w-0 flex-1")}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge tone={project.mode === "quran" ? "gold" : project.status === "exported" ? "primary" : "neutral"}>
                          {project.mode === "quran" ? t("filterQuran") : project.aspect}
                        </Badge>
                        <span className="num-tabular font-mono text-[11px] text-subtle">{tc(project.durationSec)}</span>
                      </div>
                      <h3 className="mt-2 truncate text-sm font-medium text-fg">{project.name || t("projectDraft")}</h3>
                      <p className="num-tabular mt-1 text-xs text-muted">
                        {fmt(project.words.length)} · {fmt(project.clips.length)} · {new Date(project.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <IconButton label={common("open")} size="sm" onClick={() => openEditor(project)}>
                        <Film />
                      </IconButton>
                      <IconButton label={t("rename")} size="sm" onClick={() => setRenaming(project)}>
                        <Pencil />
                      </IconButton>
                      <IconButton label={t("duplicate")} size="sm" onClick={() => void duplicate(project)}>
                        <Copy />
                      </IconButton>
                      <IconButton label={common("delete")} size="sm" onClick={() => setConfirmDelete(project)}>
                        <Trash2 />
                      </IconButton>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Button variant="secondary" size="xs" onClick={() => openEditor(project)}>
                      {t("openEditor")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => router.push(`/projects/${project.id}/suggestions`)}
                    >
                      {t("recent")}
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <section className="mt-10 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface/60 p-4">
            {/* The heading is the sentence, so the numbers go in it: without them
                next-intl throws a FORMATTING_ERROR and the card renders empty. */}
            <h2 className="text-sm font-semibold text-fg">
              {t("quotaLabel", {
                used: fmt(Math.round(stats.minutes * 10) / 10),
                total: fmt(quotaMinutes),
              })}
            </h2>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink">
              <div className="h-full rounded-full bg-primary" style={{ width: `${usagePercent}%` }} />
            </div>
            <p className="num-tabular mt-2 text-xs text-muted">
              {fmt(Math.round(stats.minutes * 10) / 10)} / {fmt(quotaMinutes)}
            </p>
            <Button asChild variant="gold" size="sm" className="mt-3">
              <Link href="/billing">{t("quotaUpgrade")}</Link>
            </Button>
          </div>
          <div className="rounded-xl border border-border bg-surface/60 p-4">
            <h2 className="text-sm font-semibold text-fg">{t("storageNote")}</h2>
            <p className="num-tabular mt-2 text-xs text-muted">
              {storage
                ? `${(storage.usage / 1024 / 1024).toFixed(1)} / ${(storage.quota / 1024 / 1024).toFixed(0)} MB`
                : "—"}
            </p>
          </div>
        </section>
      </PageFrame>

      <Dialog open={renaming !== null} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent title={t("rename")}>
          {renaming ? (
            <RenameForm
              initial={renaming.name}
              label={t("rename")}
              onCancel={() => setRenaming(null)}
              onSubmit={(name) => void rename(renaming, name)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent title={t("deleteTitle")} description={t("deleteBody")}>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              {common("cancel")}
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => confirmDelete && void remove(confirmDelete)}
            >
              {busy ? common("loading") : common("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
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
      <Field label={label} htmlFor="project-name">
        <Input id="project-name" value={value} onChange={(event) => setValue(event.target.value)} autoFocus />
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
