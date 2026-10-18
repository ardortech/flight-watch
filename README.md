# Flight Watch

Watches flight prices and emails you when they drop. See [SPEC.md](SPEC.md) for the full build spec.
The product name lives in `src/config/app.ts`.

**Status:** phase 2 (Watches CRUD): new-watch form with airport autocomplete, dashboard cards, watch detail shell, edit, pause, soft delete + Undo.

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
| `src/lib/providers/` | Price provider layer (`PRICE_PROVIDER=mock\|ignav`); `MockProvider` is deterministic, free, and labels its results `mock` |
| `src/lib/watches/` | Watch options, form validation, formatting, airport search, data access |
| `src/lib/actions/watches.ts` | Server actions: create / edit, pause, soft delete, Undo |
| `src/components/watch-form/` | New / Edit watch form and airport autocomplete |
| `supabase/migrations/` | Schema, RLS policies, `handle_new_user` trigger (creates `profiles` rows), airports + seed (299 airports, OurAirports coordinates, hand-written Chinese names) |

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
