"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { saveProfileLocale } from "@/lib/actions/auth";

/** 中文 / EN toggle next to the app name (mockup header). Chinese first: it's the default. */
const ORDER: Locale[] = ["zh-TW", "en"];
const FULL_NAME = { "zh-TW": "nameZh-TW", en: "nameEn" } as const;

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
      // Keep the query string (e.g. nothing to lose on the form, but ?deleted= on the dashboard).
      router.replace(`${pathname}${window.location.search}`, { locale: next });
    });
  }

  return (
    <div
      role="group"
      aria-label={t("Header.language")}
      aria-busy={pending}
      className="inline-flex overflow-hidden rounded-full border border-[#4a5b6c] text-[13px] font-semibold"
    >
      {ORDER.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          onClick={() => choose(locale)}
          aria-pressed={locale === current}
          aria-label={t(`Language.${FULL_NAME[locale]}`)}
          className={
            locale === current
              ? "min-h-11 bg-amber px-3 text-navy"
              : "min-h-11 px-3 text-[#c9d1d9] hover:bg-white/10 hover:text-white"
          }
        >
          {t(`Language.${locale}`)}
        </button>
      ))}
    </div>
  );
}

/** Shown while the switcher hydrates on dynamic routes (it reads the current path). */
export function LanguageSwitcherFallback({ locale }: { locale: Locale }) {
  return (
    <div aria-hidden className="inline-flex overflow-hidden rounded-full border border-[#4a5b6c] text-[13px] font-semibold">
      {ORDER.map((l) => (
        <span key={l} className={l === locale ? "flex min-h-11 items-center bg-amber px-3 text-navy" : "flex min-h-11 items-center px-3 text-[#c9d1d9]"}>
          {l === "zh-TW" ? "中文" : "EN"}
        </span>
      ))}
    </div>
  );
}
