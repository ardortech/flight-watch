import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Noto_Sans_TC } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { APP_NAME } from "@/config/app";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/header";
import "../globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
});
const notoTC = Noto_Sans_TC({
  weight: ["400", "500", "700"],
  variable: "--font-noto-tc",
  preload: false,
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${plexSans.variable} ${plexMono.variable} ${notoTC.variable}`}>
      <body className="min-h-dvh antialiased">
        <NextIntlClientProvider>
          <Header locale={locale} />
          <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
            {children}
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
