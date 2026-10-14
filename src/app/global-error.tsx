"use client";

import "./globals.css";

/**
 * Last-resort error boundary for the root document.
 *
 * `[locale]/error.tsx` catches render errors inside a locale page and keeps the
 * shell. This one exists for the failures that boundary cannot see — a crash in
 * the root layout itself, or during the first render of the document — where
 * Next would otherwise serve a bare 500 page with no way back into the app.
 *
 * It replaces the root layout while active, so it declares its own `<html>`,
 * `<body>` and stylesheet, and it cannot use `metadata`: the document title is
 * set from React instead.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en" dir="ltr" data-theme="dark" data-digits="western">
      <head>
        <title>Something broke · خطأ غير متوقع</title>
        <meta name="robots" content="noindex" />
      </head>
      <body className="bg-ink text-fg min-h-dvh antialiased">
        <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center justify-center gap-6 px-5 py-16 text-center">
          <p className="text-danger text-xs font-semibold tracking-[0.32em] uppercase">Error</p>
          <h1 className="text-fg text-2xl font-semibold tracking-tight">
            The studio hit an unexpected error
          </h1>
          <p className="text-muted max-w-md text-sm">
            Your projects are stored on this device, so nothing is lost.
            <br />
            <span dir="rtl">مشاريعك محفوظة على جهازك، ولم يُفقد أي شيء.</span>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => retry()}
              className="bg-primary text-primary-fg hover:bg-primary-hover rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            >
              Try again · إعادة المحاولة
            </button>
            {/* A full document reload is the only guaranteed escape hatch when the
                React tree itself is the thing that failed, so this stays a plain
                anchor rather than a client-side <Link> — the lint rule assumes
                in-app navigation, which is exactly what we must not do here. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/en"
              className="border-border bg-surface hover:bg-raised rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
            >
              Back to the studio · العودة
            </a>
          </div>

          {error.digest ? <p className="text-subtle text-xs">Reference: {error.digest}</p> : null}

          <details className="w-full max-w-xl text-left">
            <summary className="text-muted cursor-pointer text-xs">Technical details</summary>
            <pre className="border-border bg-ink-deep text-subtle mt-2 max-h-64 overflow-auto rounded-lg border p-3 text-xs whitespace-pre-wrap">
              {error.message}
            </pre>
          </details>
        </main>
      </body>
    </html>
  );
}
