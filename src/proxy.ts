import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const handleI18nRouting = createIntlMiddleware(routing);

/** Paths (after the locale prefix) that don't require a session. */
const PUBLIC_PATHS = ["/login"];

export async function proxy(request: NextRequest) {
  const response = handleI18nRouting(request);

  // next-intl is redirecting (e.g. `/` → `/en`); let that happen first.
  if (response.headers.has("location")) return response;

  // Refresh the Supabase session and forward any updated auth cookies.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const [, locale, ...rest] = request.nextUrl.pathname.split("/");
  const path = "/" + rest.join("/");
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  if (!signedIn && !isPublic) {
    return redirectKeepingCookies(request, response, `/${locale}/login`);
  }
  if (signedIn && isPublic) {
    return redirectKeepingCookies(request, response, `/${locale}`);
  }
  return response;
}

function redirectKeepingCookies(request: NextRequest, from: NextResponse, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  // Skip API routes, the auth callback, Next.js internals and files with an extension.
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
