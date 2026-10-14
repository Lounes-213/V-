"use client";

import { useTranslations } from "next-intl";
import { useEditor } from "@/lib/editor-store";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type Row = { keys: string[]; labelKey: string };

const GROUPS: { id: string; labelKey: string; rows: Row[] }[] = [
  {
    id: "playback",
    labelKey: "shortcutGroupPlayback",
    rows: [
      { keys: ["Space"], labelKey: "shortcutPlayPause" },
      { keys: ["J"], labelKey: "shortcutSpeedBack" },
      { keys: ["K"], labelKey: "shortcutPlayPause" },
      { keys: ["L"], labelKey: "shortcutSpeedForward" },
      { keys: [","], labelKey: "shortcutPrevFrame" },
      { keys: ["."], labelKey: "shortcutNextFrame" },
      { keys: ["←"], labelKey: "shortcutPrevWord" },
      { keys: ["→"], labelKey: "shortcutNextWord" },
    ],
  },
  {
    id: "edit",
    labelKey: "shortcutGroupEdit",
    rows: [
      { keys: ["I"], labelKey: "shortcutMarkIn" },
      { keys: ["O"], labelKey: "shortcutMarkOut" },
      { keys: ["S"], labelKey: "shortcutSplit" },
      { keys: ["Del"], labelKey: "shortcutDelete" },
      { keys: ["⌃", "Z"], labelKey: "shortcutUndo" },
      { keys: ["⇧", "⌃", "Z"], labelKey: "shortcutRedo" },
      { keys: ["⌃", "S"], labelKey: "shortcutSave" },
    ],
  },
  {
    id: "nav",
    labelKey: "shortcutGroupNav",
    rows: [
      { keys: ["⌃", "K"], labelKey: "shortcutCommand" },
      { keys: ["?"], labelKey: "shortcutShortcuts" },
      { keys: ["+", "−"], labelKey: "shortcutZoom" },
      { keys: ["1", "2", "3"], labelKey: "aspectSwitcher" },
      { keys: ["Esc"], labelKey: "shortcutEscape" },
      { keys: ["Home", "End"], labelKey: "timelinePlayhead" },
    ],
  },
];

export function ShortcutSheet() {
  const t = useTranslations("editor");
  const open = useEditor((state) => state.shortcutsOpen);
  const setOpen = useEditor((state) => state.openShortcuts);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent title={t("shortcutsTitle")} description={t("shortcutsSubtitle")} size="lg">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {GROUPS.map((group) => (
            <section key={group.id} aria-label={t(group.labelKey as "shortcutGroupEdit")}>
              <h3 className="text-xs font-semibold tracking-wider text-primary uppercase">
                {t(group.labelKey as "shortcutGroupEdit")}
              </h3>
              <dl className="mt-3 space-y-2">
                {group.rows.map((row) => (
                  <div
                    key={row.labelKey + row.keys.join()}
                    className="flex items-center justify-between gap-3 border-b border-hairline pb-1.5 last:border-0"
                  >
                    <dt className="text-xs text-muted">{t(row.labelKey as "shortcutPlayPause")}</dt>
                    <dd className="flex shrink-0 items-center gap-1">
                      {row.keys.map((key) => (
                        <kbd
                          key={key}
                          className="force-ltr min-w-6 rounded-sm border border-border bg-ink px-1.5 py-0.5 text-center font-mono text-[10px] text-fg"
                        >
                          {key}
                        </kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
        <p className="mt-6 flex items-center gap-2 text-xs text-subtle">
          <Badge tone="primary">AR</Badge>
          {t("shortcutsSubtitle")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
