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
- `src/lib/types.ts` — core data shapes (Client, Campaign, AdSet, Ad, DailyEntry — AdSet and Ad both carry a `notes: string | null` free-text field) + derived metrics shapes (AdMetrics, Recommendation, FlagLevel)
- `src/lib/metrics.ts` — recommendation engine (kill/scale/review/monitor logic, CPL trend, flag thresholds) + `mergeEntriesByDate()` which collapses multiple ads' entries into one per-date series for ad-set-level trend charts
- `src/lib/store.ts` — data layer, dual backend (Supabase when env vars present, else localStorage). `importParsedRows()` groups CSV rows per ad first so it can resolve each ad's true earliest date before creating/backfilling it, and only writes entries for dates that don't already exist (re-uploads never overwrite a day you already have)
- `src/lib/csvParser.ts` — Meta Ads Manager CSV/paste parser with column-alias matching
- `src/lib/supabase.ts` — Supabase client init, `supabaseConfigured` flag
- `src/pages/Dashboard.tsx` — main 3-column view (campaigns → ad sets/ads → detail panel) + recommendations strip. Expanding an ad set also shows its notes, a mini "which ads to scale/pause/close and why" summary, and an ad-set-level CPL trend chart
- `src/components/` — StatusBadge, Sparkline, AdDetailPanel, RecommendationsPanel, DataImport, ManualEntryGrid, ClientSettings, NotesField (auto-saving textarea used for ad set / ad notes)
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
- Buttons: `rounded-lg`, semantic color per action, `active:scale-[0.98]` press feedback
- Status always paired with an icon/dot + text, never color alone (accessibility)
- `prefers-reduced-motion` respected globally in `index.css`
- Focus rings visible on all interactive elements (`*:focus-visible`)

## Change Log
- **2026-09-23 (3)** — Recommendation engine simplified: disabled the "3x your best-performing ad in the account" relative kill rule and the "zero results after spending 2x your good-CPL target" rule. Both were producing close calls the user didn't want right now (e.g. "27.9x your best ad" felt too aggressive/opaque). `recommend()` in `src/lib/metrics.ts` now relies only on: the absolute kill threshold (Client Settings → Watch ceiling), frequency fatigue (>2.5), CPL trend for scale/review, and the insufficient-data monitor case. `bestCplInAccount` is still threaded through `buildAdMetrics`/`Dashboard.tsx` (harmless, unused) in case the relative-kill rule is turned back on later — nothing else changed.
- **2026-09-23 (2)** — Import/data-model fixes + ad-set-level views:
  - Fixed a layout bug where the Scale/Pause/Close buttons on `AdDetailPanel` overlapped the stats grid. Removed those buttons for now (not needed day-to-day) — status is still changed by re-uploading data or, if needed later, a future dropdown.
  - `Ad.first_active_date` is now the true earliest date seen for that ad across an import (grouped per-ad before resolving), not just whichever CSV row happened to come first. If a later upload reveals an even earlier date for an ad that already exists, its `first_active_date` is backfilled.
  - CSV import no longer overwrites a date that already has an entry for an ad — only genuinely new dates get written. `importParsedRows()` now also returns `duplicatesSkipped`.
  - Added `notes` (free text) to both `AdSet` and `Ad` — editable via a small auto-saving textarea (`NotesField`), for "what is this ad set testing" / "what's this creative about."
  - Expanding an ad set on the Dashboard now shows: its notes, a mini recommendations summary (which ads in that set should scale/pause/close and why), and an ad-set-level CPL trend chart aggregating all its ads (`mergeEntriesByDate`).
  - Supabase schema updated: `notes text` column added to `ad_sets` and `ads`. **Action needed**: run the migration block at the bottom of `supabase/schema.sql` in the Supabase SQL editor (`alter table ad_sets/ads add column if not exists notes text;`) since the live database predates this change.
- **2026-09-23** — Complete UI overhaul: new dark color system, Plus Jakarta Sans typography, restyled every component (header/nav, campaign sidebar, ad table, detail panel, recommendations, CSV import, manual entry grid, client settings). Added account-level summary strip (active ads / spend / leads / blended CPL / to-close / to-scale counts) to Dashboard. No changes to data logic, types, or the recommendation engine — visual layer only.
- **2026-09-22** — Vercel + Supabase connected. Fixed env vars not picked up on Production (Vite bakes `VITE_` vars at build time — had to add vars scoped to Production and redeploy without build cache).
- **2026-09-21** — Initial build: full app scaffolded (types, metrics engine, store with Supabase/localStorage dual backend, CSV import, manual entry, dashboard UI), pushed to GitHub, Supabase schema created with open RLS policies (no-auth single-user tool).

## Conventions for future work
- Keep this file updated: add a dated bullet under Change Log for every meaningful change (new feature, schema change, design change, bug fix)
- Data logic (types, metrics, store) and UI (components, pages) are separate concerns — when asked for a "UI change," don't touch `src/lib/`
- New components should use the existing token classes, not new hex values
