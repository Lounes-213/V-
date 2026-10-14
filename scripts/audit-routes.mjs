import { readFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://127.0.0.1:3000";
const locales = ["en", "ar", "fr"];

const catalog = Object.fromEntries(
  locales.map((l) => [l, JSON.parse(readFileSync(`messages/${l}.json`, "utf8"))]),
);
const pick = (locale, path) => path.split(".").reduce((acc, key) => acc?.[key], catalog[locale]);

/** route -> message key whose text must be visible on that screen (localised). */
const routes = [
  ["", "landing.heroTitle"],
  ["/dashboard", "dashboard.title"],
  ["/new", "upload.title"],
  ["/projects", "projects.title"],
  ["/projects/demo-project", "projects.overviewTitle"],
  ["/projects/demo-project/editor", null],
  ["/projects/demo-project/quran", null],
  ["/projects/demo-project/suggestions", null],
  ["/quran-video", null],
  ["/settings", null],
  ["/billing", null],
  ["/design", null],
  ["/auth/sign-in", "auth.signInTitle"],
  ["/auth/sign-up", "auth.signUpTitle"],
  ["/legal/privacy", null],
  ["/legal/terms", null],
  ["/legal/cookies", null],
];

const BAD = ["Application error", "Internal Server Error", "Unhandled Runtime Error", "__next_error__"];

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

async function hit(url) {
  try {
    const res = await fetch(url, { redirect: "manual" });
    const type = res.headers.get("content-type") ?? "";
    const html = type.includes("text/html") ? await res.text() : "";
    return { status: res.status, location: res.headers.get("location"), html };
  } catch (err) {
    return { status: "ERR", html: "", error: String(err) };
  }
}

const checks = [];
for (const locale of locales) {
  for (const [route, key] of routes) checks.push({ locale, route, key });
}

let failed = 0;

for (const { locale, route, key } of checks) {
  const label = `/${locale}${route}`;
  const { status, html, error } = await hit(`${BASE}${label}`);
  const text = visibleText(html);
  const problems = [];

  if (status !== 200) problems.push(`status ${status}${error ? " " + error : ""}`);
  if (status === 200) {
    for (const needle of BAD) if (text.includes(needle)) problems.push(`contains "${needle}"`);
    if (text.includes("This page could not be found")) problems.push("renders Next default 404");
    if (text.length < 400) problems.push(`only ${text.length} chars of text`);
  }
  if (key) {
    const expected = pick(locale, key);
    if (expected && !text.includes(expected)) problems.push(`missing expected text "${expected}"`);
    if (!expected) problems.push(`missing message key ${key} in ${locale}`);
  }

  if (problems.length) failed += 1;
  console.log(
    `${problems.length ? "FAIL" : "OK  "} ${String(status).padEnd(4)} ${label.padEnd(30)} ${
      problems.length ? "<< " + problems.join("; ") : `${text.length} chars`
    }`,
  );
}

const assets = ["/manifest.webmanifest", "/sw.js", "/icons/icon-192.png", "/fonts/inter-latin.woff2", "/demo/demo-clip.webm"];
for (const path of assets) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" }).catch(() => null);
  const ok = res?.status === 200;
  if (!ok) failed += 1;
  console.log(`${ok ? "OK  " : "FAIL"} ${String(res?.status ?? "ERR").padEnd(4)} ${path}`);
}

// Unmatched URL -> our own global 404 with a real 404 status.
const probe = await hit(`${BASE}/en/this-route-does-not-exist`);
const probeText = visibleText(probe.html);
const branded = probeText.includes("Page not found · الصفحة غير موجودة");
const unmatchedOk = probe.status === 404 && branded;
if (!unmatchedOk) failed += 1;
console.log(
  `${unmatchedOk ? "OK  " : "FAIL"} ${String(probe.status).padEnd(4)} /en/this-route-does-not-exist  branded=${branded}`,
);

// No-locale URL must be redirected into a locale, not 404'd.
const root = await hit(`${BASE}/dashboard`);
const redirectOk = root.status === 307 || root.status === 308;
if (!redirectOk) failed += 1;
console.log(
  `${redirectOk ? "OK  " : "FAIL"} ${String(root.status).padEnd(4)} /dashboard -> ${root.location ?? "(no location)"}`,
);

const total = checks.length + assets.length + 2;
console.log(`\n${total - failed}/${total} checks healthy`);
