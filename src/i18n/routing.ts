import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "zh-TW"],
  defaultLocale: "zh-TW", // SPEC §1: Traditional Chinese is the default; bare `/` still follows the browser language.
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
