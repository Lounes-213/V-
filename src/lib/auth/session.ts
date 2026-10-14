import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Stateless sessions: the cookie carries a payload and an HMAC over it.
 *
 * Signing key comes from AUTH_SECRET when the deployment sets one. With no
 * secret configured we generate one on first use and keep it in `.data/`, so a
 * self-hosted studio still has unforgeable sessions — and never falls back to a
 * hard-coded key, which is how "temporary" auth becomes permanent.
 *
 * Server-only: import it from route handlers.
 */

export const SESSION_COOKIE = "dz_session";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
const KEY_FILE = join(process.cwd(), ".data", "session-secret");

export type SessionPayload = {
  /** Account id, or `local` for an anonymous visitor who chose to continue. */
  sub: string;
  name?: string;
  email?: string;
  /** Issued at / expires at, seconds since epoch. */
  iat: number;
  exp: number;
};

let cachedSecret: Buffer | null = null;

async function secretKey(): Promise<Buffer> {
  if (cachedSecret) return cachedSecret;

  const configured = process.env.AUTH_SECRET?.trim();
  if (configured && configured.length >= 16) {
    cachedSecret = Buffer.from(configured, "utf8");
    return cachedSecret;
  }

  try {
    const existing = (await readFile(KEY_FILE, "utf8")).trim();
    if (existing.length >= 32) {
      cachedSecret = Buffer.from(existing, "hex");
      return cachedSecret;
    }
  } catch {
    /* First run: fall through and create one. */
  }

  const generated = randomBytes(32);
  await mkdir(join(process.cwd(), ".data"), { recursive: true });
  await writeFile(KEY_FILE, `${generated.toString("hex")}\n`, { mode: 0o600 });
  cachedSecret = generated;
  return cachedSecret;
}

/** True when sessions are signed with an operator-provided secret. */
export function sessionSecretConfigured(): boolean {
  return Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.trim().length >= 16);
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const body = base64url(JSON.stringify(payload));
  const signature = createHmac("sha256", await secretKey()).update(body).digest();
  return `${body}.${base64url(signature)}`;
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = createHmac("sha256", await secretKey()).update(body).digest();
  const provided = Buffer.from(signature, "base64url");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function newSession(input: { sub: string; name?: string; email?: string }): SessionPayload {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: input.sub,
    ...(input.name ? { name: input.name } : {}),
    ...(input.email ? { email: input.email } : {}),
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
}

/** Cookie attributes are shared so every route sets exactly the same thing. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  };
}

export function readSessionCookie(request: Request): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/* ------------------------------------------------------------- rate limit -- */

const attempts = new Map<string, number[]>();
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 12;

/**
 * Small in-process brake on credential stuffing. Multi-instance deployments put
 * the same counter in Redis; for one process this is enough to stop a trivial
 * script.
 */
export function rateLimit(key: string): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) {
    const oldest = recent[0] ?? now;
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000)) };
  }
  recent.push(now);
  attempts.set(key, recent);
  return { ok: true, retryAfterSeconds: 0 };
}

export function resetRateLimit(key: string): void {
  attempts.delete(key);
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "local";
}
