import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * Locale resolution for every page request.
 *
 * Next 16 renamed the `middleware` file convention to `proxy` (see
 * docs/01-app/01-getting-started/16-proxy.md): same execution point, new name.
 * Keeping the old file name still works but logs a deprecation notice on every
 * boot, so this project uses the current convention.
 */
const handleLocale = createMiddleware(routing);

export function proxy(request: NextRequest) {
  return handleLocale(request);
}

export const config = {
  // Skip API routes, Next internals, and anything with a file extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
