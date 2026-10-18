import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";

/**
 * Where to send a page request that still carries magic-link parameters, or null if it has none.
 * `?code=` goes through /auth/callback (sign in, then a clean redirect); a leftover `locale=` is dropped.
 */
export function magicLinkCleanup(requestUrl: URL): URL | null {
  const { searchParams, pathname } = requestUrl;
  const code = searchParams.get("code");
  if (!code && !searchParams.has("locale")) return null;

  const url = new URL(requestUrl);
  if (code) {
    const pathLocale = pathname.split("/")[1];
    const locale = hasLocale(routing.locales, pathLocale) ? pathLocale : searchParams.get("locale");
    url.pathname = "/auth/callback";
    url.search = "";
    url.searchParams.set("code", code);
    if (hasLocale(routing.locales, locale)) url.searchParams.set("locale", locale);
  } else {
    url.searchParams.delete("locale");
  }
  return url;
}
