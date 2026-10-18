import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { LoginForm } from "./login-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "Login" });
  return { title: t("title") };
}

export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale: locale as Locale, namespace: "Login" });

  return (
    <div className="mx-auto max-w-md pt-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="mt-2 text-muted">{t("intro")}</p>
      <Suspense fallback={null}>
        <LinkError searchParams={searchParams} message={t("linkError")} />
      </Suspense>
      <LoginForm locale={locale} />
    </div>
  );
}

async function LinkError({
  searchParams,
  message,
}: {
  searchParams: PageProps<"/[locale]/login">["searchParams"];
  message: string;
}) {
  const { error } = await searchParams;
  if (error !== "link") return null;
  return (
    <p role="alert" className="mt-4 rounded border border-high/30 bg-high-bg px-3 py-2 text-sm text-high">
      {message}
    </p>
  );
}
