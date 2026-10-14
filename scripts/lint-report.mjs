#!/usr/bin/env node
/** Summarises `eslint --format json` output: errors per file, warnings per rule. */
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const file = process.argv[2] ?? "eslint-report.json";
const results = JSON.parse(readFileSync(resolve(ROOT, file), "utf8"));

let errors = 0;
let warnings = 0;

for (const result of results) {
  const fileErrors = result.messages.filter((message) => message.severity === 2);
  const fileWarnings = result.messages.filter((message) => message.severity === 1);
  errors += fileErrors.length;
  warnings += fileWarnings.length;
  if (fileErrors.length === 0) continue;

  console.log(relative(ROOT, result.filePath));
  for (const message of fileErrors) {
    console.log(`  ${message.line}:${message.column}  ${message.ruleId}`);
  }
}

const byRule = {};
for (const result of results) {
  for (const message of result.messages) {
    if (message.severity !== 1) continue;
    byRule[message.ruleId ?? "unknown"] = (byRule[message.ruleId ?? "unknown"] ?? 0) + 1;
  }
}

console.log(`\nerrors: ${errors}   warnings: ${warnings}`);
console.log("warnings by rule:", JSON.stringify(byRule, null, 1));
