"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { AlertTriangle, Check, Lock, Mail, ShieldCheck, Sparkles, User } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { setSetting } from "@/lib/db";
import { refreshSession } from "@/lib/use-session";
import { signInSchema, signUpSchema, type SignInValues, type SignUpValues } from "@/lib/auth/schemas";

/**
 * A real form: the same zod schema validates here and on the server, errors map
 * to message keys in three languages, and the submit path talks to
 * /api/auth/session. When that route answers "not configured", the form says so
 * and offers the local path — it never pretends a session was created.
 */
export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const t = useTranslations("auth");
  const common = useTranslations("common");
  const editor = useTranslations("editor");
  const router = useRouter();
  const [state, setState] = React.useState<"idle" | "submitting" | "notice" | "error">("idle");
  const [message, setMessage] = React.useState<string | null>(null);

  const signIn = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "" },
  });

  const signUp = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    mode: "onBlur",
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", acceptTerms: false as unknown as true },
  });

  const text = (key?: string) => {
    if (key === "errorInvalidEmail") return t("errorInvalidEmail");
    if (key === "errorShortPassword") return t("errorShortPassword");
    if (key === "errorMismatch") return t("errorMismatch");
    return t("errorInvalidCredentials");
  };

  /**
   * The route answers with a machine-readable code; this maps each one to a
   * sentence in the reader's language instead of showing the server's English.
   */
  const codeText = (code: string): string => {
    if (code === "email_taken") return t("errorEmailTaken");
    if (code === "no_mailer") return t("errorNoMailer");
    if (code === "oauth_not_configured") return t("errorOauth");
    if (code === "rate_limited") return t("errorRateLimited");
    if (code === "upstream") return t("offlineNotice");
    return t("errorInvalidCredentials");
  };

  const submit = async (payload: unknown) => {
    setState("submitting");
    setMessage(null);
    try {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        // 501 means "this deployment cannot do that step" — an explanation, not
        // a failure, and the password path below still works.
        setState(response.status === 501 ? "notice" : "error");
        setMessage(codeText(body.error ?? ""));
        return;
      }
      // The cookie is set by the response; the header only learns about it from
      // the session endpoint, so refresh that before navigating.
      await refreshSession();
      router.push("/dashboard");
    } catch {
      setState("error");
      setMessage(t("offlineNotice"));
    }
  };

  const continueLocally = async () => {
    // A local profile flag and nothing else: no email, no password, no token.
    await setSetting("local-profile", { createdAt: Date.now(), mode: "local" });
    await refreshSession();
    router.push("/dashboard");
  };

  const isSignUp = mode === "sign-up";
  const busy = state === "submitting" || signIn.formState.isSubmitting || signUp.formState.isSubmitting;

  return (
    <div className="mx-auto w-full max-w-md">
      <header className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-border bg-raised text-primary">
          <ShieldCheck aria-hidden className="size-5" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold text-fg">{isSignUp ? t("signUpTitle") : t("signInTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{isSignUp ? t("signUpSubtitle") : t("signInSubtitle")}</p>
      </header>

      {state === "notice" ? (
        <div className="mt-5 rounded-xl border border-gold/35 bg-gold/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-gold" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg">{message}</p>
              <p className="mt-1 text-xs text-muted">{editor("localOnly")}</p>
            </div>
          </div>
          <Button variant="primary" size="sm" className="mt-3" full icon={<Sparkles />} onClick={() => void continueLocally()}>
            {common("continue")}
          </Button>
        </div>
      ) : null}

      {isSignUp ? (
        <form
          className="mt-6 space-y-4"
          noValidate
          onSubmit={signUp.handleSubmit((values) =>
            submit({
              mode: "sign-up",
              name: values.name,
              email: values.email,
              password: values.password,
              acceptTerms: true,
            }),
          )}
        >
          <Field label={t("nameLabel")} htmlFor="name" error={signUp.formState.errors.name ? text(signUp.formState.errors.name.message) : undefined}>
            <div className="relative">
              <User aria-hidden className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-subtle" />
              <Input id="name" autoComplete="name" placeholder={t("namePlaceholder")} className="ps-9" {...signUp.register("name")} />
            </div>
          </Field>

          <Field label={t("emailLabel")} htmlFor="email" error={signUp.formState.errors.email ? text(signUp.formState.errors.email.message) : undefined}>
            <div className="relative">
              <Mail aria-hidden className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-subtle" />
              <Input id="email" type="email" inputMode="email" autoComplete="email" placeholder={t("emailPlaceholder")} className="ps-9" {...signUp.register("email")} />
            </div>
          </Field>

          <Field label={t("passwordLabel")} htmlFor="password" error={signUp.formState.errors.password ? text(signUp.formState.errors.password.message) : undefined}>
            <div className="relative">
              <Lock aria-hidden className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-subtle" />
              <Input id="password" type="password" autoComplete="new-password" placeholder={t("passwordPlaceholder")} className="ps-9" {...signUp.register("password")} />
            </div>
          </Field>

          <Field
            label={t("confirmPasswordLabel")}
            htmlFor="confirmPassword"
            error={signUp.formState.errors.confirmPassword ? text(signUp.formState.errors.confirmPassword.message) : undefined}
          >
            <div className="relative">
              <Lock aria-hidden className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-subtle" />
              <Input id="confirmPassword" type="password" autoComplete="new-password" placeholder={t("passwordPlaceholder")} className="ps-9" {...signUp.register("confirmPassword")} />
            </div>
          </Field>

          <div className="flex items-start gap-2">
            <Checkbox
              id="accept-terms"
              checked={signUp.watch("acceptTerms") === true}
              onCheckedChange={(checked) =>
                signUp.setValue("acceptTerms", (checked === true) as unknown as true, { shouldValidate: true })
              }
            />
            <label htmlFor="accept-terms" className="text-xs leading-relaxed text-muted">
              {t("termsPrefix")}{" "}
              <Link href="/legal/terms" className="text-primary hover:underline">
                {t("termsLink")}
              </Link>{" "}
              {t("and")}{" "}
              <Link href="/legal/privacy" className="text-primary hover:underline">
                {t("privacyLink")}
              </Link>
            </label>
          </div>

          <Button type="submit" variant="primary" size="lg" full icon={<Check />} disabled={busy}>
            {busy ? common("loading") : t("signUpCta")}
          </Button>
        </form>
      ) : (
        <form
          className="mt-6 space-y-4"
          noValidate
          onSubmit={signIn.handleSubmit((values) => submit({ mode: "sign-in", email: values.email, password: values.password }))}
        >
          <Field label={t("emailLabel")} htmlFor="email" error={signIn.formState.errors.email ? text(signIn.formState.errors.email.message) : undefined}>
            <div className="relative">
              <Mail aria-hidden className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-subtle" />
              <Input id="email" type="email" inputMode="email" autoComplete="email" placeholder={t("emailPlaceholder")} className="ps-9" {...signIn.register("email")} />
            </div>
          </Field>

          <Field label={t("passwordLabel")} htmlFor="password" error={signIn.formState.errors.password ? text(signIn.formState.errors.password.message) : undefined}>
            <div className="relative">
              <Lock aria-hidden className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-subtle" />
              <Input id="password" type="password" autoComplete="current-password" placeholder={t("passwordPlaceholder")} className="ps-9" {...signIn.register("password")} />
            </div>
          </Field>

          <div className="flex items-center justify-between">
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => void submit({ mode: "magic-link", email: signIn.getValues("email") })}
            >
              {t("magicLink")}
            </button>
            <span className="text-xs text-subtle">{t("forgotPassword")}</span>
          </div>

          <Button type="submit" variant="primary" size="lg" full icon={<Check />} disabled={busy}>
            {busy ? common("loading") : t("signInCta")}
          </Button>
        </form>
      )}

      {message && state !== "notice" ? (
        <p role="alert" className="mt-4 rounded-lg border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
          {message}
        </p>
      ) : null}

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[11px] text-subtle">{t("or")}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        variant="secondary"
        full
        icon={<GoogleGlyph />}
        disabled={busy}
        onClick={() => void submit({ mode: "oauth", provider: "google" })}
      >
        {t("continueGoogle")}
      </Button>

      <p className="mt-5 text-center text-xs text-subtle">{t("localProviderNote")}</p>

      <p className="mt-3 text-center text-xs text-muted">
        {isSignUp ? t("haveAccount") : t("noAccount")}{" "}
        <Link href={isSignUp ? "/auth/sign-in" : "/auth/sign-up"} className="text-primary hover:underline">
          {isSignUp ? t("signInCta") : t("signUpCta")}
        </Link>
      </p>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path
        fill="currentColor"
        d="M12 11v2.4h5.5c-.2 1.4-1.7 4.1-5.5 4.1a6 6 0 1 1 0-12c1.7 0 2.9.7 3.6 1.4l2-1.9A9 9 0 1 0 12 21c5.2 0 8.6-3.6 8.6-8.7 0-.6-.1-1-.2-1.3H12Z"
      />
    </svg>
  );
}
