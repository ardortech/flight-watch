# CLAUDE.md — shared rules for Flight Watch

Two people build this app, each with their own Claude Code session. Follow these rules in every session.

## Read first
- `SPEC.md` — the full spec and build phases. It is the source of truth; if a request conflicts with it, ask.
- `docs/design-summary.md` — short bilingual overview.
- `docs/mockup/` — the approved screens (one file per screen, `*Zh.dc.html` = Traditional Chinese). Match their layout, copy and colors.
- `AGENTS.md` — Next.js 16 notes. This Next.js version differs from older ones; read the bundled docs before writing Next code.

## How we work
- **Never commit to `main`.** One branch and one pull request per task. A person merges.
- Keep PRs small and focused on one task. Say in the PR what to click in the deploy preview to check it.
- Before opening a PR, run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`, and fix failures.
- Ask before choosing anything SPEC.md doesn't decide (a library, a data shape, a UX change). One of us may be new to coding: explain choices in plain words.
- Don't approve or run destructive steps (deleting data, resetting the database, force-pushing) without asking.

## App rules
- App name is **Flight Watch**, set once in `src/config/app.ts` (`APP_NAME`).
- **Every user-facing string exists in both `messages/zh-TW.json` and `messages/en.json`.** Traditional Chinese is the default language; use Taiwan terms (星空聯盟, 寰宇一家, 天合聯盟, 經濟艙, 直飛, 轉機, 12月18日, 週四).
- Use the mock price provider (`PRICE_PROVIDER=mock`) unless the task says otherwise. Never call Ignav or SerpApi from tests.
- Never put API keys or secrets in code, commits, logs or chat. Secrets come from environment variables listed in `.env.example`.
- Database changes only as new files in `supabase/migrations/`. Never edit an applied migration, and never change tables in the Supabase dashboard.
- Price-drop detection compares Ignav snapshots with Ignav snapshots in the same currency only (SPEC.md §4).
- Design tokens: navy `#14202B`, ground `#F3F4F1`, amber `#E8A33D`, blue `#1F5FBF` / `#DCE8FA` for cheaper/low, orange `#A8530F` / `#FBE3CC` for higher. Fonts: IBM Plex Sans, IBM Plex Mono (prices, airport codes), Noto Sans TC.
- Touch targets at least 44px; real `<button>`/`<a>`/`<label>` elements; pages work at phone width.
