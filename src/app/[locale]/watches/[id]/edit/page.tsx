import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAllAirports, getWatch, requireUserId } from "@/lib/watches/queries";
import type { Watch } from "@/lib/watches/options";
import { WatchForm, NEW_WATCH_DEFAULTS } from "@/components/watch-form/watch-form";
import { BackIcon, PageSkeleton } from "@/components/icons";

export async function generateMetadata({ params }: PageProps<"/[locale]/watches/[id]/edit">) {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "WatchForm" });
  return { title: t("editTitle") };
}

/** The id is only known at request time, so everything that reads params renders inside Suspense. */
export default function EditWatchPage({ params }: PageProps<"/[locale]/watches/[id]/edit">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditWatch params={params} />
    </Suspense>
  );
}

async function EditWatch({ params }: { params: PageProps<"/[locale]/watches/[id]/edit">["params"] }) {
  const { locale: raw, id } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  await requireUserId(locale);
  const [watch, airports, t] = await Promise.all([
    getWatch(id),
    getAllAirports(),
    getTranslations({ locale, namespace: "WatchForm" }),
  ]);
  if (!watch || watch.deleted_at) notFound();

  return (
    <div className="flex flex-col gap-5">
      <Link href={`/watches/${watch.id}`} className="inline-flex min-h-11 items-center gap-1.5 self-start font-medium text-[#174a94]">
        <BackIcon />
        {t("cancel")}
      </Link>
      <h1 className="text-[32px] leading-tight font-bold">{t("editTitle")}</h1>
      <WatchForm airports={airports} initial={toFormValues(watch)} watchId={watch.id} />
    </div>
  );
}

function toFormValues(w: Watch) {
  return {
    ...NEW_WATCH_DEFAULTS,
    trip_type: w.trip_type,
    origin: w.origin,
    destination: w.destination,
    depart_date: w.depart_date,
    return_date: w.return_date ?? "",
    cabin: w.cabin,
    adults: String(w.adults),
    airline_pref: w.airline_pref,
    airlines: w.airlines.join(", "),
    max_stops: w.max_stops === null ? "any" : String(w.max_stops),
    flex_days: String(w.flex_days),
    currency: w.currency,
    check_every_hours: String(w.check_every_hours),
    target_price: w.target_price === null ? "" : String(Number(w.target_price)),
  };
}
