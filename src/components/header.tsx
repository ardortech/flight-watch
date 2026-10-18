import { cache, Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { APP_NAME } from "@/config/app";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { signOut } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { LanguageSwitcher } from "./language-switcher";

export async function Header({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Header" });
  const tCommon = await getTranslations({ locale, namespace: "Common" });

  return (
    <header className="bg-navy text-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded focus:bg-amber focus:px-3 focus:py-1 focus:text-navy">
        {tCommon("skipToContent")}
      </a>
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap font-semibold tracking-tight">
          <span aria-hidden className="font-mono text-amber">↘</span>
          {APP_NAME}
        </Link>
        <Suspense fallback={null}>
          <SignedInNav label={t("dashboard")} />
        </Suspense>
        <div className="ml-auto flex items-center gap-2 text-sm sm:gap-3">
          <LanguageSwitcher />
          <Suspense fallback={null}>
            <Account locale={locale} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

/** Deduped per request: both header slots need it. */
const currentEmail = cache(async (): Promise<string | undefined> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.email;
});

async function SignedInNav({ label }: { label: string }) {
  if (!(await currentEmail())) return null;
  return (
    <nav className="hidden text-sm text-white/80 sm:block">
      <Link href="/" className="hover:text-white">{label}</Link>
    </nav>
  );
}

async function Account({ locale }: { locale: Locale }) {
  const email = await currentEmail();
  if (!email) return null;
  const t = await getTranslations({ locale, namespace: "Header" });

  return (
    <>
      <span className="hidden max-w-48 truncate text-white/70 md:inline" title={t("signedInAs", { email })}>
        {email}
      </span>
      <form action={signOut.bind(null, locale)}>
        <button type="submit" className="whitespace-nowrap rounded border border-white/25 px-2.5 py-1 hover:bg-white/10">
          {t("signOut")}
        </button>
      </form>
    </>
  );
}
