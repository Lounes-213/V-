"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ArrowDown,
  ArrowUp,
  Command as CommandIcon,
  CornerDownLeft,
  Eye,
  EyeOff,
  Film,
  Keyboard,
  Redo2,
  Scissors,
  Search,
  Settings,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEditor } from "@/lib/editor-store";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

type Command = {
  id: string;
  group: "edit" | "view" | "navigate";
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  run: () => void;
};

export function CommandPalette() {
  const t = useTranslations("editor");
  const nav = useTranslations("nav");
  const open = useEditor((state) => state.commandPaletteOpen);
  const setOpen = useEditor((state) => state.openCommandPalette);
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [index, setIndex] = React.useState(0);
  const listRef = React.useRef<HTMLUListElement>(null);

  const commands = React.useMemo<Command[]>(() => {
    const store = useEditor.getState();
    return [
      {
        id: "split",
        group: "edit",
        label: t("timelineSplit"),
        icon: <Scissors />,
        shortcut: "S",
        run: () => store.splitAtPlayhead(),
      },
      {
        id: "undo",
        group: "edit",
        label: t("shortcutUndo"),
        icon: <Undo2 />,
        shortcut: "⌃Z",
        run: () => store.undo(),
      },
      {
        id: "redo",
        group: "edit",
        label: t("shortcutRedo"),
        icon: <Redo2 />,
        shortcut: "⇧⌃Z",
        run: () => store.redo(),
      },
      {
        id: "zoom-in",
        group: "view",
        label: t("timelineZoomIn"),
        icon: <ZoomIn />,
        shortcut: "+",
        run: () => store.zoom(1.25),
      },
      {
        id: "zoom-out",
        group: "view",
        label: t("timelineZoomOut"),
        icon: <ZoomOut />,
        shortcut: "−",
        run: () => store.zoom(1 / 1.25),
      },
      {
        id: "safe-areas",
        group: "view",
        label: t("safeAreas"),
        icon: <Eye />,
        run: () => store.setSafeAreas(!store.safeAreas),
      },
      {
        id: "waveform",
        group: "view",
        label: t("timelineWaveform"),
        icon: <EyeOff />,
        run: () => useEditor.setState({ showWaveform: !store.showWaveform }),
      },
      {
        id: "shortcuts",
        group: "view",
        label: t("shortcutsTitle"),
        icon: <Keyboard />,
        shortcut: "?",
        run: () => store.openShortcuts(true),
      },
      {
        id: "nav-dashboard",
        group: "navigate",
        label: nav("dashboard"),
        icon: <Film />,
        run: () => router.push("/dashboard"),
      },
      {
        id: "nav-settings",
        group: "navigate",
        label: nav("settings"),
        icon: <Settings />,
        run: () => router.push("/settings"),
      },
    ];
  }, [t, nav, router]);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter((command) => command.label.toLowerCase().includes(needle));
  }, [commands, query]);

  // Keyboard cursor follows the filter, and closing starts the next session
  // clean. Both are adjusted during render so a frame never shows the previous
  // list selection or a stale query.
  const [lastQuery, setLastQuery] = React.useState(query);
  if (query !== lastQuery) {
    setLastQuery(query);
    setIndex(0);
  }

  const [lastOpen, setLastOpen] = React.useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (!open) setQuery("");
  }

  const groups: { id: Command["group"]; label: string }[] = [
    { id: "edit", label: t("shortcutGroupEdit") },
    { id: "view", label: t("panels") },
    { id: "navigate", label: t("commandNavigate") },
  ];

  const runAt = (position: number) => {
    const command = filtered[position];
    if (!command) return;
    setOpen(false);
    command.run();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIndex((value) => Math.min(filtered.length - 1, value + 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIndex((value) => Math.max(0, value - 1));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      runAt(index);
    }
  };

  React.useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [index]);

  let flat = -1;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[92] bg-scrim backdrop-blur-[3px]" />
        <DialogPrimitive.Content
          onKeyDown={onKeyDown}
          className={cn(
            "fixed left-1/2 z-[93] w-[min(38rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden",
            "rounded-xl border border-border bg-surface shadow-[var(--shadow-pop)]",
            "top-[12vh] phone:top-[6dvh]",
          )}
        >
          <DialogPrimitive.Title className="sr-only">{t("commandPalette")}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {t("commandPlaceholder")}
          </DialogPrimitive.Description>

          <div className="flex items-center gap-3 border-b border-hairline px-4">
            <Search aria-hidden className="size-4 shrink-0 text-subtle" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("commandPlaceholder")}
              aria-label={t("commandPalette")}
              className="h-14 w-full bg-transparent text-base text-fg outline-none placeholder:text-subtle"
            />
            <kbd className="force-ltr hidden shrink-0 rounded-sm border border-border bg-ink px-1.5 py-0.5 font-mono text-[10px] text-subtle sm:block">
              ESC
            </kbd>
          </div>

          <ul ref={listRef} className="max-h-[54dvh] overflow-y-auto overscroll-contain p-2">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted">{t("commandNoResults")}</li>
            ) : null}
            {groups.map((group) => {
              const items = filtered.filter((command) => command.group === group.id);
              if (items.length === 0) return null;
              return (
                <li key={group.id}>
                  <p className="px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-subtle uppercase">
                    {group.label}
                  </p>
                  <ul>
                    {items.map((command) => {
                      flat += 1;
                      const active = flat === index;
                      return (
                        <li key={command.id}>
                          <button
                            type="button"
                            data-index={flat}
                            onPointerEnter={() => setIndex(flat)}
                            onClick={() => runAt(flat)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-md px-3 text-start text-sm transition-colors touch:min-h-12",
                              active ? "bg-primary-soft text-fg" : "text-muted hover:bg-raised hover:text-fg",
                            )}
                            style={{ minHeight: 40 }}
                          >
                            <span aria-hidden className="text-subtle [&_svg]:size-4">
                              {command.icon}
                            </span>
                            <span className="flex-1 truncate">{command.label}</span>
                            {command.shortcut ? (
                              <kbd className="force-ltr shrink-0 font-mono text-[10px] text-subtle">
                                {command.shortcut}
                              </kbd>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-4 border-t border-hairline px-4 py-2 text-[10px] text-subtle">
            <span className="inline-flex items-center gap-1">
              <ArrowUp aria-hidden className="size-3" />
              <ArrowDown aria-hidden className="size-3" />
              {t("commandActions")}
            </span>
            <span className="inline-flex items-center gap-1">
              <CornerDownLeft aria-hidden className="size-3" />
              Enter
            </span>
            <span className="inline-flex items-center gap-1">
              <CommandIcon aria-hidden className="size-3" />K
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
