# Fare Monitor

Watches flight prices and emails you when they drop. See [SPEC.md](SPEC.md) for the full build spec.
The product name lives in `src/config/app.ts`.

**Status:** phase 1 (Scaffold): Next.js + next-intl (`en`, `zh-TW`), Supabase schema + RLS, magic-link sign-in, design tokens, header, empty dashboard.

## Stack

Next.js 16 (App Router, `cacheComponents`) · TypeScript · Tailwind CSS v4 · next-intl · Supabase (Postgres + Auth) · Vitest · npm. Deploys to Netlify.

## Layout

| Path | What |
|---|---|
| `src/app/[locale]/` | Pages (`/en/...`, `/zh-TW/...`) |
| `src/app/auth/callback/route.ts` | Magic-link landing: exchanges the code for a session, redirects to the saved locale |
| `src/proxy.ts` | Locale routing (next-intl), session refresh, and sign-in gate |
| `src/i18n/` + `messages/*.json` | Locale config and UI strings |
| `src/lib/supabase/` | Server/browser Supabase clients |
| `src/lib/providers/` | Price provider layer (`PRICE_PROVIDER=mock\|ignav`); `MockProvider` is deterministic and free |
| `supabase/migrations/` | Schema, RLS policies, `handle_new_user` trigger (creates `profiles` rows) |

## Local development

```bash
npm install
npx supabase start          # needs Docker; applies supabase/migrations
cp .env.example .env.local  # then fill in the values below
npm run dev                 # http://localhost:3000
```

Minimum `.env.local` for phase 1, using the values printed by `npx supabase start`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
APP_BASE_URL=http://localhost:3000
PRICE_PROVIDER=mock
```

Local magic-link emails land in Mailpit at http://127.0.0.1:54324. Open the link in the same browser you requested it from (PKCE).

## Scripts

`npm run dev` · `npm run build` · `npm test` (Vitest) · `npm run lint` · `npm run typecheck`
