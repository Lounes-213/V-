import fs from "node:fs/promises";

async function main() {
  const res = await fetch("https://api.quran.com/api/v4/chapters?language=fr");
  const d = await res.json();
  const list = d.chapters.map((c) => ({
    number: c.id,
    nameArabic: c.name_arabic,
    nameSimple: c.name_simple,
    nameTranslated: c.translated_name?.name || c.name_simple,
    ayahCount: c.verses_count,
    revelation: c.revelation_place,
    bismillahPre: Boolean(c.bismillah_pre),
  }));

  const content = `export type SurahMeta = {
  number: number;
  nameArabic: string;
  nameSimple: string;
  nameTranslated: string;
  ayahCount: number;
  revelation: "makkah" | "madinah";
  bismillahPre: boolean;
};

export const ALL_SURAHS: SurahMeta[] = ${JSON.stringify(list, null, 2)};
`;

  await fs.writeFile("src/lib/quran/surahs-data.ts", content, "utf-8");
  console.log("Successfully generated src/lib/quran/surahs-data.ts with", list.length, "surahs");
}

main().catch(console.error);
