# VERIFY — Stage 4A: PWA (manifest + service worker + install/offline UI)

Local batch, 2026-11-14. PWA ONLY — no audio feature was built in
this batch (the audio approach is a separate, later batch). No push,
deploy, GitHub, Vercel, or env change was made; the parent handles the
single push + deploy + live browser verification.

## §1 Baseline and backup

- Backup: `~/workspace/etea-prep-next-backup-pre-stage4/` (rsync,
  excluding node_modules/.next); empty diff confirmed before work.
- Baseline (re-run before changes): `npm run build` PASS,
  `npx tsc --noEmit` clean, **2377 checks / 31 suites, 0 failures**.
- Final: `npm run build` PASS, `npx tsc --noEmit` clean (strict),
  **2477 checks / 32 suites, 0 failures** (+100, new
  `scripts/test-stage4a-pwa.mjs`). Zero `nastaliq` in `src/`.

## §2 What changed, and why it is shaped this way

### 2.1 Manifest + icons (new: `public/`)

- `public/manifest.webmanifest` — name "ETEA Prep Library",
  short_name "ETEA Prep", `start_url`/`scope` "/", `display`
  standalone, `theme_color` #09555E, `background_color` #FDFBF1
  (the site's actual brand colours, asserted against
  `src/app/globals.css` brand vars), icons 192 + 512 + maskable 512.
- `public/icons/icon-192.png`, `icon-512.png`,
  `icon-maskable-512.png` — script-generated with PIL 10.2.0 + DejaVu
  Sans Bold (no external image downloads, no Pakhtunkhwa Insider
  branding): teal field, open-book glyph with amber spine, "ETEA"
  wordmark, amber underline. The maskable artwork sits inside the 80%
  safe zone. All three verified as valid PNGs with correct
  dimensions and non-trivial sizes (9,030 / 4,730 / 4,209 bytes).
  The 512px icon was visually inspected.
- `src/app/layout.tsx:33-54` — metadata `manifest`,
  `appleWebApp` (capable, title "ETEA Prep"), PNG + apple touch
  icons, `viewport.themeColor #09555E`. (Next 16 emits
  `mobile-web-app-capable`, honoured by Safari 15+; the iOS hint text
  covers the Add to Home Screen flow regardless.)

### 2.2 Service worker (new: `public/sw.js`, hand-written)

No next-pwa, no Serwist — the worker is plain JS, `node --check`
clean. Suite-asserted: no `self.__WB_MANIFEST`, no Serwist/Workbox
dependency.

Cache strategy table (all same-origin GET only; non-GET and
cross-origin pass through untouched):

| Request | Strategy | Why |
|---|---|---|
| `/api/*` (tutor, explain, plan, health) | NETWORK-ONLY (no `respondWith`) | AI responses must never be cached or stale; the app's own Retry + offline-library-search handles failure |
| `/_next/static/*` | Cache-first, cached on fetch | Hashed, immutable build assets — **including the JS chunks that carry the bundled study data** (see below) |
| Navigations (`mode: navigate`) | Network-first → cache → cached `/` | Online loads always get fresh HTML; cache is the offline fallback; home is the last-resort offline page |
| Other same-origin GET (RSC payloads, manifest, icons, fonts) | Stale-while-revalidate | Instant render, background refresh |

**Why chunk caching IS the offline data cache (key finding):**
`src/lib/data.ts` statically imports `content.json` and all 16 bank
files (arabic, drawing, english, gk, islamiyat, it, maths,
pakstudies, pastpapers, pastpapers_reworded, pe, pedagogy, science,
socialstudies, tajweed, urdu) — the raw JSON files are NEVER served
as URLs, so they cannot be precached by URL. The data is bundled
into the hashed JS chunks, and caching `/_next/static/*` caches the
data with them. The suite asserts all 17 static imports and that the
data layer performs no `fetch()`. (`drawing_pe.json` stays on disk
unimported — comments + legacy keys only; asserted.)

- Precache (install, best-effort via `Promise.allSettled` so one
  failed URL cannot fail the install): the 14 static routes
  (`/`, `/analysis`, `/flashcards`, `/issues`, `/library`, `/links`,
  `/mock`, `/plan`, `/practice`, `/review`, `/topics`, `/tracks`,
  `/tutor`, `/vacancies`) + manifest + 3 icons. Dynamic routes
  (`/mock/[id]`, `/tracks/[id]`) are cached at runtime by the
  navigation handler.
