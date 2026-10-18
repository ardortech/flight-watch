import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { describeWatch } from "@/lib/watches/describe";
import { getAirportMap, getWatch, listWatches, requireUserId } from "@/lib/watches/queries";
import { WatchList, type WatchCard } from "./watch-list";

export default async function DashboardPage({ params, searchParams }: PageProps<"/[locale]">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Dashboard" });
  const tCommon = await getTranslations({ locale, namespace: "Common" });

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-[32px] leading-tight font-bold">{t("title")}</h1>
        <p className="mt-1.5 text-muted">{t("intro")}</p>
      </div>
      <Suspense fallback={<p className="text-muted">{tCommon("loading")}</p>}>
        <DashboardBody locale={locale} searchParams={searchParams} />
      </Suspense>
      <p className="text-xs text-muted">{tCommon("priceNote")}</p>
    </div>
  );
}

async function DashboardBody({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: PageProps<"/[locale]">["searchParams"];
}) {
  await requireUserId(locale);
  const [t, tWatch, watches, airports, { deleted }] = await Promise.all([
    getTranslations({ locale, namespace: "Dashboard" }),
    getTranslations({ locale, namespace: "Watch" }),
    listWatches(),
    getAirportMap(),
    searchParams,
  ]);

  const cards: WatchCard[] = watches.map((w) => {
    const d = describeWatch(w, airports, locale, tWatch);
    return {
      id: w.id,
      route: d.route,
      cities: d.cities,
      dates: d.dates,
      filters: d.filters,
      window: d.window,
      priceNote: d.priceNote,
      paused: w.status === "paused",
    };
  });

  // Arriving from "Delete" on a watch page: offer Undo for that watch.
  let initialUndo: { id: string; route: string } | null = null;
  if (typeof deleted === "string") {
    const w = await getWatch(deleted);
    if (w?.deleted_at) initialUndo = { id: w.id, route: describeWatch(w, airports, locale, tWatch).route };
  }

  const activeCount = watches.filter((w) => w.status === "active").length;
  // Price drops, savings and check counts need price checks (phases 3–5); until then show "—".
  const tiles = [
    { label: t("tiles.activeWatches"), value: String(activeCount) },
    { label: t("tiles.drops7d"), value: "—" },
    { label: t("tiles.bestSaving"), value: "—" },
    { label: t("tiles.checksUsed"), value: "—" },
  ];

  return (
    <>
      <section aria-label={t("summary")}>
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-xl border border-line bg-white px-5 py-4">
              <dt className="text-[13px] text-muted">{tile.label}</dt>
              <dd className="mt-1 font-mono text-[28px] font-semibold">{tile.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      {/* Keyed so a new ?deleted= remounts the list (Next keeps visited pages alive, with their state). */}
      <WatchList key={initialUndo?.id ?? "none"} cards={cards} initialUndo={initialUndo} />
    </>
  );
}
