import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const catalog = JSON.parse(readFileSync("messages/en.json", "utf8"));

function getPath(obj, path) {
  return path.split(".").reduce((acc, k) => (acc && typeof acc === "object" ? acc[k] : undefined), obj);
}

function placeholders(value) {
  if (typeof value !== "string") return [];
  // ICU plurals/widget syntax (`=1 {…}`) contains brace-literals that are cases,
  // not arguments — numeric names are never valid next-intl arguments.
  return [...value.matchAll(/\{(\w+)/g)]
    .map((m) => m[1])
    .filter((name) => name !== "n" && !/^\d+$/.test(name));
}

const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".tmp", ".data"].includes(entry.name)) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(entry.name)) files.push(p);
  }
})("src");

let problems = 0;
for (const file of files) {
  const source = readFileSync(file, "utf8");
  const namespaces = [
    ...source.matchAll(/useTranslations\((?:"([^"]+)")?\)|getTranslations\(\{[^}]*?namespace:\s*"([^"]+)"/g),
  ].map((m) => m[1] ?? m[2] ?? "");

  // t("key") or t("key", { ...args })
  for (const match of source.matchAll(/\bt\(\s*"([\w.]+)"\s*(,\s*\{([^}]*)\})?\s*\)/g)) {
    const key = match[1];
    const argBlock = match[3] ?? "";
    const provided = new Set(
      argBlock
        .split(",")
        .map((pair) => pair.split(":")[0]?.trim())
        .filter(Boolean),
    );

    const candidates = [
      ...namespaces.map((ns) => (ns ? getPath(catalog, `${ns}.${key}`) : getPath(catalog, key))),
    ];
    const merged = new Set(candidates.flatMap(placeholders));
    const missing = [...merged].filter((name) => !provided.has(name));
    if (missing.length) {
      problems += 1;
      const line = source.slice(0, match.index).split("\n").length;
      console.log(
        `${relative(process.cwd(), file)}:${line}  t("${key}") missing {${missing.join(", ")}}  namespaces=[${namespaces.join(", ")}]`,
      );
    }
  }
}
console.log(problems ? `\n${problems} intl call(s) missing arguments` : "\nall intl calls provide their arguments");
