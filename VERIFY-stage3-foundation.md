# VERIFY — Stage 3 foundation (Tailwind v4 + shadcn/ui setup + AppShell)

Date: 2026-11-12 (local only). Folder: `~/workspace/etea-prep-next-stage3/`.
Status: **COMPLETE locally. NOT deployed, NOT merged.** Merge + deploy only after
Stage 2 passes live verification (owner's strict rule 1).

## 1. Isolation (owner's STRICT RULE 1)

- All work in `~/workspace/etea-prep-next-stage3/` only. `~/workspace/etea-prep-next/`
  was treated as READ-ONLY: no command in this batch wrote there (no npm install,
  no build, no edits). Its newest file is still 2026-11-12 07:22 UTC (Stage 2 work,
  before this session).
- Setup: rsync copy of the main folder excluding `node_modules`/`.next`; `diff -rq`
  confirmed identical before any change. `npm ci` inside the stage3 folder only
  (109 packages). Node v24.22.1, npm 10.9.4.
- The new suite `scripts/test-stage3.mjs` §14 asserts the isolation continuously:
  components.json, postcss.config.mjs, src/lib/utils.ts, src/components/ui/,
  AppShell/Sidebar/ShellTopbar, test-stage3.mjs are all ABSENT from the main folder,
  and the main package.json has no tailwindcss/motion/recharts. All isolation checks
  pass.
- No GitHub/Vercel/env changes. No deploy. No content/data/bank/API changes.

## 2. Baseline (before any change, stage3 folder)

- `npm run build` PASS (21 routes: 15 static + 6 dynamic).
- `npx tsc --noEmit` clean (strict).
- All 20 suites green: qa 52/52 + 19 test:* scripts = **799 checks, 0 failures**.

## 3. What was built

### 3.1 Tailwind CSS v4 — coexistence with the legacy design system

Files: `postcss.config.mjs` (new), `src/app/globals.css` (restructured, 324 lines).

Coexistence is enforced three ways (all verified in the built CSS, §6):

1. **NO preflight.** `src/app/globals.css:21-22`:
   ```css
   @import "tailwindcss/theme.css" layer(theme) prefix(tw);
   @import "tailwindcss/utilities.css" layer(utilities) prefix(tw);
   ```
   Preflight is deliberately NOT imported: its reset (body margin, h1–h3 sizes,
   button/input defaults, border styles) would override the hand-rolled design
   system. Importing theme + utilities only keeps every existing rule working
   while adding `@theme` tokens + utilities. The combined `layer()` + `prefix()`
   import modifiers were an open question — they work (build passes, utilities
   generate prefixed, layer order preserved).
2. **Prefix `tw`.** Generated utilities (`tw:flex`, `tw:bg-background`, …) can
   never collide with legacy class names (`.container`, `.grid`, `.card`,
   `.badge` are also Tailwind utility names). Theme variables are emitted with
   the prefix too (`--tw-color-brand-teal`, `--tw-font-sans`).
3. **Layer order.** `src/app/globals.css:13` declares
   `@layer theme, base, components, utilities;` BEFORE the imports (allowed by
   the CSS spec), and the ENTIRE legacy stylesheet is wrapped verbatim in
   `@layer base` (`:84`). The legacy portion was verified BYTE-IDENTICAL to the
   original by diff (extracted slice vs. saved original). Old pages use no
   Tailwind classes, so their rendering is unchanged; new shell utilities (later
   layer) win over base rules where they conflict (needed for shadcn Button vs.
   the global `button` rule).

`@theme` tokens (`:27-36`): `--color-brand-teal #09555e`,
`--color-brand-teal-dark #07424a`, `--color-brand-paper #fdfbf1`,
`--color-brand-amber #f5a10b`, `--color-brand-ink #1b272b`,
`--color-brand-muted #5a6b70`, `--color-brand-line #dfe7e5`, and
`--font-sans: var(--font-sans-arabic), "Noto Sans Arabic", system-ui, …`
(named `--font-sans` deliberately, to avoid colliding with next/font's
`--font-sans-arabic` variable).

Dark variant (`:82`): `@custom-variant dark (&:where([data-theme="dark"],
[data-theme="dark"] *));` — follows the site's OWN theme mechanism
(LangProvider sets `data-theme` on `<html>`), not the OS scheme.

### 3.2 shadcn/ui setup — theme mapping reuses the legacy variables

Files: `components.json` (new), `src/lib/utils.ts` (new),
`src/components/ui/{button,card,badge,input,skeleton}.tsx` (new).

- `components.json`: style new-york, rsc, tsx, css `src/app/globals.css`,
  cssVariables true, prefix `tw`, aliases `@/components`, `@/lib/utils`,
  `@/components/ui`, `@/lib`, `@/hooks`, iconLibrary lucide.
- `@theme inline` mapping (`globals.css:48-73`) references the LEGACY variables
  where the meaning matches: background→`var(--paper)`, foreground→`var(--ink)`,
  card/popover→`var(--card)`, primary→`var(--teal)`, accent→`var(--amber)`,
  destructive→`var(--red)`, border/input→`var(--line)`, muted-foreground→
  `var(--muted)`. The existing `[data-theme="dark"]` block therefore drives BOTH
  systems from one source of truth. Only variables with no legacy equivalent are
  newly defined in `:root` / dark blocks (`:86-107`): `--secondary`,
  `--muted-surface`, `--destructive-foreground`, `--ring`, `--chart-1..5`.
- **Naming-collision trap found and avoided:** legacy `--muted` is the muted TEXT
  color (#5a6b70 / #9fb3b5), while shadcn's `muted` is a SURFACE. Redefining
  `--muted` to a surface color would have made `.muted` text invisible. The
  mapping uses `--muted` for muted-foreground and the new `--muted-surface` for
  the surface. A test asserts `--muted` is never redefined as a surface.
- `cn()` (`src/lib/utils.ts:13-17`): clsx + PLAIN `twMerge`. Verified
  empirically: plain twMerge dedupes `tw:`-prefixed classes correctly
  (`twMerge("tw:p-4 tw:p-8")` → `"tw:p-8"`). `extendTailwindMerge({ prefix })`
  was tested and BREAKS deduping for the v4 namespace syntax (it is the v3
  dash-prefix option; it kept both conflicting classes). Documented in the file.
- Primitives: shadcn new-york style, every utility `tw:`-prefixed. Two
  no-preflight consequences handled explicitly:
  - Every bordered primitive carries an EXPLICIT border color (no preflight
    border-color default exists; the CSS default `currentColor` would draw
    ink-strength borders). Button base uses `border-transparent` so the legacy
    teal button border cannot show through ghost/secondary/link variants; Card
    uses `border-border`; Input uses `border-input`.
  - Badge: pill shape (matches the legacy `.badge` look) and destructive uses
    `text-destructive-foreground` instead of white (dark-mode destructive is
    the bright B04 red whose passing foreground is dark #3d0a06).
- No Radix Slot / `asChild` tonight: links that look like buttons use the
  exported `buttonVariants()` directly (Sidebar "Review now" link). Adding
  `@radix-ui/react-slot` is a one-line change for a later batch if needed.
  (A first draft of badge.tsx imported `Slot` from `react` — not a real export;
  caught and fixed before any build; tsc is clean.)
- All five primitives are USED by the shell (no dead demo routes).

### 3.3 AppShell — home page only (proof of concept)

Files: `src/components/AppShell.tsx` (96 lines), `src/components/Sidebar.tsx`
(257 lines), `src/components/ShellTopbar.tsx` (67 lines);
`src/app/layout.tsx` composes through `<AppShell>` (`:47`); font block,
metadata, and `<TelemetryListener />` untouched.

- `AppShell.tsx:86`: `if (pathname === "/")` → new shell; otherwise the legacy
  chrome (`<Nav />` + `<main className="container">` + `<Footer />`), identical
  to today. Migrating the remaining pages is the NEXT batch.
- Sidebar: the same 14 links as Nav (same hrefs, same i18n keys,
  `Sidebar.tsx:53-68`) with lucide icons; nav-filter Input; due-today Card
  (FSRS-7 badge, Skeleton while loading, `countDueFlashcards(FLASHCARDS)` —
  same call as the home page); persisted collapse via `safeRead`/`safeWrite`
  key `etea_sidebar_collapsed` (`AppShell.tsx:24,36,42`), read after mount (no
  hydration mismatch); mobile drawer with overlay, Escape-to-close + focus
  return to the hamburger (`Sidebar.tsx:103-108`, mirroring Nav's B02 pattern),
  focus on the close button when opened; `aria-current="page"` (`:183`),
  `aria-expanded`/`aria-controls` on the collapse toggle, aria-label + title on
  icon-only rail links; skip link to `#shell-main` (`AppShell.tsx:53`).
- RTL: logical properties (`tw:start-0`, `tw:border-e`, `tw:ms-auto`) so the
  drawer docks to the right in Urdu mode automatically; the off-canvas
  translate direction is chosen in JS from the language
  (`Sidebar.tsx:117`: `lang === "ur" ? "tw:translate-x-full" :
  "tw:-translate-x-full"`); the collapse chevron flips via the plain-CSS
  `.shell-flip-rtl` rule (`globals.css:297`). `tw:dark:` / `tw:rtl:` variants
  were deliberately NOT used in shell code (semantic tokens + logical
  properties suffice) — but the scratch build (§5) proved they work with
  prefix-first ordering, so later batches may use them.
- Topbar: sticky, backdrop blur; mobile hamburger (`aria-controls=
  "app-sidebar"`, `ShellTopbar.tsx:31`); mobile brand; language `<select>` and
  theme toggle calling the EXISTING `setLang`/`setTheme` (`:48,:58`) with the
  same option labels as Nav. The existing i18n + theme systems are NOT replaced.
- Footer renders unchanged inside the shell content column.

### 3.4 i18n — 8 new keys, system intact

`src/lib/i18n.tsx:59-66`: `sidebarCollapse`, `sidebarExpand`,
`sidebarNavFilter`, `sidebarNavFilterLabel`, `closeMenu`, `skipToContent`,
`reviewNow`, `noNavResults` — all with en + roman + ur, in the exact 2-space
STRINGS format. `t()`/`tf()` implementations untouched. "FSRS-7" is a version
literal (ID/code), not translated — same exception class as proper names.
Key count: 423 → 431.

### 3.5 Fonts — Noto Sans Arabic ONLY

Zero cancelled-font references anywhere under `src/` (test-enforced, comments
included — `test-fonts` + `test-stage3` §6 both pass). No font changes: the
inherited next/font/google setup is untouched, and `@theme` references the
existing `--font-sans-arabic` variable. No external font URLs in `src/`.

## 4. Dependencies (installed versions, observed 2026-11-12)

| Package | Version | Role |
|---|---|---|
| tailwindcss | 4.3.5 | devDep — v4, PostCSS plugin route |
| @tailwindcss/postcss | 4.3.5 | devDep — Next.js 16 integration |
| class-variance-authority | 0.7.1 | dep — primitive variants |
| clsx | 2.1.1 | dep — cn() |
| tailwind-merge | 3.7.0 | dep — cn() (plain twMerge, see §3.2) |
| lucide-react | 1.72.0 | dep — shell + primitive icons |
| motion | 14.12.0 | dep — INSTALLED + BUILD-VERIFIED ONLY, no shipped usage |
| recharts | 3.10.1 | dep — INSTALLED + BUILD-VERIFIED ONLY, no shipped usage |
| next / react / typescript | 16.4.6 / 19.3.1 / 5.9.3 | unchanged (inherited) |

No peer conflicts, no version pins needed, no config workarounds. `motion/react`
export verified present; motion peers react ^18||^19; recharts peers react
^16.8–19. Nothing was left uninstalled; nothing is broken.

## 5. Dependency de-risk — scratch build (file deleted after)

A temporary route `src/app/__scratch/page.tsx` (deleted after the check; its
absence is test-enforced) imported `motion/react` + `recharts`, rendered a
`<motion.div>` wrapping a minimal `<BarChart>`, and used one `tw:dark:` and one
`tw:rtl:` class. Results:

- Build PASSED with motion + recharts bundled and SSR-rendered. No client-only
  workaround needed for a basic chart render.
- `tw:dark:bg-red-500` generated
  `.tw\:dark\:bg-red-500:where([data-theme=dark],[data-theme=dark] *){…}` —
  prefix-first ordering works, custom dark variant scopes to the site's own
  `data-theme` mechanism.
- `tw:rtl:text-left` generated a `[dir=rtl]`-scoped rule — prefix-first
  ordering works for `rtl:` too.
- After deleting the scratch route, the final build passed again with the
  original route count (20 static pages generated; no `__scratch` route).

No motion/recharts imports ship in `src/` tonight (test-enforced, §3.2).

## 6. Verification

### 6.1 Build + types
- `npm run build` PASS (final build after scratch removal).
- `npx tsc --noEmit` clean (strict).

### 6.2 Suites — 928 checks, 0 failures (baseline 799 → final 928)
All 21 suites green (qa + 20 test:*). The 19 pre-existing suites produce
exactly the baseline 799 checks (unchanged); the new `test:stage3` adds 129.

| Suite | Result |
|---|---|
| qa | 52/52 |
| test:scoring / reviews / retrieval / fallback / timeouts / storage / lang / guard | all pass |
| test:tier4 / provenance / backup / telemetry / fonts / i18n / rtl / trilanguage | all pass |
| test:fsrs / flashcards / markdown | all pass |
| test:stage3 (NEW, 129 checks) | ALL PASS |

Notably: test:i18n, test:rtl, test:fonts, and test:tier4 all pass WITH the new
shell code, the 8 new keys, and the restructured globals.css — the coexistence
design did not disturb any exact-string assertions those suites rely on.

`scripts/test-stage3.mjs` (259 lines) asserts: file existence; dependency
versions; shadcn/PostCSS config; CSS coexistence (theme+utilities imports, no
bare tailwind import, no preflight import, prefix, layer order, @theme tokens,
@custom-variant, @theme inline mapping, legacy rules, shell helpers); zero
cancelled-font refs in src/; the 8 shell i18n keys with ur; all 14 sidebar
links + a11y + RTL + primitive usage; AppShell pathname switch + skip link +
persistence; Topbar controls; layout composition; no shipped motion/recharts
imports; no scratch route; built-CSS assertions (prefixed utility, brand token,
font variable, legacy rule, NO preflight signatures, logical utility); and the
§1 isolation checks.

Two test bugs found by running the suite (both fixed IN THE TEST, not the
source): the "no extendTailwindMerge" check tripped on utils.ts's own comment
explaining why not to use it (now asserts the exact import line), and the "no
preflight import" check tripped on globals.css comments (now asserts no
`tailwindcss/preflight` import).

### 6.3 Built + served CSS (chunk `2swstapmrvjl9.css`, 40,216 bytes)
- Prefixed utilities present: `.tw\:flex{display:flex}`,
  `.tw\:bg-background,.tw\:bg-background\/80{background-color:var(--paper)}`
  (Lightning CSS merges equal declarations),
  `.tw\:text-brand-teal{color:var(--tw-color-brand-teal)}`,
  `.tw\:font-sans{font-family:var(--tw-font-sans)}`.
- Brand tokens emitted: `--tw-color-brand-teal:#09555e`,
  `--tw-font-sans:var(--font-sans-arabic), …`.
- `@theme inline` works: `border-color:var(--line)` for border-border/input;
  `color-mix(in oklab, var(--paper) 80%, transparent)` for bg-background/80.
- Logical utilities present: `.tw\:start-0{inset-inline-start:…}`,
  `.tw\:border-e{border-inline-end-…}`, `.tw\:ms-auto{margin-inline-start:auto}`.
- Legacy rules intact: `max-width:1020px`, `.nav-toggle{display:none}`,
  `.topbar{…}`, `h1,h2,h3{font-family:var(--font-sans-arabic)…}`.
- NO preflight: no `font-size:inherit;font-weight:inherit` heading reset, no
  `border:0 solid` universal reset, no transparent-button reset. (Two apparent
  markers investigated and cleared: `file-selector-button` appears only in the
  Input's own `tw:file:*` utilities; `::backdrop` appears only in Tailwind's
  theme-layer variable defaults; `*{box-sizing:border-box}` is the LEGACY
  rule at old line 26, preserved verbatim.)
- Layer order preserved in output (`@layer theme;@layer base` … `@layer
  components,utilities;` — Lightning CSS splits the declaration, order intact).
- Same CSS verified over HTTP from the prod server (identical bytes).

### 6.4 Local prod server (`next start`, port 3100, stopped after)
- HTTP 200: all 14 page routes + `/tracks/1` + `/mock/1`. (`/topics/1` → 404:
  no such route exists in src/app — correct, not a regression.)
- Home HTML: `id="app-sidebar"`, `id="shell-main"`, skip link, all 14 sidebar
  links (13 non-home hrefs + home), filter input with translated placeholder,
  FSRS-7 due card, "Cards due today" title, language select + theme toggle
  (aria-labels), 2× `aria-controls="app-sidebar"`, footer text — and NO legacy
  topbar.
- `/library` HTML: legacy Nav (`id="main-nav"`, `class="topbar"`) present, NO
  sidebar — the pathname switch works as designed.
- No key material anywhere in the folder: only `.env.example` (inherited
  template); no key-like patterns in source; the only API-key NAME mentions are
  user-facing error strings in inherited `src/lib/ai.ts` (names only, no
  values). No key material was written by this batch.

## 7. Before / after

| Area | Before | After (stage3 folder only) |
|---|---|---|
| CSS system | Hand-rolled globals.css only | + Tailwind v4 (no preflight, `tw:` prefix, layered); legacy rules byte-identical |
| Components | Nav + Footer + pages | + shadcn primitives (button/card/badge/input/skeleton) + AppShell/Sidebar/Topbar |
| Home page chrome | Legacy topbar Nav | New sidebar shell (desktop rail + mobile drawer) |
| Other pages | Legacy Nav | Unchanged (legacy Nav) |
| i18n keys | 423 | 431 (+8 shell keys) |
| Dependencies | 12 (incl. ts-fsrs) | +8 (tailwindcss, @tailwindcss/postcss, cva, clsx, tailwind-merge, lucide-react, motion, recharts) |
| Test suites | 20 suites / 799 checks | 21 suites / 928 checks |
| Fonts | Noto Sans Arabic only | Unchanged (zero cancelled-font refs) |
| Content / bank / API | — | Unchanged |

## 8. What remains for the next Stage 3 batch (after Stage 2 deploys + passes)

1. **Merge** this folder into main (owner go-ahead required) + single-commit
   deploy via the GitHub connector; live-verify.
2. **Migrate remaining 13 pages** to the shell (remove the pathname switch in
   `AppShell.tsx:86`; keep or retire the legacy Nav — owner decision).
3. **Browser checks** (cannot be done by a subagent; parent/owner post-deploy):
   sidebar at 360px, collapse/expand rail, Escape + focus return, keyboard
   navigation through the rail, theme/language switching, RTL drawer direction
   on a real device, due-card count vs. the flashcards page.
4. **Animations** (motion): page transitions, 3D flashcard flip. De-risked:
   `motion/react` bundles + SSR-renders; `tw:dark:`/`tw:rtl:` ordering settled.
5. **Charts** (recharts): radar/line/donut on /analysis + Command Center.
   De-risked: basic BarChart bundles + SSR-renders.
6. **Command Center** dashboard content on the home page (stats, charts,
   quick actions) using the new primitives.
7. **Optional:** `@radix-ui/react-slot` + `asChild` on Button/Badge if a later
   primitive needs it; `tw:dark:` variants now proven usable.
8. Known non-blockers carried forward: the `tw:bg-background/80` color-mix
   fallback relies on modern browsers (graceful: the plain `var(--paper)`
   fallback rule is emitted first); the mobile drawer filter is hidden when
   the persisted state is collapsed AND the drawer is closed (by design —
   content follows `effectiveCollapsed`).

## 9. Files changed (stage3 folder only)

NEW: `postcss.config.mjs`, `components.json`, `src/lib/utils.ts`,
`src/components/ui/button.tsx`, `src/components/ui/card.tsx`,
`src/components/ui/badge.tsx`, `src/components/ui/input.tsx`,
`src/components/ui/skeleton.tsx`, `src/components/AppShell.tsx`,
`src/components/Sidebar.tsx`, `src/components/ShellTopbar.tsx`,
`scripts/test-stage3.mjs`, `VERIFY-stage3-foundation.md` (this file).
MODIFIED: `src/app/globals.css`, `src/app/layout.tsx`, `src/lib/i18n.tsx`,
`package.json`, `package-lock.json`, `CHANGELOG.md`.
DELETED (temporary, after verification): `src/app/__scratch/page.tsx`.
TOUCHED NOWHERE ELSE. Nothing in `~/workspace/etea-prep-next/` was modified.
