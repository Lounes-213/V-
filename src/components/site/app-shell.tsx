import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/**
 * Chrome for every screen that is not the editor: dashboard, upload, settings,
 * billing, auth, legal, the design gallery, and the project sub-screens.
 *
 * The editor deliberately does not use it — it owns the whole viewport.
 */
export function AppShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-ink">
      <SiteHeader />
      <main id="main" className={className ?? "flex-1"}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

/** Shared page frame: same max width and rhythm on every app screen. */
export function PageFrame({
  children,
  className,
  width = "wide",
}: {
  children: React.ReactNode;
  className?: string;
  width?: "wide" | "narrow";
}) {
  return (
    <div
      className={[
        "mx-auto w-full px-4 py-8 sm:px-6 lg:py-12",
        width === "wide" ? "max-w-7xl" : "max-w-3xl",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
