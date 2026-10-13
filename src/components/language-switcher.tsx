"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { saveProfileLocale } from "@/lib/actions/auth";

export function LanguageSwitcher() {
  const t = useTranslations();
  const current = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === current) return;
    startTransition(async () => {
      await saveProfileLocale(next);
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div role="group" aria-label={t("Header.language")} className="flex overflow-hidden rounded border border-white/25" aria-busy={pending}>
      {routing.locales.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          onClick={() => choose(locale)}
          aria-pressed={locale === current}
          className={
            locale === current
              ? "whitespace-nowrap bg-white/15 px-2 py-1 font-medium sm:px-2.5"
              : "whitespace-nowrap px-2 py-1 text-white/70 hover:bg-white/10 hover:text-white sm:px-2.5"
          }
        >
          {t(`Language.${locale}`)}
        </button>
      ))}
    </div>
  );
}
