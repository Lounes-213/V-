export type FontSpec = {
  id: string;
  family: string;
  label: string;
  /** Which script the face is designed for — drives the RTL preview sample. */
  script: "arabic" | "latin" | "both";
  weights: number[];
  /** Latin-capable fallback stack used when a caption mixes scripts. */
  stack: string;
  license: string;
  selfHosted: boolean;
  /** Arabic faces need extra leading so diacritics never clip. */
  lineHeightBonus?: number;
  /**
   * Quran-specific faces (mushaf calligraphy) only show in Quran Mode — the
   * normal studio ships social/latin faces, not scripture type.
   */
  quranOnly?: boolean;
};

export const CAPTION_FONTS: FontSpec[] = [
  {
    id: "amiri-quran",
    family: "Amiri Quran",
    label: "Amiri Quran",
    script: "arabic",
    weights: [400],
    stack: '"Amiri Quran", "Cairo", serif',
    license: "SIL Open Font License 1.1",
    selfHosted: true,
    lineHeightBonus: 0.35,
    quranOnly: true,
  },
  {
    id: "cairo",
    family: "Cairo",
    label: "Cairo",
    script: "both",
    weights: [400, 600, 700, 900],
    stack: '"Cairo", sans-serif',
    license: "SIL Open Font License 1.1",
    selfHosted: true,
  },
  {
    id: "inter",
    family: "Inter",
    label: "Inter",
    script: "latin",
    weights: [400, 500, 600, 800],
    stack: '"Inter", sans-serif',
    license: "SIL Open Font License 1.1",
    selfHosted: true,
  },
  {
    id: "geist-mono",
    family: "Geist Mono",
    label: "Geist Mono",
    script: "latin",
    weights: [400, 600],
    stack: '"Geist Mono", monospace',
    license: "SIL Open Font License 1.1",
    selfHosted: true,
  },
];

export function findFont(id: string): FontSpec {
  return CAPTION_FONTS.find((font) => font.id === id) ?? CAPTION_FONTS[1]!;
}

/**
 * Faces visible in the given editor. Quran Mode sees everything; the normal
 * studio never offers mushaf calligraphy or other scripture-only faces.
 */
export function fontsForMode(mode: "quran" | "normal"): FontSpec[] {
  return mode === "quran" ? CAPTION_FONTS : CAPTION_FONTS.filter((font) => !font.quranOnly);
}

/**
 * Registers a user-supplied face with the browser so it renders in the canvas
 * overlay immediately. The blob URL is revoked on unload; persistence is the
 * caller's job (see lib/media-store.ts).
 */
export async function registerUploadedFont(file: File): Promise<FontSpec> {
  const buffer = await file.arrayBuffer();
  const family = `DZ-${file.name.replace(/\.[^.]+$/, "").replace(/[^\w-]/g, "")}`;
  const face = new FontFace(family, buffer, { display: "swap" });
  await face.load();
  document.fonts.add(face);

  return {
    id: `upload:${family}`,
    family,
    label: file.name,
    script: /[\u0600-\u06FF]/.test(family) ? "arabic" : "both",
    weights: [400, 700],
    stack: `"${family}", "Cairo", sans-serif`,
    license: "Uploaded by you — you are responsible for its licence",
    selfHosted: true,
  };
}
