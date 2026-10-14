#!/usr/bin/env node
/** Lists ESLint warnings (from `eslint --format json`) with short file paths. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const results = JSON.parse(readFileSync(resolve(ROOT, "eslint-report.json"), "utf8"));
const short = (filePath) => filePath.replaceAll("\\", "/").split("/").slice(-2).join("/");

const filter = process.argv[2];
let count = 0;

for (const file of results) {
  for (const message of file.messages) {
    if (message.severity !== 1) continue;
    const rule = message.ruleId ?? "unknown";
    if (filter && rule !== filter) continue;
    count += 1;
    console.log(`${short(file.filePath)}:${message.line}  ${rule}  ${message.message.slice(0, 90)}`);
  }
}

console.log(`\n${count} warning(s)${filter ? ` for ${filter}` : ""}`);
