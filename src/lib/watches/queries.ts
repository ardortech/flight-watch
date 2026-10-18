import "server-only";
import { cache } from "react";
import { cacheLife } from "next/cache";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import { WATCH_COLUMNS, type Watch } from "./options";

export type Airport = {
  iata: string;
  name_en: string;
  name_zh: string | null;
  city_en: string;
  city_zh: string | null;
  country_code: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * All airports (reference data, the same for everyone), cached for a day.
 * Uses a cookie-less client because cached functions can't read cookies.
 * Call it after the page has read the session, so it isn't run at build time.
 */
export async function getAllAirports(): Promise<Airport[]> {
  "use cache";
  cacheLife("days");
  const supabase = createAnonClient(supabaseUrl(), supabaseAnonKey(), { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("airports")
    .select("iata, name_en, name_zh, city_en, city_zh, country_code")
    .order("iata");
  if (error) throw new Error(`Failed to load airports: ${error.message}`);
  return data as Airport[];
}

export async function getAirportMap(): Promise<Map<string, Airport>> {
  return new Map((await getAllAirports()).map((a) => [a.iata, a]));
}

/** The signed-in user's id, or a redirect to the sign-in page. Deduped per request. */
export const requireUserId = cache(async (locale: Locale): Promise<string> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect({ href: "/login", locale });
  return userId!;
});

/** The user's watches that aren't deleted, newest first. RLS limits rows to the signed-in user. */
export async function listWatches(): Promise<Watch[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watches")
    .select(WATCH_COLUMNS)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load watches: ${error.message}`);
  return data as Watch[];
}

/** One watch (deleted ones included, so the caller can decide), or null if missing / not the user's. */
export async function getWatch(id: string): Promise<Watch | null> {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("watches").select(WATCH_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load watch: ${error.message}`);
  return data as Watch | null;
}
