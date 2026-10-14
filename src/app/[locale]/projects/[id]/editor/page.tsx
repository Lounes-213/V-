import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/routing";
import { EditorApp } from "@/components/editor/editor-app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "editor" });
  return {
    title: t("title"),
    description: t("emptyTranscript"),
    // The editor is a private working surface.
    robots: { index: false, follow: false },
  };
}

export default async function EditorPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  // The editor is fully client-side: the project lives in this device's storage.
  return <EditorApp projectId={id} />;
}
