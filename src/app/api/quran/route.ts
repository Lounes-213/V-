import { NextResponse } from "next/server";
import { ALL_SURAHS } from "@/lib/quran/surahs-data";
import { lookupAyah } from "@/lib/quran/canonical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RECITERS = [
  { id: 7, name: "مشاري راشد العفاسي (Mishary Rashid Alafasy)", folder: "Alafasy_128kbps" },
  { id: 1, name: "عبد الباسط عبد الصمد - مرتل (AbdulBaset Murattal)", folder: "Abdul_Basit_Murattal_192kbps" },
  { id: 2, name: "محمود خليل الحصري (Mahmoud Khalil Al-Husary)", folder: "Husary_128kbps" },
  { id: 3, name: "ماهر المعيقلي (Maher Al-Muaiqly)", folder: "MaherAlMuaiqly128kbps" },
  { id: 4, name: "سعد الغامدي (Saad Al-Ghamdi)", folder: "Ghamadi_40kbps" },
  { id: 5, name: "أبو بكر الشاطري (Abu Bakr Al-Shatri)", folder: "Abu_Bakr_Ash-Shaatree_128kbps" },
];

function cleanTranslation(text: string): string {
  return text
    .replace(/<sup[^>]*>.*?<\/sup>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getAudioUrl(surah: number, ayah: number, reciterId = 7): string {
  const reciter = RECITERS.find((r) => r.id === reciterId) ?? RECITERS[0]!;
  const s = String(surah).padStart(3, "0");
  const a = String(ayah).padStart(3, "0");
  return `https://everyayah.com/data/${reciter.folder}/${s}${a}.mp3`;
}

// In-memory cache for verses and word segments to keep responses ultra-fast
const verseCache = new Map<string, { uthmani: string; translation: string }>();
const segmentsCache = new Map<string, any>();
const surahCache = new Map<string, {
  surah: number;
  surahNameArabic: string;
  surahNameSimple: string;
  surahNameTranslated: string;
  ayahCount: number;
  verses: {
    id: string;
    surah: number;
    ayah: number;
    uthmani: string;
    translation: string;
    audioUrl: string;
  }[];
}>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "surahs";

  if (action === "surahs") {
    return NextResponse.json({ surahs: ALL_SURAHS }, { headers: { "cache-control": "public, max-age=86400" } });
  }

  if (action === "reciters") {
    return NextResponse.json({ reciters: RECITERS });
  }

  if (action === "reciter_segments") {
    const surah = Number(searchParams.get("surah"));
    const from = Math.max(1, Number(searchParams.get("from") || "1"));
    const reciterId = Number(searchParams.get("reciter") || "7");

    if (!surah || surah < 1 || surah > 114) {
      return NextResponse.json({ error: "Invalid surah number." }, { status: 400 });
    }

    const surahMeta = ALL_SURAHS.find((s) => s.number === surah);
    if (!surahMeta) {
      return NextResponse.json({ error: "Surah not found." }, { status: 404 });
    }

    const to = Math.min(surahMeta.ayahCount, Math.max(from, Number(searchParams.get("to") || surahMeta.ayahCount)));

    // Map internal reciter ID to Quran.com recitation resource ID
    const qdcReciterMap: Record<number, number> = {
      7: 7, // Mishary Rashid Alafasy
      1: 2, // AbdulBaset Murattal
      2: 6, // Mahmoud Khalil Al-Husary
      3: 3, // Abdur-Rahman as-Sudais
      4: 4, // Abu Bakr al-Shatri
      5: 5, // Hani ar-Rifai
    };

    const qdcId = qdcReciterMap[reciterId] || 7;
    const cacheKey = `seg:${qdcId}:${surah}`;

    try {
      let data = segmentsCache.get(cacheKey);
      if (!data) {
        const res = await fetch(
          `https://api.quran.com/api/v4/chapter_recitations/${qdcId}/${surah}?segments=true`,
          {
            headers: { accept: "application/json" },
            signal: AbortSignal.timeout(9000),
          },
        );
        if (res.ok) {
          const json = await res.json();
          data = json.audio_file;
          if (data) {
            segmentsCache.set(cacheKey, data);
          }
        }
      }

      if (data && data.timestamps) {
        const filteredTimestamps = (data.timestamps as any[])
          .filter((t) => {
            const ayahNum = Number(t.verse_key?.split(":")[1]);
            return ayahNum >= from && ayahNum <= to;
          })
          .map((t) => ({
            verseKey: t.verse_key,
            ayah: Number(t.verse_key?.split(":")[1]),
            timestampFrom: t.timestamp_from,
            timestampTo: t.timestamp_to,
            duration: t.duration,
            segments: t.segments, // [[word_idx, start_ms, end_ms], ...]
          }));

        return NextResponse.json({
          surah,
          from,
          to,
          reciterId,
          audioUrl: data.audio_url,
          timestamps: filteredTimestamps,
        });
      }
    } catch (err) {
      console.warn("[api/quran] reciter_segments fetch warning:", err);
    }

    return NextResponse.json({ surah, from, to, reciterId, timestamps: [] });
  }

  if (action === "surah_verses") {
    const surah = Number(searchParams.get("surah"));
    const from = Math.max(1, Number(searchParams.get("from") || "1"));
    const reciterId = Number(searchParams.get("reciter") || "7");
    const translationId = Number(searchParams.get("translation") || "136");
    const riwayah = searchParams.get("riwayah") === "warsh" ? "warsh" : "hafs";

    if (!surah || surah < 1 || surah > 114) {
      return NextResponse.json({ error: "Invalid surah number." }, { status: 400 });
    }

    const surahMeta = ALL_SURAHS.find((s) => s.number === surah);
    if (!surahMeta) {
      return NextResponse.json({ error: "Surah not found." }, { status: 404 });
    }

    const to = Math.min(surahMeta.ayahCount, Math.max(from, Number(searchParams.get("to") || surahMeta.ayahCount)));
    const cacheKey = `${surah}:${translationId}:${riwayah}`;

    if (surahCache.has(cacheKey)) {
      const cached = surahCache.get(cacheKey)!;
      const filtered = cached.verses.filter((v) => v.ayah >= from && v.ayah <= to);
      return NextResponse.json({
        ...cached,
        riwayah,
        verses: filtered.map((v) => ({ ...v, audioUrl: getAudioUrl(surah, v.ayah, reciterId) })),
      });
    }

    // Authentic Warsh edition (King Fahd Complex verified orthography with no hamzahs on youminoon)
    let chapterVerses: { ayah: number; uthmani: string; translation: string }[] = [];
    if (riwayah === "warsh") {
      try {
        const [warshRes, transRes] = await Promise.all([
          fetch(
            `https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/ara-quranwarsh/${surah}.json`,
            { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) }
          ).catch(() =>
            fetch(
              `https://raw.githubusercontent.com/fawazahmed0/quran-api/1/editions/ara-quranwarsh/${surah}.json`,
              { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) }
            )
          ),
          fetch(
            `https://api.quran.com/api/v4/verses/by_chapter/${surah}?words=false&translations=${translationId}&per_page=300`,
            { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) }
          ).catch(() => null),
        ]);

        if (warshRes && warshRes.ok) {
          const warshJson = (await warshRes.json()) as { chapter?: { verse: number; text: string }[] };
          const transMap = new Map<number, string>();
          if (transRes && transRes.ok) {
            const transJson = (await transRes.json()) as {
              verses?: { verse_key?: string; translations?: { text?: string }[] }[];
            };
            for (const v of transJson?.verses || []) {
              const a = Number(v.verse_key?.split(":")[1]);
              if (a && v.translations?.[0]?.text) {
                transMap.set(a, cleanTranslation(v.translations[0].text));
              }
            }
          }

          for (const item of warshJson.chapter || []) {
            chapterVerses.push({
              ayah: item.verse,
              uthmani: item.text.trim(),
              translation: transMap.get(item.verse) || "",
            });
          }
        }
      } catch (err) {
        console.warn("[api/quran] Warsh authentic fetch error:", err);
      }
    }

    // Try fetching whole chapter from Quran.com Content API v4 if not already loaded
    if (chapterVerses.length === 0) {
      try {
        const [textRes, transRes] = await Promise.all([
          fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surah}`, {
            headers: { accept: "application/json" },
            signal: AbortSignal.timeout(8000),
          }),
          fetch(
            `https://api.quran.com/api/v4/verses/by_chapter/${surah}?words=false&translations=${translationId}&per_page=300`,
            {
              headers: { accept: "application/json" },
              signal: AbortSignal.timeout(8000),
            },
          ),
        ]);

        if (textRes.ok) {
          const textJson = (await textRes.json()) as { verses?: { verse_key?: string; text_uthmani?: string }[] };
          const transJson = transRes.ok
            ? ((await transRes.json()) as {
                verses?: { verse_key?: string; translations?: { text?: string }[] }[];
              })
            : undefined;

          const transMap = new Map<string, string>();
          for (const v of transJson?.verses || []) {
            if (v.verse_key && v.translations?.[0]?.text) {
              transMap.set(v.verse_key, cleanTranslation(v.translations[0].text));
            }
          }

          for (const v of textJson.verses || []) {
            const key = v.verse_key || "";
            const [s, a] = key.split(":").map(Number);
            if (s === surah && a) {
              chapterVerses.push({
                ayah: a,
                uthmani: v.text_uthmani?.trim() || "",
                translation: transMap.get(key) || "",
              });
            }
          }
        }
      } catch {
        // Fallback to AlQuran Cloud API for whole surah (Hafs or Warsh)
        try {
          const edition = riwayah === "warsh" ? "ar.warsh,fr.montada" : "quran-uthmani,fr.montada";
          const fallbackRes = await fetch(
            `https://api.alquran.cloud/v1/surah/${surah}/editions/${edition}`,
            { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) },
          );
          if (fallbackRes.ok) {
            const fbJson = (await fallbackRes.json()) as {
              data?: [{ ayahs?: { numberInSurah: number; text: string }[] }, { ayahs?: { numberInSurah: number; text: string }[] }];
            };
            const arabicAyahs = fbJson.data?.[0]?.ayahs || [];
            const frenchAyahs = fbJson.data?.[1]?.ayahs || [];
            chapterVerses = arabicAyahs.map((ar, i) => ({
              ayah: ar.numberInSurah,
              uthmani: ar.text,
              translation: frenchAyahs[i]?.text || "",
            }));
          }
        } catch {
          /* fallback failed */
        }
      }
    }

    // If API failed, populate from local fixture where available
    if (chapterVerses.length === 0) {
      for (let a = 1; a <= surahMeta.ayahCount; a += 1) {
        const local = lookupAyah(surah, a);
        if (local) {
          chapterVerses.push({
            ayah: a,
            uthmani: local.uthmani,
            translation: local.translation,
          });
        }
      }
    }

    const fullResult = {
      surah,
      surahNameArabic: surahMeta.nameArabic,
      surahNameSimple: surahMeta.nameSimple,
      surahNameTranslated: surahMeta.nameTranslated,
      ayahCount: surahMeta.ayahCount,
      verses: chapterVerses.map((v) => ({
        id: `${surah}:${v.ayah}`,
        surah,
        ayah: v.ayah,
        uthmani: v.uthmani,
        translation: v.translation,
        audioUrl: getAudioUrl(surah, v.ayah, reciterId),
      })),
    };

    if (fullResult.verses.length > 0) {
      surahCache.set(cacheKey, fullResult);
      // Also register into single verse cache
      for (const v of fullResult.verses) {
        verseCache.set(`${surah}:${v.ayah}:${translationId}`, { uthmani: v.uthmani, translation: v.translation });
      }
    }

    const filtered = fullResult.verses.filter((v) => v.ayah >= from && v.ayah <= to);
    return NextResponse.json({
      ...fullResult,
      verses: filtered,
    });
  }

  if (action === "verse") {
    const surah = Number(searchParams.get("surah"));
    const ayah = Number(searchParams.get("ayah"));
    const reciterId = Number(searchParams.get("reciter") || "7");
    const translationId = Number(searchParams.get("translation") || "136");

    if (!surah || !ayah || surah < 1 || surah > 114) {
      return NextResponse.json({ error: "Invalid surah or ayah number." }, { status: 400 });
    }

    const surahMeta = ALL_SURAHS.find((s) => s.number === surah);
    if (!surahMeta || ayah > surahMeta.ayahCount) {
      return NextResponse.json({ error: `Ayah ${ayah} does not exist in Surah ${surah}.` }, { status: 400 });
    }

    const cacheKey = `${surah}:${ayah}:${translationId}`;
    let uthmani = "";
    let translation = "";

    // 1. Check local fixture first
    const fixtureAyah = lookupAyah(surah, ayah);
    if (fixtureAyah) {
      uthmani = fixtureAyah.uthmani;
      translation = fixtureAyah.translation;
    } else if (verseCache.has(cacheKey)) {
      const cached = verseCache.get(cacheKey)!;
      uthmani = cached.uthmani;
      translation = cached.translation;
    } else {
      // 2. Fetch live from Quran.com Content API v4
      try {
        const [textRes, transRes] = await Promise.all([
          fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?verse_key=${surah}:${ayah}`, {
            headers: { accept: "application/json" },
            signal: AbortSignal.timeout(6000),
          }),
          fetch(`https://api.quran.com/api/v4/verses/by_key/${surah}:${ayah}?words=false&translations=${translationId}`, {
            headers: { accept: "application/json" },
            signal: AbortSignal.timeout(6000),
          }),
        ]);

        if (textRes.ok) {
          const textJson = (await textRes.json()) as { verses?: { text_uthmani?: string }[] };
          uthmani = textJson.verses?.[0]?.text_uthmani?.trim() || "";
        }

        if (transRes.ok) {
          const transJson = (await transRes.json()) as { verse?: { translations?: { text?: string }[] } };
          const rawTrans = transJson.verse?.translations?.[0]?.text || "";
          translation = cleanTranslation(rawTrans);
        }

        if (uthmani) {
          verseCache.set(cacheKey, { uthmani, translation });
        }
      } catch (err) {
        console.warn(`[api/quran] Live fetch for ${surah}:${ayah} failed, attempting AlQuran Cloud fallback:`, (err as Error).message);
        // Fallback to AlQuran.cloud API
        try {
          const fallbackRes = await fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/editions/quran-uthmani,fr.montada`, {
            headers: { accept: "application/json" },
            signal: AbortSignal.timeout(5000),
          });
          if (fallbackRes.ok) {
            const fbJson = (await fallbackRes.json()) as { data?: { text?: string }[] };
            if (fbJson.data?.[0]?.text) {
              uthmani = fbJson.data[0].text;
              translation = fbJson.data[1]?.text || "";
              verseCache.set(cacheKey, { uthmani, translation });
            }
          }
        } catch {
          /* Fallback exhausted */
        }
      }
    }

    if (!uthmani) {
      return NextResponse.json({ error: "Verse could not be retrieved." }, { status: 502 });
    }

    const audioUrl = getAudioUrl(surah, ayah, reciterId);

    return NextResponse.json({
      id: `${surah}:${ayah}`,
      surah,
      ayah,
      surahNameArabic: surahMeta.nameArabic,
      surahNameSimple: surahMeta.nameSimple,
      surahNameTranslated: surahMeta.nameTranslated,
      ayahCount: surahMeta.ayahCount,
      uthmani,
      translation,
      audioUrl,
      revelation: surahMeta.revelation,
    });
  }

  if (action === "search") {
    const query = searchParams.get("q")?.trim() || "";
    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    try {
      const searchRes = await fetch(`https://api.quran.com/api/v4/search?q=${encodeURIComponent(query)}&size=15&language=ar`, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });

      if (!searchRes.ok) {
        return NextResponse.json({ results: [] });
      }

      const searchJson = (await searchRes.json()) as {
        search?: {
          results?: {
            verse_key: string;
            text: string;
            translations?: { text: string }[];
          }[];
        };
      };

      const results = (searchJson.search?.results || []).map((item) => {
        const [s, a] = item.verse_key.split(":").map(Number);
        const surahMeta = ALL_SURAHS.find((meta) => meta.number === s);
        return {
          id: item.verse_key,
          surah: s || 1,
          ayah: a || 1,
          surahNameArabic: surahMeta?.nameArabic || "",
          surahNameSimple: surahMeta?.nameSimple || "",
          uthmani: item.text.replace(/<[^>]+>/g, "").trim(),
          translation: item.translations?.[0]?.text ? cleanTranslation(item.translations[0].text) : "",
          audioUrl: getAudioUrl(s || 1, a || 1),
        };
      });

      return NextResponse.json({ results });
    } catch (err) {
      console.warn("[api/quran] Search failed:", (err as Error).message);
      return NextResponse.json({ results: [] });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
