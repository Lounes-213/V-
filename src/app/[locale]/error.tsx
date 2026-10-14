"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppShell, PageFrame } from "@/components/site/app-shell";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/overlays";

/**
 * Route-level error boundary. A render error inside a screen shows this card
 * with the real message (collapsed behind details) and a retry that re-renders
 * the segment — the shell and the navigation stay usable.
 */
export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const states = useTranslations("states");
  const common = useTranslations("common");

  React.useEffect(() => {
    // Surfaced in the console so the cause is never only in the UI.
    console.error(error);
  }, [error]);

  return (
    <AppShell>
      <PageFrame width="narrow">
        <ErrorState
          title={states("errorTitle")}
          description={states("errorBody")}
          details={error.message}
          onRetry={reset}
          retryLabel={states("errorRetry")}
        />
        <div className="mt-4 flex justify-center">
          <Button asChild variant="ghost">
            <Link href="/dashboard">{common("back")}</Link>
          </Button>
        </div>
      </PageFrame>
    </AppShell>
  );
}
