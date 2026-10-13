import { NextResponse, type NextRequest } from "next/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link landing. Supabase redirects here with `?code=...` (PKCE).
 * Exchange it for a session, then send the user to their saved locale.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const requested = searchParams.get("locale");
  const fallbackLocale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  if (!code) {
    return NextResponse.redirect(`${origin}/${fallbackLocale}/login?error=link`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/${fallbackLocale}/login?error=link`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("locale")
    .eq("id", data.user.id)
    .maybeSingle();
  const locale = hasLocale(routing.locales, profile?.locale) ? profile.locale : fallbackLocale;

  const response = NextResponse.redirect(`${origin}/${locale}`);
  response.cookies.set("NEXT_LOCALE", locale, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  return response;
}
