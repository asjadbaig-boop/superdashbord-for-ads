# AdsByAsjad Tracker — Project Log

Meta Ads management dashboard for AdsByAsjad. Client-specific hierarchy: Campaign → Ad Set → Ad, daily data dumps, auto-generated scale/close/review recommendations, right-side detail panel with days active / spend / leads / CPL, red/amber/green threshold coloring.

## Stack
- React 19 + Vite + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite` plugin, tokens defined in `src/index.css` via `@theme`)
- Supabase (Postgres + RLS) as backend, with a `localStorage` fallback data layer (`src/lib/store.ts`) so the app runs with zero backend setup
- Recharts for the CPL trend sparkline
- PapaParse for Meta Ads Manager CSV import
- Deployed on Vercel, repo on GitHub (`asjadbaig-boop/superdashbord-for-ads`)

## Architecture
- `src/lib/types.ts` — core data shapes (Client, Campaign, AdSet, Ad, DailyEntry) + derived metrics shapes (AdMetrics, Recommendation, FlagLevel)
- `src/lib/metrics.ts` — recommendation engine (kill/scale/review/monitor logic, CPL trend, flag thresholds)
- `src/lib/store.ts` — data layer, dual backend (Supabase when env vars present, else localStorage)
- `src/lib/csvParser.ts` — Meta Ads Manager CSV/paste parser with column-alias matching
- `src/lib/supabase.ts` — Supabase client init, `supabaseConfigured` flag
- `src/pages/Dashboard.tsx` — main 3-column view (campaigns → ad sets/ads → detail panel) + recommendations strip
- `src/components/` — StatusBadge, Sparkline, AdDetailPanel, RecommendationsPanel, DataImport, ManualEntryGrid, ClientSettings
- `src/App.tsx` — shell: header, client picker, tab nav

## Design System (applied 2026-09-23)
"Financial Dashboard" dark palette + Plus Jakarta Sans, picked specifically because the app leans on green/amber/red status color as its primary signal.

**Colors** (tokens in `src/index.css` `@theme`):
- Background `#020617` · Card surface `#0e1223` · Elevated surface `#1a1e2f` / `#232840`
- Border `#2a3247` (default) / `#384259` (strong)
- Text `#f8fafc` (primary) / `#cbd5e1` (dim) / `#8b96ab` (faint)
- Good/Scale `#22c55e` · Watch/Review `#f59e0b` · Kill/Close `#ef4444`
- Accent (primary actions, active nav) `#6366f1` / hover `#818cf8`

**Typography**: Plus Jakarta Sans (Google Fonts), single family, weights 400–800. Numbers use `tabular-nums` throughout so columns don't jitter.

**Conventions**:
- All colors are Tailwind tokens (`bg-surface`, `text-good`, `border-border`, etc.) — never raw hex in components
- Cards/panels: `rounded-xl` or `rounded-lg`, `border border-border`, `bg-surface-2/60`
- Buttons: `rounded-lg`, semantic color per action (accent = primary, good/watch/kill = scale/pause/close), `active:scale-[0.98]` press feedback
- Status always paired with an icon/dot + text, never color alone (accessibility)
- `prefers-reduced-motion` respected globally in `index.css`
- Focus rings visible on all interactive elements (`*:focus-visible`)

## Change Log
- **2026-09-23** — Complete UI overhaul: new dark color system, Plus Jakarta Sans typography, restyled every component (header/nav, campaign sidebar, ad table, detail panel, recommendations, CSV import, manual entry grid, client settings). Added account-level summary strip (active ads / spend / leads / blended CPL / to-close / to-scale counts) to Dashboard. No changes to data logic, types, or the recommendation engine — visual layer only.
- **2026-09-22** — Vercel + Supabase connected. Fixed env vars not picked up on Production (Vite bakes `VITE_` vars at build time — had to add vars scoped to Production and redeploy without build cache).
- **2026-09-21** — Initial build: full app scaffolded (types, metrics engine, store with Supabase/localStorage dual backend, CSV import, manual entry, dashboard UI), pushed to GitHub, Supabase schema created with open RLS policies (no-auth single-user tool).

## Conventions for future work
- Keep this file updated: add a dated bullet under Change Log for every meaningful change (new feature, schema change, design change, bug fix)
- Data logic (types, metrics, store) and UI (components, pages) are separate concerns — when asked for a "UI change," don't touch `src/lib/`
- New components should use the existing token classes, not new hex values
