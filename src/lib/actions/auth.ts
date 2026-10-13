"use server";

import { hasLocale } from "next-intl";
import { redirect } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

export type SignInState = { status: "idle" | "sent" | "invalid" | "error"; email?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signInWithMagicLink(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const requested = String(formData.get("locale") ?? "");
  const locale: Locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  if (!EMAIL_RE.test(email)) return { status: "invalid", email };

  const baseUrl = process.env.APP_BASE_URL;
  if (!baseUrl) throw new Error("APP_BASE_URL is not set");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${baseUrl}/auth/callback?locale=${encodeURIComponent(locale)}`,
      // Read by the handle_new_user trigger to set the new profile's locale.
      data: { locale },
    },
  });
  if (error) {
    console.error("signInWithOtp failed", error.message);
    return { status: "error", email };
  }
  return { status: "sent", email };
}

export async function signOut(locale: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${hasLocale(routing.locales, locale) ? locale : routing.defaultLocale}/login`);
}

/** Saves the UI language on the profile so emails go out in the same language. */
export async function saveProfileLocale(locale: string) {
  if (!hasLocale(routing.locales, locale)) return;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return;
  await supabase.from("profiles").update({ locale }).eq("id", userId);
}
