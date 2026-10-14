import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell, PageFrame } from "@/components/site/app-shell";
import { AuthForm } from "@/components/site/auth-form";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  // The locale layout's title template appends the app name.
  return { title: t("signUpTitle") };
}

export default async function SignUpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AppShell>
      <PageFrame width="narrow">
        <AuthForm mode="sign-up" />
      </PageFrame>
    </AppShell>
  );
}
