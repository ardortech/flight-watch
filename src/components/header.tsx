import { cache, Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { APP_NAME } from "@/config/app";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { signOut } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { LanguageSwitcher, LanguageSwitcherFallback } from "./language-switcher";
import { MainNav } from "./main-nav";

export async function Header({ locale }: { locale: Locale }) {
  const tCommon = await getTranslations({ locale, namespace: "Common" });

  return (
    <header className="bg-navy text-ground">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded focus:bg-amber focus:px-3 focus:py-1 focus:text-navy">
        {tCommon("skipToContent")}
      </a>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex min-h-11 items-center gap-2.5 whitespace-nowrap text-lg font-bold">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#E8A33D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 16l8-3 4-9 2 1-2 8 6-2 2 2-18 6z" />
              <path d="M3 21h18" />
            </svg>
            {APP_NAME}
          </Link>
          <span className="ml-1">
            <Suspense fallback={<LanguageSwitcherFallback locale={locale} />}>
              <LanguageSwitcher />
            </Suspense>
          </span>
        </div>
        <Suspense fallback={null}>
          <SignedInPart locale={locale} />
        </Suspense>
      </div>
    </header>
  );
}

/** Deduped per request. */
const currentEmail = cache(async (): Promise<string | undefined> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.email;
});

async function SignedInPart({ locale }: { locale: Locale }) {
  const email = await currentEmail();
  if (!email) return null;
  const t = await getTranslations({ locale, namespace: "Header" });

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <MainNav />
      <div className="flex items-center gap-2 text-sm">
        <span className="hidden max-w-48 truncate text-white/70 lg:inline" title={t("signedInAs", { email })}>
          {email}
        </span>
        <form action={signOut.bind(null, locale)}>
          <button type="submit" className="min-h-11 whitespace-nowrap rounded-lg border border-white/25 px-3 hover:bg-white/10">
            {t("signOut")}
          </button>
        </form>
      </div>
    </div>
  );
}
