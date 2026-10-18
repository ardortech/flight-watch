import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage({ params }: PageProps<"/[locale]">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Dashboard" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <NewWatchButton label={t("newWatch")} hint={t("comingSoon")} />
      </div>
      <Suspense fallback={<p className="text-muted">{t("loading")}</p>}>
        <DashboardBody locale={locale} />
      </Suspense>
      <p className="text-xs text-muted">{t("priceNote")}</p>
    </div>
  );
}

async function DashboardBody({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Dashboard" });
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect({ href: "/login", locale });

  const { count, error } = await supabase
    .from("watches")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .eq("status", "active");
  if (error) throw new Error(`Failed to load watches: ${error.message}`);
  const activeWatches = count ?? 0;

  const tiles = [
    { label: t("tiles.activeWatches"), value: String(activeWatches) },
    { label: t("tiles.drops7d"), value: "0" },
    { label: t("tiles.bestSaving"), value: "—" },
    { label: t("tiles.checksUsed"), value: "0" },
  ];

  return (
    <>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg bg-navy p-4 text-white">
            <dt className="text-xs text-white/70">{tile.label}</dt>
            <dd className="mt-1 font-mono text-2xl font-semibold">{tile.value}</dd>
          </div>
        ))}
      </dl>

      {activeWatches === 0 && (
        <section className="rounded-lg border border-dashed border-line bg-white px-6 py-12 text-center">
          <h2 className="text-lg font-semibold">{t("emptyTitle")}</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">{t("emptyBody")}</p>
          <div className="mt-6 flex justify-center">
            <NewWatchButton label={t("newWatch")} hint={t("comingSoon")} />
          </div>
        </section>
      )}
    </>
  );
}

/** The New watch form arrives in phase 2; until then the button is shown but disabled. */
function NewWatchButton({ label, hint }: { label: string; hint: string }) {
  return (
    <button
      type="button"
      disabled
      title={hint}
      className="rounded bg-amber px-4 py-2 font-semibold text-navy disabled:cursor-not-allowed disabled:opacity-60"
    >
      + {label}
    </button>
  );
}