- Versioned cache: `CACHE_VERSION = "etea-prep-v1"`. Activation
  deletes every other cache and calls `clients.claim()`.
  MAINTENANCE NOTE: bump the version string when a deploy changes the
  shell in a way old cached HTML must not survive (the file is
  static; there is no build-time injection).
- **No forced reloads:** the worker does NOT call `skipWaiting()`
  on install (suite-asserted: exactly one `skipWaiting()` call, inside
  the `SKIP_WAITING` message handler). A new version installs, waits,
  the app shows the update notice, and only the user's Refresh click
  posts `SKIP_WAITING`. Only successful (`ok`, `basic`) responses are
  cached.
- `next.config.mjs:39` — `/sw.js` is served
  `Cache-Control: no-store`, so the browser always checks for a new
  worker (a cached sw.js would pin the old version indefinitely).
- **Offline honesty:** offline use works after the FIRST ONLINE
  visit (the visit that installs the worker and caches the chunks).
  A first-ever visit with no connection cannot load the app.

### 2.3 Install / offline / update UI (new + wired)

- `src/components/PwaProvider.tsx` (new) — registers `/sw.js` on
  window load (never competing with first paint); captures
  `beforeinstallprompt` (`preventDefault`, stored, fired only on the
  user's Install click); standalone detection
  (`display-mode: standalone` + iOS `navigator.standalone`); iOS
  detection (UA + iPadOS touch check) for the home-screen hint;
  persisted dismissal (`etea_pwa_install_dismissed` via
  `safeRead`/`safeWrite` — dismissing hides the affordance
  permanently, never nagging); `online`/`offline` event tracking;
  waiting-worker state (`reg.waiting` + `updatefound`) with a
  `controllerchange` reload guarded by a ref so ONLY the user's own
  skipWaiting reloads the page. Registration failure degrades
  silently to online-only — it can never break the app. Everything
  is mount-gated (SSR-safe defaults, no hydration mismatch).
- `src/components/PwaInstall.tsx` (new) — sidebar install block:
  Install button (Chromium/Android) or the Share → Add to Home
  Screen instruction (iOS Safari, which has no prompt API), plus a
  dismiss control. Renders nothing when installed, dismissed,
  unmounted, or when no install path exists — never a popup.
- `src/components/PwaUpdateBanner.tsx` (new) — the update notice in
  the shell's main area (legacy `.alert` style, next to the storage
  banners). Refresh / Later; Later hides it for the visit only.
- `src/components/AppShell.tsx:95,132,174` — wraps the whole shell
  in `PwaProvider`; renders `<PwaUpdateBanner />` above the page.
- `src/components/ShellTopbar.tsx:23,56` — mount-gated Offline badge
  (WifiOff icon + `pwaOfflineBadge`), visible on every page.
- `src/components/Sidebar.tsx:320` — `{!collapsed && <PwaInstall />}`
  below the due-cards card (expanded sidebar only; the collapsed rail
  has no room). The drawer focus trap is unaffected (the block only
  adds focusable elements when an install path exists, and the trap
  queries the live DOM).
- `src/app/tutor/page.tsx:90,294` — a clear "needs internet" banner
  (`pwaOfflineTutor`) when offline, above the health panel. The
  offline library search and failure recovery are untouched — the
  banner only states the live-AI limit honestly.
- `src/lib/i18n.tsx:104-133` — 10 new keys, all en + roman + ur:
  `pwaInstallTitle`, `pwaInstallBody`, `pwaInstallButton`,
  `pwaInstallDismiss`, `pwaIosHint`, `pwaOfflineBadge`,
  `pwaOfflineTutor`, `pwaUpdateAvailable`, `pwaUpdateRefresh`,
  `pwaUpdateDismiss` (en+ur enforced by test-i18n).

### 2.4 No regressions / scope guards

- NO bank/data changes: `src/data/**` byte-identical to the backup.
- NO changes to scoring, FSRS, flags, review, or tutor logic
  (tutor diff = the banner + import only).
- Noto Sans Arabic only; no new dependencies (`package.json` diff =
  the test script only).
