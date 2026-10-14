/**
 * Builds `src/lib/quran/fixture.json` from the Quran Foundation Content API v4.
 *
 * The fixture is real canonical text (never hand-typed): it lets the Quran Mode
 * screen work offline, and it is regenerated whenever the API changes.
 *
 * Run with: node scripts/fetch-quran-fixture.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "https://api.quran.com/api/v4";
const CHAPTERS = [1, 108, 112, 113, 114];
const OUT = path.join(process.cwd(), "src", "lib", "quran", "fixture.json");
const DEFAULT_TRANSLATION_ID = process.env.QURAN_TRANSLATION_ID ?? "136";

function cleanText(value) {
  return String(value ?? "")
    .replace(/<sup[^>]*>.*?<\/sup>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function main() {
  const [chaptersRes, translationsRes, recitationsRes] = await Promise.all([
    getJson(`${BASE}/chapters?language=fr`),
    getJson(`${BASE}/resources/translations`),
    getJson(`${BASE}/resources/recitations`),
  ]);

  const french = (translationsRes.translations ?? []).filter(
    (item) => item.language_name?.toLowerCase() === "french",
  );
  const translationId = Number(DEFAULT_TRANSLATION_ID);
  const chosen = french.find((item) => item.id === translationId) ?? french[0];
  if (!chosen) throw new Error("No French translation offered by the API.");

  const chapters = [];
  for (const number of CHAPTERS) {
    const [verses, translation] = await Promise.all([
      getJson(`${BASE}/quran/verses/uthmani?chapter_number=${number}`),
      getJson(`${BASE}/quran/translations/${chosen.id}?chapter_number=${number}`),
    ]);

    const meta = (chaptersRes.chapters ?? []).find((chapter) => chapter.id === number);
    if (!meta) throw new Error(`Chapter ${number} missing from /chapters`);

    // The translations endpoint returns an ordered array without verse keys, so
    // position is the contract: index 0 is ayah 1 within the requested chapter.
    const byIndex = (translation.translations ?? []).map((item) => cleanText(item.text));

    chapters.push({
      number,
      nameSimple: meta.name_simple,
      nameArabic: meta.name_arabic,
      nameTranslated: meta.translated_name?.name ?? meta.name_simple,
      versesCount: meta.verses_count,
      bismillahPre: Boolean(meta.bismillah_pre),
      ayahs: (verses.verses ?? []).map((verse) => ({
        ayah: Number(verse.verse_key.split(":")[1]),
        uthmani: verse.text_uthmani.trim(),
        translation: byIndex[Number(verse.verse_key.split(":")[1]) - 1] ?? "",
      })),
    });
    console.log(`fetched surah ${number} (${meta.name_simple})`);
  }

  const fixture = {
    generatedAt: new Date().toISOString(),
    source: "Quran Foundation Content API v4 (api.quran.com/api/v4)",
    translation: { id: chosen.id, name: chosen.name, language: chosen.language_name },
    recitations: (recitationsRes.recitations ?? []).slice(0, 12).map((item) => ({
      id: item.id,
      reciter: item.reciter_name ?? item.reciter,
      style: item.style ?? null,
    })),
    chapters,
  };

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(fixture, null, 2)}\n`);
  console.log(
    `\nwrote ${path.relative(process.cwd(), OUT)} — ${chapters.length} surahs, translation "${chosen.name}"`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
