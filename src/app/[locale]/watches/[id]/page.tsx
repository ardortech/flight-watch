import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { setWatchPaused } from "@/lib/actions/watches";
import { describeWatch } from "@/lib/watches/describe";
import { formatMoney } from "@/lib/watches/format";
import { getAirportMap, getWatch, requireUserId } from "@/lib/watches/queries";
import { BackIcon, PageSkeleton } from "@/components/icons";
import { DeleteWatch } from "./delete-watch";

export async function generateMetadata({ params }: PageProps<"/[locale]/watches/[id]">) {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "WatchDetail" });
  return { title: t("pageTitle") };
}

/** The id is only known at request time, so everything that reads params renders inside Suspense. */
export default function WatchPage({ params }: PageProps<"/[locale]/watches/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <WatchPageBody params={params} />
    </Suspense>
  );
}

async function WatchPageBody({ params }: { params: PageProps<"/[locale]/watches/[id]">["params"] }) {
  const { locale: raw, id } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "WatchDetail" });
  const tCommon = await getTranslations({ locale, namespace: "Common" });

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="inline-flex min-h-11 items-center gap-1.5 self-start font-medium text-[#174a94]">
        <BackIcon />
        {t("back")}
      </Link>
      <WatchDetail locale={locale} id={id} />
      <p className="text-xs text-muted">{tCommon("priceNote")}</p>
    </div>
  );
}

async function WatchDetail({ locale, id }: { locale: Locale; id: string }) {
  await requireUserId(locale);
  const [watch, airports, t, tWatch, tCommon] = await Promise.all([
    getWatch(id),
    getAirportMap(),
    getTranslations({ locale, namespace: "WatchDetail" }),
    getTranslations({ locale, namespace: "Watch" }),
    getTranslations({ locale, namespace: "Common" }),
  ]);

  if (!watch || watch.deleted_at) {
    return (
      <section className="rounded-xl border border-dashed border-[#c4cac4] bg-white px-6 py-10 text-center">
        <h1 className="text-lg font-bold">{t("notFoundTitle")}</h1>
        <p className="mt-2 text-muted">{t("notFoundBody")}</p>
      </section>
    );
  }

  const d = describeWatch(watch, airports, locale, tWatch);
  const paused = watch.status === "paused";
  const target = watch.target_price === null ? null : formatMoney(Number(watch.target_price), watch.currency);
  const chips = [d.tripChip, d.cabinChip, d.airline, d.stops].filter(Boolean) as string[];
  const created = new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(watch.created_at));
  const outline = "inline-flex min-h-11 items-center rounded-lg border border-[#c4cac4] bg-white px-4 font-semibold text-ink hover:bg-ground";

  return (
    <>
      {paused && (
        <p role="status" className="rounded-xl border border-high/30 bg-high-bg px-5 py-3 text-high">
          {t("pausedBanner")}
        </p>
      )}

      <section className="flex flex-wrap items-stretch gap-6">
        <div className="min-w-0 flex-[3_1_480px]">
          <div className="font-mono text-[32px] leading-[1.1] font-semibold tracking-[0.02em] sm:text-[40px]">{d.route}</div>
          <h1 className="mt-1.5 text-xl font-bold">
            {d.cities} · {d.dateRange}
          </h1>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <span key={c} className="rounded-full bg-[#e6e8e3] px-2.5 py-1 text-[13px]">{c}</span>
            ))}
            <span className="rounded-full bg-[#e6e8e3] px-2.5 py-1 text-[13px]">{d.window}</span>
          </div>
          <div className="mt-4 flex flex-wrap items-start gap-2">
            {/* "I booked this" arrives with the travel log (phase 6). */}
            <span aria-disabled="true" title={tCommon("comingSoon")} className="inline-flex min-h-11 cursor-not-allowed items-center gap-1.5 rounded-lg bg-navy/40 px-4 font-bold text-white">
              {t("booked")}
              <span className="sr-only">（{tCommon("comingSoon")}）</span>
            </span>
            <Link href={`/watches/${watch.id}/edit`} className={outline}>
              {t("edit")}
            </Link>
            <form action={setWatchPaused.bind(null, watch.id, !paused)}>
              <button type="submit" className={outline}>
                {paused ? t("resume") : t("pause")}
              </button>
            </form>
            <DeleteWatch locale={locale} id={watch.id} route={d.route} />
          </div>
        </div>

        <div className="flex flex-[2_1_320px] flex-col gap-2.5 rounded-[14px] bg-navy px-6 py-5.5 text-ground">
          <div className="text-[13px] text-[#aeb8c2]">{t("priceTitle")}</div>
          <div className="text-2xl font-semibold">{t("waitingTitle")}</div>
          <p className="text-sm text-[#c9d1d9]">{t("waitingBody")}</p>
          <div className="text-[13px] text-[#c9d1d9]">{target ? t("target", { price: target }) : t("noTarget")}</div>
        </div>
      </section>

      <section aria-labelledby="settings-h" className="rounded-[14px] border border-line bg-white p-6">
        <h2 id="settings-h" className="text-xl font-bold">{t("settingsTitle")}</h2>
        <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-muted">{t("settingWindow")}</dt>
          <dd>{d.window}</dd>
          <dt className="text-muted">{t("settingFrequency")}</dt>
          <dd>{tWatch("everyHours", { hours: watch.check_every_hours })}</dd>
          <dt className="text-muted">{t("settingCurrency")}</dt>
          <dd className="font-mono">{watch.currency}</dd>
          <dt className="text-muted">{t("settingTarget")}</dt>
          <dd className="font-mono">{target ?? t("none")}</dd>
          <dt className="text-muted">{t("settingStatus")}</dt>
          <dd>{paused ? t("statusPaused") : t("statusActive")}</dd>
          <dt className="text-muted">{t("settingCreated")}</dt>
          <dd>{created}</dd>
        </dl>
      </section>
    </>
  );
}
