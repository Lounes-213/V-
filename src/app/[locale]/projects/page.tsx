"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  BookOpen,
  Clock,
  Film,
  Grid2x2,
  List,
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
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { EmptyState } from "@/components/ui/overlays";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useFormat } from "@/components/providers/number-format";
import { deleteProject, listProjects, putProject } from "@/lib/db";
import { createDemoProject, createSecondDemoProject } from "@/lib/project-factory";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/cn";

type Filter = "all" | "draft" | "quran" | "exported";
type Sort = "recent" | "name" | "duration";
type View = "grid" | "list";

/**
 * The library is the honest index of what exists on this device: every row is a
 * real IndexedDB record, and the numbers beside it come from that record's own
 * transcript — nothing is seeded for looks.
 */
export default function ProjectsLibraryPage() {
  const t = useTranslations("projects");
  const dashboard = useTranslations("dashboard");
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
  const [confirmDelete, setConfirmDelete] = React.useState<Project | null>(null);

  const load = React.useCallback(async () => {
    try {
      const rows = await listProjects();
      setProjects(rows.sort((a, b) => b.updatedAt - a.updatedAt));
      setError(null);
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

  const totals = React.useMemo(() => {
    const rows = projects ?? [];
    return {
      count: rows.length,
      seconds: rows.reduce((sum, project) => sum + project.durationSec, 0),
      words: rows.reduce((sum, project) => sum + project.words.length, 0),
    };
  }, [projects]);

  const statusLabel = (project: Project) => {
    if (project.status === "draft") return t("statusDraft");
    if (project.status === "transcribing") return t("statusTranscribing");
    if (project.status === "review") return t("statusReview");
    return t("statusExported");
  };

  const remove = async (project: Project) => {
    await deleteProject(project.id);
    await load();
    setConfirmDelete(null);
    toast({ title: common("delete"), description: project.name, tone: "success" });
  };

  const seedDemo = async () => {
    await putProject(createDemoProject());
    await putProject(createSecondDemoProject());
    await load();
  };

  return (
    <AppShell>
      <PageFrame>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-fg sm:text-3xl">{t("title")}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">{t("subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary" size="md" icon={<Film />}>
              <Link href="/dashboard">{dashboard("title")}</Link>
            </Button>
            <Button asChild variant="primary" size="md" icon={<Plus />}>
              <Link href="/new">{dashboard("newProject")}</Link>
            </Button>
          </div>
        </header>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label={dashboard("statsProjects")} value={n(totals.count)} icon={<Film />} />
          <Stat
            label={t("totalDuration")}
            value={tc(totals.seconds)}
            hint={`${n(totals.words)} ${common("words")}`}
            icon={<Clock />}
          />
          <Stat label={t("statsSuggestions")} value={n((projects ?? []).reduce((sum, p) => sum + p.suggestions.length, 0))} icon={<Sparkles />} />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search aria-hidden className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-subtle" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={dashboard("searchPlaceholder")}
              aria-label={dashboard("searchLabel")}
              className="ps-9"
            />
          </div>
          <Select value={filter} onValueChange={(value) => setFilter(value as Filter)}>
            <SelectTrigger className="w-36" aria-label={dashboard("filterAll")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{dashboard("filterAll")}</SelectItem>
              <SelectItem value="draft">{dashboard("filterDrafts")}</SelectItem>
              <SelectItem value="quran">{dashboard("filterQuran")}</SelectItem>
              <SelectItem value="exported">{dashboard("filterExported")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(value) => setSort(value as Sort)}>
            <SelectTrigger className="w-36" aria-label={dashboard("sortLabel")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">{dashboard("sortRecent")}</SelectItem>
              <SelectItem value="name">{dashboard("sortName")}</SelectItem>
              <SelectItem value="duration">{dashboard("sortDuration")}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <IconButton label={dashboard("viewGrid")} size="sm" selected={view === "grid"} onClick={() => setView("grid")}>
              <Grid2x2 />
            </IconButton>
            <IconButton label={dashboard("viewList")} size="sm" selected={view === "list"} onClick={() => setView("list")}>
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
                title={dashboard("emptyTitle")}
                description={dashboard("emptyBody")}
                action={
                  <Button asChild variant="primary" icon={<Plus />}>
                    <Link href="/new">{dashboard("emptyCta")}</Link>
                  </Button>
                }
                secondary={
                  <Button variant="secondary" icon={<Wand2 />} onClick={() => void seedDemo()}>
                    {dashboard("emptySecondary")}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<Search />}
                title={dashboard("noResultsTitle")}
                description={dashboard("noResultsBody")}
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery("");
                      setFilter("all");
                    }}
                  >
                    {dashboard("clearFilters")}
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
                <Card interactive className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={project.mode === "quran" ? "gold" : project.status === "exported" ? "primary" : "neutral"}>
                          {project.mode === "quran" ? dashboard("filterQuran") : statusLabel(project)}
                        </Badge>
                        <span className="num-tabular font-mono text-[11px] text-subtle">{tc(project.durationSec)}</span>
                      </div>
                      <h2 className="mt-2 truncate text-sm font-medium text-fg">{project.name || dashboard("projectDraft")}</h2>
                      <p className="num-tabular mt-1 text-xs text-muted">
                        {n(project.words.length)} {common("words")} · {n(project.clips.length)} {common("clips")} ·{" "}
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <IconButton label={common("delete")} size="sm" onClick={() => setConfirmDelete(project)}>
                      <Trash2 />
                    </IconButton>
                  </div>

                  <div className="mt-4 flex flex-1 flex-wrap items-end gap-2">
                    <Button variant="primary" size="xs" icon={<Film />} onClick={() => router.push(`/projects/${project.id}/editor`)}>
                      {dashboard("openEditor")}
                    </Button>
                    <Button variant="secondary" size="xs" icon={<Pencil />} onClick={() => router.push(`/projects/${project.id}`)}>
                      {t("openDetail")}
                    </Button>
                    {project.mode === "quran" ? (
                      <Button variant="ghost" size="xs" icon={<BookOpen />} onClick={() => router.push(`/projects/${project.id}/quran`)}>
                        {t("openQuran")}
                      </Button>
                    ) : (
                      <Button variant="ghost" size="xs" icon={<Sparkles />} onClick={() => router.push(`/projects/${project.id}/suggestions`)}>
                        {t("openSuggestions")}
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </PageFrame>

      <Dialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent title={dashboard("deleteTitle")} description={dashboard("deleteBody")}>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              {common("cancel")}
            </Button>
            <Button variant="danger" onClick={() => confirmDelete && void remove(confirmDelete)}>
              {common("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
