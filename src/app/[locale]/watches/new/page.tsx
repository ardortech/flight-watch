import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAllAirports, requireUserId } from "@/lib/watches/queries";
import { NEW_WATCH_DEFAULTS, WatchForm } from "@/components/watch-form/watch-form";
import { BackIcon } from "@/components/icons";

export async function generateMetadata({ params }: PageProps<"/[locale]/watches/new">) {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "WatchForm" });
  return { title: t("newTitle") };
}

export default async function NewWatchPage({ params }: PageProps<"/[locale]/watches/new">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "WatchForm" });
  const tCommon = await getTranslations({ locale, namespace: "Common" });

  return (
    <div className="flex flex-col gap-5">
      <Link href="/" className="inline-flex min-h-11 items-center gap-1.5 self-start font-medium text-[#174a94]">
        <BackIcon />
        {t("cancel")}
      </Link>
      <h1 className="text-[32px] leading-tight font-bold">{t("newTitle")}</h1>
      <Suspense fallback={<p className="text-muted">{tCommon("loading")}</p>}>
        <NewWatchForm locale={locale} />
      </Suspense>
    </div>
  );
}

async function NewWatchForm({ locale }: { locale: Locale }) {
  await requireUserId(locale);
  const airports = await getAllAirports();
  return <WatchForm airports={airports} initial={NEW_WATCH_DEFAULTS} />;
}
