import { NextResponse } from "next/server";
import { authConfigured, sessionRequestSchema } from "@/lib/auth/schemas";
import { createAccount, toPublicAccount, verifyCredentials } from "@/lib/auth/local-store";
import {
  SESSION_COOKIE,
  clientKey,
  newSession,
  rateLimit,
  readSessionCookie,
  resetRateLimit,
  sessionCookieOptions,
  sessionSecretConfigured,
  signSession,
  verifySession,
} from "@/lib/auth/session";

/**
 * POST /api/auth/session — sign in, sign up, or ask for a magic link.
 * GET  /api/auth/session — who am I, right now.
 * DELETE /api/auth/session — sign out.
 *
 * With no identity provider configured the studio runs its own credential store
 * (see lib/auth/local-store.ts): real scrypt hashes, real signed session cookie,
 * nothing invented. When Supabase is configured it takes over and this store is
 * bypassed. Responses always say which path answered, so the UI never has to
 * guess whether it is looking at a hosted account or a local one.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" } as const;

function jsonError(status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: code, message, ...extra }, { status, headers: NO_STORE });
}

export async function GET(request: Request) {
  const session = await verifySession(readSessionCookie(request));
  const configured = authConfigured();

  return NextResponse.json(
    {
      user: session
        ? { id: session.sub, name: session.name ?? null, email: session.email ?? null, local: session.sub === "local" }
        : null,
      provider: configured ? "supabase" : "local",
      configured,
      signedSecret: sessionSecretConfigured(),
      localMode: true,
      note: "Projects, media and settings are local. An account only adds sync and billing.",
    },
    { headers: NO_STORE },
  );
}

export async function POST(request: Request) {
  if (authConfigured()) {
    // A provider is configured but this deployment has no provider client wired
    // yet: say so instead of inventing a session.
    return jsonError(502, "upstream", "The identity provider is configured but unreachable.");
  }

  const key = `session:${clientKey(request)}`;
  const limit = rateLimit(key);
  if (!limit.ok) {
    return jsonError(429, "rate_limited", "Too many attempts. Wait a moment and try again.", {
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "bad_request", "Body must be JSON.");
  }

  const parsed = sessionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_credentials",
        message: "Check the highlighted fields and try again.",
        issues: parsed.error.issues.slice(0, 6).map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 422, headers: NO_STORE },
    );
  }

  const payload = parsed.data;

  if (payload.mode === "oauth") {
    // OAuth needs a registered client per deployment; there is none here.
    return jsonError(501, "oauth_not_configured", "Google sign-in is not configured on this deployment.", {
      fallback: "password",
    });
  }

  if (payload.mode === "magic-link") {
    // No mailer is configured, and pretending otherwise would leave the user
    // waiting for a message that cannot arrive.
    return jsonError(501, "no_mailer", "Email sign-in links need a mail provider, which is not configured here.", {
      fallback: "password",
    });
  }

  if (payload.mode === "sign-up") {
    const created = await createAccount({ name: payload.name, email: payload.email, password: payload.password });
    if (!created.account) {
      return jsonError(409, "email_taken", "An account already exists for that email. Sign in instead.");
    }
    resetRateLimit(key);
    const session = newSession({
      sub: created.account.id,
      name: created.account.name,
      email: created.account.email,
    });
    const response = NextResponse.json(
      { user: toPublicAccount(created.account), provider: "local", created: true },
      { headers: NO_STORE },
    );
    response.cookies.set(SESSION_COOKIE, await signSession(session), sessionCookieOptions());
    return response;
  }

  const account = await verifyCredentials(payload.email, payload.password);
  if (!account) {
    return jsonError(401, "invalid_credentials", "That email and password do not match an account.");
  }

  resetRateLimit(key);
  const session = newSession({ sub: account.id, name: account.name, email: account.email });
  const response = NextResponse.json({ user: toPublicAccount(account), provider: "local" }, { headers: NO_STORE });
  response.cookies.set(SESSION_COOKIE, await signSession(session), sessionCookieOptions());
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ user: null, signedOut: true }, { headers: NO_STORE });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
