"use server";

import { hasLocale } from "next-intl";
import { refresh } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { getAirportMap, isUuid } from "@/lib/watches/queries";
import { todayUtc, validateWatch, type RawWatchForm, type WatchErrors, type WatchField } from "@/lib/watches/validate";

export type SaveWatchState =
  | { status: "idle" }
  | { status: "invalid"; errors: WatchErrors }
  | { status: "error" };

const FIELDS: WatchField[] = [
  "trip_type", "origin", "destination", "depart_date", "return_date", "cabin", "adults",
  "airline_pref", "airlines", "max_stops", "flex_days", "currency", "check_every_hours", "target_price",
];

async function signedInClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("Not signed in");
  return { supabase, userId };
}

function localeFrom(value: FormDataEntryValue | string | null): Locale {
  const s = String(value ?? "");
  return hasLocale(routing.locales, s) ? s : routing.defaultLocale;
}

/** Create a watch, or update one when the form carries an `id`. Redirects to the watch on success. */
export async function saveWatch(_prev: SaveWatchState, formData: FormData): Promise<SaveWatchState> {
  const { supabase, userId } = await signedInClient();
  const locale = localeFrom(formData.get("locale"));
  const id = String(formData.get("id") ?? "");

  const raw: RawWatchForm = {};
  for (const f of FIELDS) raw[f] = String(formData.get(f) ?? "");
  const airports = await getAirportMap();
  const result = validateWatch(raw, todayUtc(), (code) => airports.has(code));
  if (!result.ok) return { status: "invalid", errors: result.errors };

  // A new or changed query should be checked soon (the scheduler arrives in phase 3).
  const now = new Date().toISOString();
  const schedule = { next_target_check_at: now, next_nearby_check_at: now, next_insight_check_at: now };

  let watchId = id;
  if (id) {
    if (!isUuid(id)) return { status: "error" };
    const { data, error } = await supabase
      .from("watches")
      .update({ ...result.value, ...schedule })
      .eq("id", id)
      .is("deleted_at", null)
      .select("id");
    if (error || !data?.length) {
      console.error("update watch failed", error?.message ?? "no row");
      return { status: "error" };
    }
  } else {
    const { data, error } = await supabase
      .from("watches")
      .insert({ ...result.value, ...schedule, user_id: userId })
      .select("id")
      .single();
    if (error || !data) {
      console.error("insert watch failed", error?.message);
      return { status: "error" };
    }
    watchId = data.id;
  }
  redirect({ href: `/watches/${watchId}`, locale });
  return { status: "idle" };
}

/** Soft delete (SPEC §1): hide now, purge after 7 days (phase 7). Undo with `restoreWatch`. */
export async function deleteWatch(id: string): Promise<{ ok: boolean }> {
  if (!isUuid(id)) return { ok: false };
  const { supabase } = await signedInClient();
  const { data, error } = await supabase
    .from("watches")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select("id");
  if (error) console.error("delete watch failed", error.message);
  refresh();
  return { ok: !error && Boolean(data?.length) };
}

/** Delete from the watch page, then go to the dashboard, which offers Undo. */
export async function deleteWatchAndGoHome(locale: string, id: string) {
  const { ok } = await deleteWatch(id);
  redirect({ href: ok ? `/?deleted=${id}` : "/", locale: localeFrom(locale) });
}

export async function restoreWatch(id: string): Promise<{ ok: boolean }> {
  if (!isUuid(id)) return { ok: false };
  const { supabase } = await signedInClient();
  const { data, error } = await supabase
    .from("watches")
    .update({ deleted_at: null })
    .eq("id", id)
    .not("deleted_at", "is", null)
    .select("id");
  if (error) console.error("restore watch failed", error.message);
  refresh();
  return { ok: !error && Boolean(data?.length) };
}

/** Pause stops checks and alerts; resuming schedules a check right away. */
export async function setWatchPaused(id: string, paused: boolean) {
  if (!isUuid(id)) return;
  const { supabase } = await signedInClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("watches")
    .update(
      paused
        ? { status: "paused" }
        : { status: "active", next_target_check_at: now, next_nearby_check_at: now, next_insight_check_at: now },
    )
    .eq("id", id)
    .is("deleted_at", null);
  if (error) console.error("pause watch failed", error.message);
  refresh();
}
