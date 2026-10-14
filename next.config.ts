import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Security headers.
 *
 * `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` are required for
 * `SharedArrayBuffer`, which ffmpeg.wasm needs for its multi-threaded core. They are
 * scoped to the editor route so the rest of the site keeps normal cross-origin behaviour.
 */
const coopCoep = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
];

const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; Turbopack needs eval in dev.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://cdn.jsdelivr.net`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  // everyayah.com holds the per-ayah recitations the studio streams; without it
  // here the browser rejects the audio with a load error and the whole
  // reciter path silently has no sound.
  "media-src 'self' blob: data: https://everyayah.com",
  "font-src 'self'",
  "worker-src 'self' blob:",
  "connect-src 'self' blob: data: https://api.quran.com https://cdn.jsdelivr.net https://everyayah.com https://api.alquran.cloud",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Keeps Arabic/CJK import costs honest in the bundle report.
    optimizePackageImports: ["lucide-react", "motion"],
    // Our root layout sits inside the `[locale]` dynamic segment, so an unmatched
    // URL has no layout to compose a 404 from. This opts into app/global-not-found
    // instead of Next's bare default page.
    globalNotFound: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
      {
        source: "/:locale(en|ar|fr)/editor/:path*",
        headers: coopCoep,
      },
      {
        source: "/:locale(en|ar|fr)/quran/:path*",
        headers: coopCoep,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
