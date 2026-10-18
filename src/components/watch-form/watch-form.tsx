"use client";

import { useActionState, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { saveWatch, type SaveWatchState } from "@/lib/actions/watches";
import { formatShortDate, nightsBetween, routeLabel } from "@/lib/watches/format";
import {
  AIRLINE_PREFS, CABINS, CHECK_EVERY_HOURS, CURRENCIES, CURRENCY_SYMBOL, FLEX_DAYS, STOPS, TRIP_TYPES,
  datesChecked, estimateChecksPerMonth, type Currency,
} from "@/lib/watches/options";
import { todayUtc, validateWatch, type RawWatchForm, type WatchErrors, type WatchField } from "@/lib/watches/validate";
import type { SearchableAirport } from "@/lib/watches/airport-search";
import { AirportCombobox } from "./airport-combobox";

type Values = Required<RawWatchForm>;

export const NEW_WATCH_DEFAULTS: Values = {
  trip_type: "round",
  origin: "",
  destination: "",
  depart_date: "",
  return_date: "",
  cabin: "economy",
  adults: "1",
  airline_pref: "any",
  airlines: "",
  max_stops: "any",
  flex_days: "0",
  currency: "USD",
  check_every_hours: "12",
  target_price: "",
};

type Props = {
  airports: readonly SearchableAirport[];
  initial: Values;
  /** Set when editing an existing watch. */
  watchId?: string;
};

/** New / Edit watch form (SPEC §7 screen 2, mockup NewWatch). */
export function WatchForm({ airports, initial, watchId }: Props) {
  const t = useTranslations("WatchForm");
  const tw = useTranslations("Watch");
  const locale = useLocale();
  const [v, setV] = useState<Values>(initial);
  const [clientErrors, setClientErrors] = useState<WatchErrors | null>(null);
  const [state, formAction, pending] = useActionState<SaveWatchState, FormData>(saveWatch, { status: "idle" });
  const known = useMemo(() => new Set(airports.map((a) => a.iata)), [airports]);

  const errors: WatchErrors = clientErrors ?? (state.status === "invalid" ? state.errors : {});
  const err = (f: WatchField) => (errors[f] ? t(`errors.${errors[f]}`) : undefined);
  const set = (f: WatchField) => (value: string) => {
    setV((prev) => ({ ...prev, [f]: value }));
    // Clear a field's error as soon as it's edited.
    if (clientErrors?.[f]) setClientErrors({ ...clientErrors, [f]: undefined });
  };

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const result = validateWatch(v, todayUtc(), (c) => known.has(c));
    if (!result.ok) {
      e.preventDefault();
      setClientErrors(result.errors);
      const first = Object.keys(result.errors)[0];
      requestAnimationFrame(() => document.getElementById(`f-${first}`)?.focus());
    } else {
      setClientErrors(null);
    }
  }

  const minDate = nextDay(todayUtc());
  const round = v.trip_type === "round";
  const flex = Number(v.flex_days) as 0 | 3 | 7;
  const hours = Number(v.check_every_hours) as 6 | 12 | 24;
  const currency = v.currency as Currency;
  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <div className="flex flex-wrap items-start gap-6">
      <form
        action={formAction}
        onSubmit={onSubmit}
        noValidate
        className="flex min-w-0 flex-[999_1_560px] flex-col gap-6.5 rounded-[14px] border border-line bg-white p-5 sm:p-7"
      >
        <input type="hidden" name="locale" value={locale} />
        {watchId && <input type="hidden" name="id" value={watchId} />}
        {(["trip_type", "flex_days", "airline_pref"] as const).map((f) => (
          <input key={f} type="hidden" name={f} value={v[f]} />
        ))}

        {hasErrors && (
          <p role="alert" className="rounded-lg border border-high/30 bg-high-bg px-3 py-2 text-sm text-high">
            {t("fixErrors")}
          </p>
        )}
        {state.status === "error" && (
          <p role="alert" className="rounded-lg border border-high/30 bg-high-bg px-3 py-2 text-sm text-high">
            {t("saveError")}
          </p>
        )}

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-lg font-bold">{t("trip")}</legend>
          <div role="group" aria-label={t("tripType")} className="inline-flex gap-1 self-start rounded-[10px] bg-[#eef0ec] p-1">
            {TRIP_TYPES.map((tt) => (
              <button key={tt} type="button" id={tt === "round" ? "f-trip_type" : undefined} aria-pressed={v.trip_type === tt} onClick={() => set("trip_type")(tt)} className={segment(v.trip_type === tt)}>
                {tw(`tripType.${tt}`)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
            <AirportCombobox
              id="f-origin" name="origin" label={t("from")} placeholder={t("airportPlaceholder")} noMatch={t("noAirportMatch")}
              airports={airports} locale={locale} value={v.origin} onChange={set("origin")} error={err("origin")}
            />
            <AirportCombobox
              id="f-destination" name="destination" label={t("to")} placeholder={t("airportPlaceholder")} noMatch={t("noAirportMatch")}
              airports={airports} locale={locale} value={v.destination} onChange={set("destination")} error={err("destination")}
            />
            <Field id="f-depart_date" label={t("depart")} error={err("depart_date")}>
              <input id="f-depart_date" name="depart_date" type="date" min={minDate} value={v.depart_date} onChange={(e) => set("depart_date")(e.target.value)} aria-invalid={Boolean(err("depart_date"))} aria-describedby={err("depart_date") ? "f-depart_date-error" : undefined} className={fieldClass(err("depart_date"))} />
            </Field>
            {round && (
              <Field id="f-return_date" label={t("return")} error={err("return_date")}>
                <input id="f-return_date" name="return_date" type="date" min={v.depart_date ? nextDay(v.depart_date) : minDate} value={v.return_date} onChange={(e) => set("return_date")(e.target.value)} aria-invalid={Boolean(err("return_date"))} aria-describedby={err("return_date") ? "f-return_date-error" : undefined} className={fieldClass(err("return_date"))} />
              </Field>
            )}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-1 text-lg font-bold">{t("flexTitle")}</legend>
          <p className="text-sm text-muted">{t("flexBody")}</p>
          <div role="group" aria-label={t("dateWindow")} className="grid grid-cols-3 gap-2.5">
            {FLEX_DAYS.map((d) => {
              const on = flex === d;
              return (
                <button
                  key={d} type="button" id={d === 0 ? "f-flex_days" : undefined} aria-pressed={on} onClick={() => set("flex_days")(String(d))}
                  className={`min-h-16 rounded-[10px] border-2 px-3.5 py-3 text-left ${on ? "border-navy bg-ground" : "border-line bg-white"}`}
                >
                  <span className="block text-base font-bold sm:text-lg">{t(`windowOption.${d}`)}</span>
                  <span className="mt-0.5 block text-[13px]">{t("datesCount", { count: datesChecked(d) })}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-1 text-lg font-bold">{t("airlines")}</legend>
          <div role="group" aria-label={t("airlinePref")} className="flex flex-wrap gap-2">
            {AIRLINE_PREFS.map((p) => {
              const on = v.airline_pref === p;
              return (
                <button
                  key={p} type="button" id={p === "any" ? "f-airline_pref" : undefined} aria-pressed={on} onClick={() => set("airline_pref")(p)}
                  className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${on ? "border-navy bg-navy text-white" : "border-[#c4cac4] bg-white text-ink"}`}
                >
                  {tw(`airlinePref.${p}`)}
                </button>
              );
            })}
          </div>
          {v.airline_pref === "specific" && (
            <Field id="f-airlines" label={t("airlineCodes")} error={err("airlines")} className="mt-1">
              <input id="f-airlines" name="airlines" type="text" autoCapitalize="characters" placeholder={t("airlineCodesPlaceholder")} value={v.airlines} onChange={(e) => set("airlines")(e.target.value)} aria-invalid={Boolean(err("airlines"))} aria-describedby={err("airlines") ? "f-airlines-error" : undefined} className={fieldClass(err("airlines"))} />
            </Field>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-1 text-lg font-bold">{t("details")}</legend>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
            <Field id="f-cabin" label={t("cabin")} error={err("cabin")}>
              <select id="f-cabin" name="cabin" value={v.cabin} onChange={(e) => set("cabin")(e.target.value)} className={fieldClass(err("cabin"))}>
                {CABINS.map((c) => <option key={c} value={c}>{tw(`cabin.${c}`)}</option>)}
              </select>
            </Field>
            <Field id="f-adults" label={t("adults")} error={err("adults")}>
              <input id="f-adults" name="adults" type="number" inputMode="numeric" min={1} max={9} value={v.adults} onChange={(e) => set("adults")(e.target.value)} aria-invalid={Boolean(err("adults"))} aria-describedby={err("adults") ? "f-adults-error" : undefined} className={fieldClass(err("adults"))} />
            </Field>
            <Field id="f-max_stops" label={t("stops")} error={err("max_stops")}>
              <select id="f-max_stops" name="max_stops" value={v.max_stops} onChange={(e) => set("max_stops")(e.target.value)} className={fieldClass(err("max_stops"))}>
                {STOPS.map((s) => <option key={s} value={s}>{tw(`stops.${s}`)}</option>)}
              </select>
            </Field>
            <Field id="f-currency" label={t("currency")} error={err("currency")}>
              <select id="f-currency" name="currency" value={v.currency} onChange={(e) => set("currency")(e.target.value)} className={fieldClass(err("currency"))}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{t("currencyOption", { code: c, name: t(`currencyName.${c}`) })}</option>)}
              </select>
            </Field>
            <Field id="f-check_every_hours" label={t("frequency")} error={err("check_every_hours")}>
              <select id="f-check_every_hours" name="check_every_hours" value={v.check_every_hours} onChange={(e) => set("check_every_hours")(e.target.value)} className={fieldClass(err("check_every_hours"))}>
                {CHECK_EVERY_HOURS.map((h) => <option key={h} value={h}>{t(`frequencyOption.${h}`)}</option>)}
              </select>
            </Field>
            <Field id="f-target_price" label={t("target")} error={err("target_price")}>
              <div className={`flex items-center overflow-hidden rounded-lg border bg-white ${err("target_price") ? "border-high" : "border-[#c4cac4]"} focus-within:border-navy focus-within:ring-2 focus-within:ring-amber/50`}>
                <span className="self-stretch bg-[#eef0ec] px-3 py-2.5 font-mono">{CURRENCY_SYMBOL[currency] ?? ""}</span>
                <input id="f-target_price" name="target_price" type="text" inputMode="decimal" value={v.target_price} onChange={(e) => set("target_price")(e.target.value)} aria-invalid={Boolean(err("target_price"))} aria-describedby={err("target_price") ? "f-target_price-error" : undefined} className="min-h-11 min-w-0 flex-1 border-0 px-3 font-mono outline-none" />
              </div>
            </Field>
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-2.5 border-t border-[#eef0ec] pt-5">
          <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-navy px-5 font-bold text-white hover:bg-navy-soft disabled:opacity-60">
            {pending ? t("saving") : watchId ? t("submitEdit") : t("submitCreate")}
          </button>
          <Link href={watchId ? `/watches/${watchId}` : "/"} className="inline-flex min-h-11 items-center rounded-lg border border-[#c4cac4] px-5 font-bold text-ink">
            {t("cancel")}
          </Link>
        </div>
      </form>

      <aside aria-labelledby="sum-h" className="flex flex-[1_1_280px] flex-col gap-3.5 rounded-[14px] bg-navy p-6 text-ground lg:sticky lg:top-6">
        <h2 id="sum-h" className="text-lg font-bold">{t("summaryTitle")}</h2>
        <div className="font-mono text-[26px] leading-tight font-semibold">
          {v.origin && v.destination ? routeLabel(v.origin, v.destination, round ? "round" : "oneway") : t("summaryPickRoute")}
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-[#aeb8c2]">{t("summaryDates")}</dt>
          <dd>{summaryDates(v, locale, t, tw)}</dd>
          <dt className="text-[#aeb8c2]">{t("summaryWindow")}</dt>
          <dd>{flex === 0 ? t("summaryExact") : t("summaryWindowDates", { days: flex, count: datesChecked(flex) })}</dd>
          <dt className="text-[#aeb8c2]">{t("summaryAirlines")}</dt>
          <dd>{v.airline_pref === "specific" && v.airlines.trim() ? v.airlines.toUpperCase() : tw(`airlinePref.${v.airline_pref}`)}</dd>
          <dt className="text-[#aeb8c2]">{t("summaryCabin")}</dt>
          <dd>
            {[tw(`cabin.${v.cabin}`), tw("adults", { count: Number(v.adults) || 1 }), v.max_stops === "any" ? null : tw(`stopsChip.${v.max_stops}`)]
              .filter(Boolean)
              .join(" · ")}
          </dd>
          <dt className="text-[#aeb8c2]">{t("summaryCurrency")}</dt>
          <dd>{`${t(`currencyName.${currency}`)} (${CURRENCY_SYMBOL[currency]})`}</dd>
        </dl>
        <div className="flex flex-col gap-1 border-t border-[#33465a] pt-3.5">
          <div className="text-[13px] text-[#aeb8c2]">{t("checksTitle")}</div>
          <div className="font-mono text-[30px] font-semibold">{t("checksValue", { count: estimateChecksPerMonth(flex, hours) })}</div>
          <div className="text-[13px] text-[#c9d1d9]">
            {flex === 0 ? t("freqNoteExact", { hours }) : t("freqNoteFlex", { hours })}
            {locale === "en" ? " " : ""}
            {t("freqNoteSlow")}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({ id, label, error, className = "", children }: { id: string; label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-high">
          {error}
        </p>
      )}
    </div>
  );
}

type T = (key: string, values?: Record<string, string | number>) => string;

function summaryDates(v: Values, locale: string, t: T, tw: T): string {
  if (!v.depart_date) return t("summaryPickDates");
  const depart = formatShortDate(v.depart_date, locale);
  if (v.trip_type !== "round") return depart;
  if (!v.return_date || v.return_date <= v.depart_date) return depart;
  return t("summaryNights", {
    from: depart,
    to: formatShortDate(v.return_date, locale),
    nights: tw("nights", { count: nightsBetween(v.depart_date, v.return_date) }),
  });
}

function segment(on: boolean) {
  return `min-h-11 rounded-lg px-4 text-sm font-semibold ${on ? "bg-navy text-white" : "text-[#3d4650]"}`;
}

function fieldClass(error?: string) {
  return `field ${error ? "border-high" : ""}`;
}

function nextDay(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
