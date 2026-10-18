"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

/**
 * Header nav from the mockup. Trips, Alerts and Settings arrive in later phases; until then
 * they are shown greyed out with a "Coming soon" hint instead of linking to missing pages.
 */
export function MainNav() {
  const t = useTranslations();
  const pathname = usePathname();
  const onWatches = pathname === "/" || (pathname.startsWith("/watches") && pathname !== "/watches/new");

  const item = "inline-flex min-h-11 items-center rounded-lg px-3.5 whitespace-nowrap";
  return (
    <nav aria-label={t("Header.mainNav")} className="flex flex-wrap items-center gap-1 text-[15px]">
      <Link
        href="/"
        aria-current={onWatches ? "page" : undefined}
        className={onWatches ? `${item} bg-[#26374a] font-semibold text-white` : `${item} text-[#c9d1d9] hover:text-white`}
      >
        {t("Header.watches")}
      </Link>
      {(["trips", "alerts", "settings"] as const).map((key) => (
        <span
          key={key}
          aria-disabled="true"
          title={t("Common.comingSoon")}
          className={`${item} cursor-not-allowed text-[#c9d1d9]/45`}
        >
          {t(`Header.${key}`)}
          <span className="sr-only">（{t("Common.comingSoon")}）</span>
        </span>
      ))}
      <Link
        href="/watches/new"
        className="ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-amber px-4 font-bold whitespace-nowrap text-navy hover:bg-amber-strong"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        {t("Header.newWatch")}
      </Link>
    </nav>
  );
}
