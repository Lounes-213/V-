#!/usr/bin/env node
/**
 * Guards the translation catalogues.
 *
 *  1. every `t("some.key")` used with a static key in src/ must resolve in ALL locales.
 *     Keys are resolved against the namespace declared in the same file, e.g.
 *       `useTranslations("editor")` + `t("play")`  ->  editor.play
 *     Files without a namespace declaration resolve at the catalogue root.
 *  2. every locale must expose exactly the same key set as the reference locale (en)
 *  3. keys present in a catalogue but never used are reported (advisory; --strict-unused fails)
 *
 * Usage: node scripts/check-i18n.mjs [--strict-unused]
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SRC = join(ROOT, "src");
const MESSAGES = join(ROOT, "messages");
const LOCALES = ["en", "ar", "fr"];
const REFERENCE = "en";
const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "coverage"]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

function flatten(value, prefix = "", out = new Map()) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }
  } else {
    out.set(prefix, value);
  }
  return out;
}

const catalogues = new Map(
  LOCALES.map((locale) => [
    locale,
    flatten(JSON.parse(readFileSync(join(MESSAGES, `${locale}.json`), "utf8"))),
  ]),
);
const reference = catalogues.get(REFERENCE);

/** `const editor = useTranslations("editor")` — the alias, and its namespace. */
const ALIAS_RE =
  /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:\{[^{}]*?namespace:\s*)?(["'])([A-Za-z0-9_]*)\2/g;
/** Any translator call: `t("key")`, `editor("quranMode")`, `nav("billing")`… */
const CALL_RE =
  /(?<![\w.$])([A-Za-z_$][\w$]*)(?:\.rich|\.markup|\.raw)?\(\s*(["'])([A-Za-z0-9_.]+)\2/g;
/** Calls that only ever take a namespace, never a key. */
const NOT_A_KEY = new Set(["styles", "cn", "require", "import"]);

/** { key: file } for every static key, already namespace-resolved. */
const used = new Map();
const unresolved = [];

for (const file of walk(SRC)) {
  const text = readFileSync(file, "utf8");
  const namespaces = new Set();
  for (const match of text.matchAll(ALIAS_RE)) namespaces.add(match[3]);
  if (namespaces.size === 0) namespaces.add("");

  // Aliased translators actually used in this file, e.g. { t: "editor", a11y: "a11y" }.
  const aliases = new Map();
  for (const match of text.matchAll(ALIAS_RE)) aliases.set(match[1], match[3]);

  for (const match of text.matchAll(CALL_RE)) {
    const [, callee, , key] = match;
    if (NOT_A_KEY.has(callee)) continue;
    // Only inspect calls that look like translator calls: `t`, or an alias this
    // file declared through useTranslations/getTranslations.
    const isTranslator = callee === "t" || aliases.has(callee);
    if (!isTranslator) continue;
    const scoped = aliases.get(callee) ?? [...namespaces][0] ?? "";
    const candidates = [...new Set([scoped ? `${scoped}.${key}` : key, key])];
    const hit = candidates.find((candidate) =>
      LOCALES.every((locale) => catalogues.get(locale).has(candidate)),
    );
    if (hit) {
      if (!used.has(hit)) used.set(hit, relative(ROOT, file));
    } else {
      unresolved.push({ key, file: relative(ROOT, file), candidates: candidates.filter((c) => c !== key) });
    }
  }
}

let failed = false;

if (unresolved.length) {
  failed = true;
  console.error(`\n✖ ${unresolved.length} translation key(s) with no catalogue entry:`);
  for (const { key, file, candidates } of unresolved) {
    const tried = candidates.filter((c) => c !== key).join(" | ");
    console.error(`  ${key}  ← ${file}${tried ? `  (tried: ${tried})` : ""}`);
  }
}

const drift = [];
for (const locale of LOCALES) {
  if (locale === REFERENCE) continue;
  const other = catalogues.get(locale);
  for (const key of reference.keys()) if (!other.has(key)) drift.push(`  [${locale}] missing: ${key}`);
  for (const key of other.keys()) if (!reference.has(key)) drift.push(`  [${locale}] extra: ${key}`);
}
if (drift.length) {
  failed = true;
  console.error(`\n✖ ${drift.length} catalogue drift issue(s) vs ${REFERENCE}:`);
  console.error(drift.join("\n"));
}

const unused = [...reference.keys()].filter((key) => !used.has(key));
if (unused.length) {
  console.warn(`\n! ${unused.length} unused key(s) (keep if reached through a dynamic lookup):`);
  console.warn(`  ${unused.join(", ")}`);
  if (process.argv.includes("--strict-unused")) failed = true;
}

if (failed) {
  console.error("\ni18n check FAILED.\n");
  process.exit(1);
}
console.log(
  `✓ i18n check passed — ${used.size} keys used, ${reference.size} per locale, ${LOCALES.length} locales.`,
);