- The SW contains no audio code (suite-asserted) — this batch is
  PWA-only, per the brief.

## §3 Files changed (diff vs `~/workspace/etea-prep-next-backup-pre-stage4/`)

Changed (9): `CHANGELOG.md`, `next.config.mjs`, `package.json`,
`src/app/layout.tsx`, `src/app/tutor/page.tsx`,
`src/components/AppShell.tsx`, `src/components/ShellTopbar.tsx`,
`src/components/Sidebar.tsx`, `src/lib/i18n.tsx`.
New (10): `public/manifest.webmanifest`, `public/sw.js`,
`public/icons/icon-192.png`, `public/icons/icon-512.png`,
`public/icons/icon-maskable-512.png`,
`scripts/test-stage4a-pwa.mjs`, `src/components/PwaProvider.tsx`,
`src/components/PwaInstall.tsx`, `src/components/PwaUpdateBanner.tsx`,
`VERIFY-stage4a-pwa.md` (this file). Deleted: 0.

## §4 Local prod-server verification (port 3107, stopped after)

- All 14 routes + `/manifest.webmanifest` + `/sw.js` + 3 icons:
  **HTTP 200** (19/19).
- `/sw.js` headers: `Cache-Control: no-store`,
  `Content-Type: application/javascript; charset=UTF-8`. ✓
- `/manifest.webmanifest` headers: `Content-Type:
  application/manifest+json` (Next serves it natively — no extra
  header rule needed). ✓
- `/icons/icon-192.png`: `Content-Type: image/png`. ✓
- Home HTML carries: `<link rel="manifest">`, `<meta
  name="theme-color" content="#09555E">`, `<link
  rel="apple-touch-icon">`, `mobile-web-app-capable` +
  `apple-mobile-web-app-title` metas, and the unchanged counts
  "763 MCQs · 151 notes · 70 flashcards · 12 teaching post tracks ·
  16 mocks". ✓
- `node --check public/sw.js`: syntax OK. ✓

## §5 What could NOT be verified locally (for the live browser check)

No headless browser exists on this machine (no Chromium binary, no
Playwright/Puppeteer), so the following were verified by code +
headers only and MUST be covered by the parent's live browser pass
after deploy:

1. SW registration: `navigator.serviceWorker` shows `/sw.js`
   registered + activated, and the Cache Storage holds `etea-prep-v1`
   with the 14 routes + manifest + icons after the first load.
2. Offline round-trip: load the site online (all chunks cached),
   then go offline and navigate Library → a note, Flashcards →
   grade a card, Practice → answer a question. All must work.
   The tutor page must show the `pwaOfflineTutor` banner and the
   topbar must show the Offline badge while offline.
3. Install: on Chromium/Android the sidebar shows the Install
   block; clicking Install fires the browser prompt; dismissing
   hides it permanently; after installing, the block is gone.
4. Update notice: after a LATER deploy, a waiting worker must
   surface the "new version" banner with working Refresh (reloads
   once, new version active) and Later (hides for the visit).
   (Cannot be tested on the first deploy — there is no prior worker.)
5. iOS hint: on Safari (no prompt API) the sidebar shows the
   Share → Add to Home Screen instruction instead of the button.
   (Desktop browser check: only the code path + absence of the
   button can be confirmed; real iOS behaviour needs the owner's
   phone or an iOS simulator.)

## §6 Judgment calls (flagged, reversible)

1. **No unconditional `skipWaiting()`** — the brief asked for both
   skipWaiting and a waiting notice; these conflict unless
   skipWaiting is user-triggered. Implemented user-triggered via the
   `SKIP_WAITING` message (the standard pattern). Reversible by
   adding `self.skipWaiting()` to install (not recommended).
2. **Install dismissal is permanent** (until storage is cleared) —
   the least-nagging reading of "don't re-show naggingly".
   Reversible by storing a timestamp and re-showing after N days.
3. **Precache is best-effort** (`allSettled`) — a flaky first load
   must not fail the install; runtime caching fills gaps.
4. **No build-time precache manifest** — hand-written SW per the
   brief; hashed chunk names are unknowable at author time, so chunks
   are runtime-cached. This is why offline needs one prior online
   visit (§2.2).
