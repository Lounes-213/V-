"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useShallow } from "zustand/react/shallow";
import {
  AlignCenter,
  AlignEndHorizontal,
  AlignStartHorizontal,
  Download,
  FileVideo,
  Image as ImageIcon,
  Lock,
  RotateCcw,
  Type,
} from "lucide-react";
import { useFormat } from "@/components/providers/number-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/card";
import { ColorPicker } from "@/components/ui/color-picker";
import { FontPicker } from "@/components/ui/font-picker";
import { Segmented, SwitchRow } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/field";
import { TabGroup, TabPanel, TabsList } from "@/components/ui/tabs";
import { useEditor, type EditorState, type InspectorTab } from "@/lib/editor-store";
import { resolvePreset, presetsForMode } from "@/lib/presets";
import { fontsForMode } from "@/lib/caption-fonts";
import { resolveTransform } from "@/lib/types";
import type { ExportSettings } from "@/lib/types";
import { cn } from "@/lib/cn";

export function Inspector({ className, onExport }: { className?: string; onExport: () => void }) {
  const t = useTranslations("editor");
  const exportT = useTranslations("exportDialog");
  const { n, tc } = useFormat();

  const { project, exportSettings, tab, selectedClipId, clips } = useEditor(
    useShallow((state: EditorState) => ({
      project: state.project,
      exportSettings: state.exportSettings,
      tab: state.inspectorTab,
      selectedClipId: state.selectedClipId,
      clips: state.project.clips,
    })),
  );

  const setInspectorTab = useEditor((state) => state.setInspectorTab);
  const updatePreset = useEditor((state) => state.updatePreset);
  const setPreset = useEditor((state) => state.setPreset);
  const setRules = useEditor((state) => state.setRules);
  const setBackground = useEditor((state) => state.setBackground);
  const setExport = useEditor((state) => state.setExport);
  const updateClipTransform = useEditor((state) => state.updateClipTransform);

  const preset = resolvePreset(project.presetId, project.captionOverrides);
  const rules = project.rules;
  const background = project.background;

  // Scripture typography and the Tilawa preset exist only in Quran Mode; the
  // normal studio never offers (or keeps) them.
  const isQuran = project.mode === "quran";
  const modePresets = React.useMemo(() => presetsForMode(project.mode), [project.mode]);
  const modeFonts = React.useMemo(() => fontsForMode(isQuran ? "quran" : "normal"), [isQuran]);

  const selectedClip = clips.find((clip) => clip.id === selectedClipId) ?? clips[0];
  const transform = resolveTransform(selectedClip?.transform);

  // Icons appear only once the pane is wide enough to hold them: the strip never
  // widens the pane and the labels never truncate.
  const wideOnly = "hidden @[22rem]:inline-flex";
  const tabs = [
    { value: "video", label: t("tabVideo"), icon: <FileVideo />, iconClassName: wideOnly },
    { value: "style", label: t("tabStyle"), icon: <Type />, iconClassName: wideOnly },
    { value: "captions", label: t("tabCaptions"), iconClassName: wideOnly },
    { value: "background", label: t("tabBackground"), icon: <ImageIcon />, iconClassName: wideOnly },
    { value: "export", label: t("tabExport"), icon: <Download />, iconClassName: wideOnly },
  ];

  return (
    <TabGroup
      value={tab}
      onValueChange={(value) => setInspectorTab(value as InspectorTab)}
      className={cn("min-h-0 flex-1", className)}
    >
      <div className="@container shrink-0 p-2">
        <TabsList items={tabs} label={t("inspector")} className="w-full" compact />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6">
        {/* -------------------------------------------------------- video -- */}
        <TabPanel value="video" className="space-y-5 pt-2">
          {selectedClip ? (
            <>
              <Section
                title={t("transformSection")}
                action={
                  <button
                    type="button"
                    onClick={() =>
                      updateClipTransform(selectedClip.id, {
                        scale: 1,
                        x: 0,
                        y: 0,
                        rotation: 0,
                        flipH: false,
                        flipV: false,
                      })
                    }
                    className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-fg"
                  >
                    <RotateCcw aria-hidden className="size-3" />
                    {t("transformReset")}
                  </button>
                }
              >
                <SliderRow
                  label={t("scale")}
                  value={transform.scale}
                  min={0.2}
                  max={3}
                  step={0.01}
                  onChange={(value) => updateClipTransform(selectedClip.id, { scale: value })}
                  format={(value) => `${Math.round(value * 100)}%`}
                />
                <div className="grid grid-cols-2 gap-3">
                  <SliderRow
                    label={t("positionX")}
                    value={transform.x}
                    min={-200}
                    max={200}
                    onChange={(value) => updateClipTransform(selectedClip.id, { x: value })}
                    format={(value) => `${n(value)}%`}
                  />
                  <SliderRow
                    label={t("positionY")}
                    value={transform.y}
                    min={-200}
                    max={200}
                    onChange={(value) => updateClipTransform(selectedClip.id, { y: value })}
                    format={(value) => `${n(value)}%`}
                  />
                </div>
                <SliderRow
                  label={t("rotation")}
                  value={transform.rotation}
                  min={-180}
                  max={180}
                  onChange={(value) => updateClipTransform(selectedClip.id, { rotation: value })}
                  format={(value) => `${n(value)}°`}
                />
                <div className="flex gap-2">
                  <Chip
                    selected={transform.flipH}
                    onClick={() => updateClipTransform(selectedClip.id, { flipH: !transform.flipH })}
                  >
                    ⇋ {t("flipHorizontal")}
                  </Chip>
                  <Chip
                    selected={transform.flipV}
                    onClick={() => updateClipTransform(selectedClip.id, { flipV: !transform.flipV })}
                  >
                    ⇅ {t("flipVertical")}
                  </Chip>
                </div>
              </Section>
              <p className="text-[11px] leading-relaxed text-subtle">{t("transformHint")}</p>
            </>
          ) : (
            <p className="rounded-md border border-border bg-raised/40 p-3 text-xs text-muted">
              {t("noClipSelected")}
            </p>
          )}
        </TabPanel>

        {/* ------------------------------------------------------- style -- */}
        <TabPanel value="style" className="space-y-5 pt-2">
          <Section title={t("preset")}>
            <div className="flex flex-wrap gap-1.5">
              {modePresets.map((item) => (
                <Chip
                  key={item.id}
                  selected={item.id === project.presetId}
                  onClick={() => setPreset(item.id)}
                >
                  {item.id === "dz-signature"
                    ? t("presetSignature")
                    : item.id === "bold-hook"
                      ? t("presetBold")
                      : item.id === "minimal"
                        ? t("presetMinimal")
                        : item.id === "karaoke"
                          ? t("presetKaraoke")
                          : item.id === "tilawa-gold"
                            ? t("presetTilawa")
                            : item.name}
                </Chip>
              ))}
            </div>
          </Section>

          <Section title={t("font")}>
            <FontPicker
              label={t("font")}
              value={preset.fontId}
              fonts={modeFonts}
              onChange={(id) => updatePreset({ fontId: id })}
            />
          </Section>

          <SliderRow
            label={t("fontSize")}
            value={preset.size}
            min={28}
            max={110}
            onChange={(value) => updatePreset({ size: value })}
            format={(value) => `${n(value)}px`}
          />
          <SliderRow
            label={t("fontWeight")}
            value={preset.weight}
            min={400}
            max={900}
            step={100}
            ticks={4}
            onChange={(value) => updatePreset({ weight: value })}
            format={(value) => String(value)}
          />
          <SliderRow
            label={t("lineHeight")}
            value={preset.lineHeight}
            min={1}
            max={2.4}
            step={0.02}
            onChange={(value) => updatePreset({ lineHeight: value })}
            format={(value) => value.toFixed(2)}
          />
          <SliderRow
            label={t("letterSpacing")}
            value={preset.letterSpacing}
            min={-0.02}
            max={0.12}
            step={0.005}
            onChange={(value) => updatePreset({ letterSpacing: value })}
            format={(value) => `${value.toFixed(3)}em`}
          />

          <Section title={t("textColor")}>
            <ColorPicker
              label={t("textColor")}
              value={preset.color}
              onChange={(value) => updatePreset({ color: value })}
            />
          </Section>
          <Section title={t("highlightColor")}>
            <ColorPicker
              label={t("highlightColor")}
              value={preset.highlightColor}
              onChange={(value) => updatePreset({ highlightColor: value })}
            />
          </Section>

          <SwitchRow
            label={t("activeWord")}
            checked={preset.highlightActiveWord}
            onCheckedChange={(value) => updatePreset({ highlightActiveWord: value })}
          />
          <SliderRow
            label={t("emphasisScale")}
            value={preset.emphasisScale}
            min={0.6}
            max={1.6}
            step={0.02}
            onChange={(value) => updatePreset({ emphasisScale: value })}
            format={(value) => `${value.toFixed(2)}×`}
          />

          <SliderRow
            label={t("outlineWidth")}
            value={preset.outlineWidth}
            min={0}
            max={8}
            onChange={(value) => updatePreset({ outlineWidth: value })}
            format={(value) => `${n(value)}px`}
          />
          <SwitchRow
            label={t("shadow")}
            checked={preset.shadow}
            onCheckedChange={(value) => updatePreset({ shadow: value })}
          />

          <Section title={t("position")}>
            <Segmented
              label={t("position")}
              size="sm"
              value={preset.position}
              onValueChange={(value) => updatePreset({ position: value })}
              options={[
                { value: "top", label: t("positionTop") },
                { value: "middle", label: t("positionMiddle") },
                { value: "bottom", label: t("positionBottom") },
              ]}
            />
          </Section>
          <Section title={t("alignment")}>
            <Segmented
              label={t("alignment")}
              size="sm"
              value={preset.alignment}
              onValueChange={(value) => updatePreset({ alignment: value })}
              options={[
                { value: "start", label: t("alignStart"), icon: <AlignStartHorizontal /> },
                { value: "center", label: t("alignCenter"), icon: <AlignCenter /> },
                { value: "end", label: t("alignEnd"), icon: <AlignEndHorizontal /> },
              ]}
            />
          </Section>
          <SliderRow
            label={t("offsetY")}
            value={preset.offsetY}
            min={-0.15}
            max={0.2}
            step={0.005}
            onChange={(value) => updatePreset({ offsetY: value })}
            format={(value) => `${(value * 100).toFixed(1)}%`}
          />
          <SliderRow
            label={t("padding")}
            value={preset.padding}
            min={0}
            max={40}
            onChange={(value) => updatePreset({ padding: value })}
            format={(value) => `${n(value)}px`}
          />
          <SliderRow
            label={t("radius")}
            value={preset.radius}
            min={0}
            max={40}
            onChange={(value) => updatePreset({ radius: value })}
            format={(value) => `${n(value)}px`}
          />
          <SwitchRow
            label={t("uppercase")}
            checked={preset.uppercase}
            onCheckedChange={(value) => updatePreset({ uppercase: value })}
          />
        </TabPanel>

        {/* ---------------------------------------------------- captions -- */}
        <TabPanel value="captions" className="space-y-5 pt-2">
          <Section title="طريقة عرض الكلمات · Caption Flow">
            <Segmented
              label="طريقة عرض الكلمات"
              size="sm"
              value={rules.displayMode ?? "sentence"}
              onValueChange={(val) => setRules({ displayMode: val as "sentence" | "word" })}
              options={[
                { value: "sentence", label: "جملة بجملة · Sentence" },
                { value: "word", label: "كلمة بكلمة · Word" },
              ]}
            />
          </Section>

          <SliderRow
            label={t("maxWordsPerLine")}
            value={rules.maxWordsPerLine}
            min={1}
            max={8}
            onChange={(value) => setRules({ maxWordsPerLine: value })}
            format={(value) => n(value)}
          />
          <SliderRow
            label={t("maxLines")}
            value={rules.maxLines}
            min={1}
            max={4}
            onChange={(value) => setRules({ maxLines: value })}
            format={(value) => n(value)}
          />
          <SliderRow
            label={t("minDuration")}
            value={rules.minDurationMs}
            min={300}
            max={2000}
            step={50}
            onChange={(value) => setRules({ minDurationMs: value })}
            format={(value) => `${(value / 1000).toFixed(2)}s`}
          />
          <SliderRow
            label={t("maxDuration")}
            value={rules.maxDurationMs}
            min={1500}
            max={8000}
            step={100}
            onChange={(value) => setRules({ maxDurationMs: value })}
            format={(value) => `${(value / 1000).toFixed(1)}s`}
          />
          <SwitchRow
            label={t("autoSplit")}
            checked={rules.autoSplit}
            onCheckedChange={(value) => setRules({ autoSplit: value })}
          />
          <SwitchRow
            label={t("respectPauses")}
            checked={rules.respectPauses}
            onCheckedChange={(value) => setRules({ respectPauses: value })}
          />
          <SwitchRow
            label={t("removeFillers")}
            description={t("removeFillersHint")}
            checked={rules.removeFillers}
            onCheckedChange={(value) => setRules({ removeFillers: value })}
          />
          <SwitchRow
            label={t("punctuation")}
            checked={rules.punctuation}
            onCheckedChange={(value) => setRules({ punctuation: value })}
          />
          <SwitchRow
            label={t("capitalize")}
            checked={rules.capitalize}
            onCheckedChange={(value) => setRules({ capitalize: value })}
          />
        </TabPanel>

        {/* -------------------------------------------------- background -- */}
        <TabPanel value="background" className="space-y-5 pt-2">
          <Section title={t("background")}>
            <Segmented
              label={t("background")}
              size="sm"
              value={background.kind}
              onValueChange={(value) => setBackground({ kind: value })}
              options={[
                { value: "none", label: t("backgroundNone") },
                { value: "blur", label: t("backgroundBlur") },
                { value: "solid", label: t("backgroundSolid") },
                { value: "gradient", label: t("backgroundGradient") },
                { value: "image", label: t("backgroundImage") },
              ]}
            />
          </Section>
          {background.kind === "blur" ? (
            <SliderRow
              label={t("blurAmount")}
              value={background.blur}
              min={0}
              max={48}
              onChange={(value) => setBackground({ blur: value })}
              format={(value) => `${n(value)}px`}
            />
          ) : null}
          {background.kind === "solid" ? (
            <ColorPicker
              label={t("backgroundSolid")}
              value={background.color}
              onChange={(value) => setBackground({ color: value })}
            />
          ) : null}
          {background.kind === "gradient" ? (
            <div className="flex items-center gap-3">
              <ColorPicker
                label={t("backgroundGradient")}
                value={background.gradientFrom}
                presets={false}
                onChange={(value) => setBackground({ gradientFrom: value })}
              />
              <ColorPicker
                label={t("backgroundGradient")}
                value={background.gradientTo}
                presets={false}
                onChange={(value) => setBackground({ gradientTo: value })}
              />
            </div>
          ) : null}
          {background.kind === "image" ? (
            <label className="flex min-h-24 cursor-pointer items-center justify-center rounded-md border border-dashed border-border text-xs text-muted hover:border-primary/50">
              {t("backgroundImageUpload")}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) setBackground({ imageName: file.name, kind: "image" });
                  event.target.value = "";
                }}
              />
            </label>
          ) : null}

          <SwitchRow
            label={t("footerBar")}
            description={t("footerBarDesc")}
            checked={background.footerBar}
            onCheckedChange={(value) => setBackground({ footerBar: value })}
          />
          {background.footerBar ? (
            <SliderRow
              label={t("footerBarHeight")}
              value={background.footerHeight}
              min={10}
              max={40}
              onChange={(value) => setBackground({ footerHeight: value })}
              format={(value) => `${n(value)}%`}
            />
          ) : null}

          <SwitchRow
            label={t("watermark")}
            description={t("watermarkDesc")}
            checked={background.watermark}
            onCheckedChange={(value) => setBackground({ watermark: value })}
          />
          {background.watermark ? (
            <>
              <input
                value={background.watermarkText}
                onChange={(event) => setBackground({ watermarkText: event.target.value })}
                aria-label={t("watermarkText")}
                placeholder="@yourhandle"
                className="force-ltr h-10 w-full rounded-md border border-border bg-ink/60 px-3 text-sm text-fg outline-none placeholder:text-subtle"
              />
              <SliderRow
                label={t("opacity")}
                value={background.watermarkOpacity}
                min={0.2}
                max={1}
                step={0.02}
                onChange={(value) => setBackground({ watermarkOpacity: value })}
                format={(value) => `${Math.round(value * 100)}%`}
              />
            </>
          ) : null}
        </TabPanel>

        {/* ------------------------------------------------------ export -- */}
        <TabPanel value="export" className="space-y-5 pt-2">
          <div className="rounded-md border border-primary/30 bg-primary-soft/40 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Lock aria-hidden className="size-3.5" />
              {exportT("resolutionLocked")}
            </p>
            <p className="mt-1 text-xs text-muted">{exportT("resolutionLockedNote")}</p>
          </div>

          <Section title={exportT("format")}>
            <Select
              value={exportSettings.format}
              onValueChange={(value) => setExport({ format: value as ExportSettings["format"] })}
            >
              <SelectTrigger aria-label={exportT("format")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mp4">{exportT("formatMp4")}</SelectItem>
                <SelectItem value="webm">{exportT("formatWebm")}</SelectItem>
                <SelectItem value="m4a">{exportT("formatAudio")}</SelectItem>
              </SelectContent>
            </Select>
          </Section>

          <Section title={exportT("sidecarLabel")}>
            <Segmented
              label={exportT("sidecarLabel")}
              size="sm"
              value={exportSettings.sidecar}
              onValueChange={(value) => setExport({ sidecar: value })}
              options={[
                { value: "none", label: exportT("sidecarNone") },
                { value: "srt", label: exportT("sidecarSrt") },
                { value: "vtt", label: exportT("sidecarVtt") },
              ]}
            />
          </Section>

          <SwitchRow
            label={exportT("burnCaptions")}
            description={exportT("burnCaptionsDesc")}
            checked={exportSettings.burnCaptions}
            onCheckedChange={(value) => setExport({ burnCaptions: value })}
          />

          <Section title={exportT("quality")}>
            <Segmented
              label={exportT("quality")}
              size="sm"
              value={exportSettings.quality}
              onValueChange={(value) => setExport({ quality: value })}
              options={[
                { value: "high", label: exportT("qualityHigh") },
                { value: "balanced", label: exportT("qualityBalanced") },
                { value: "small", label: exportT("qualitySmall") },
              ]}
            />
          </Section>

          <Section title={exportT("fps")}>
            <Badge tone="neutral">
              <span className="num-tabular font-mono">{exportT("fpsSource")}</span>
            </Badge>
          </Section>

          <Button variant="primary" full size="lg" icon={<Download />} onClick={onExport}>
            {exportT("startExport")}
          </Button>
          <p className="num-tabular text-center text-xs text-subtle">
            {exportT("estimate", { size: `${n(48)} MB`, time: tc(project.durationSec * 0.6) })}
          </p>
        </TabPanel>
      </div>
    </TabGroup>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium tracking-wide text-muted">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  ticks,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  ticks?: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted">{label}</span>
        <span className="num-tabular font-mono text-[11px] text-subtle">
          {format ? format(value) : value}
        </span>
      </div>
      <Slider
        label={label}
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onValueChange={onChange}
        format={format}
        ticks={ticks}
      />
    </div>
  );
}
