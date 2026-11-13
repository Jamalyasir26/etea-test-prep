# VERIFY-stage3-merge.md — Stage 3 merge into the production folder

Owner approved "merge + deploy" 2026-11-13 ~12:39 PKT. This report covers the
MERGE + LOCAL VERIFICATION ONLY. The GitHub push (approval card), Vercel
deploy, and live browser verification are separate steps handled afterwards.

Source of truth: `~/workspace/etea-prep-next-stage3/` (Stage 2 + Localization
+ Stage 3 foundation + Stage 3 part 2). The stage3 folder was NOT modified by
this merge; it stays as the Stage 3 record.

## Step 0 — Backup (verified)

- Backup: `~/workspace/etea-prep-next-backup-pre-stage3-merge/` (excludes
  `node_modules`, `.next`, `tsconfig.tsbuildinfo`).
- Verified: `diff -rq` (same exclusions) between the backup and the main
  folder returned EMPTY before the sync. The backup is a byte-identical copy
  of the pre-merge production tree.

## Step 1 — Does the connector push route support file deletions? NO

Read `/opt/hatch/connectors/github/references/snapshot-push.md`. It states a
snapshot push is for "a snapshot commit creating or updating UTF-8 files,
**without deletions**, local Git history, tags, branches, file modes,
symlinks, or binary contents", and that "omitting deleted tracked files
leaves their GitHub copies in place". The `push_files` route therefore
CANNOT delete files from the repo. This decides Step 3.

## Step 2 — Merge

`rsync -a` from the stage3 folder into `~/workspace/etea-prep-next/`
(excluding `node_modules`, `.next`, `tsconfig.tsbuildinfo`; no scratch/temp
files existed in the stage3 tree). Post-sync verification: `diff -rq` (same
exclusions) between the merged folder and the stage3 folder returned EMPTY —
the merged tree is byte-identical to the stage3 folder. `npm install` after
the sync did not modify `package-lock.json` (re-diff still empty).

## Step 3 — Legacy Nav decision: KEEP (dead code, documented)

- The retired component is `src/components/Nav.tsx` (identical in both trees;
  it was never modified by Stage 3 work).
- Verified ZERO imports/usages anywhere in `src/`: no `from ... Nav` import
  and no `<Nav>` usage in any file except `Nav.tsx` itself. The only mentions
  are comments (AppShell.tsx, Sidebar.tsx, layout.tsx, i18n.tsx section
  header). `src/app/layout.tsx` imports `AppShell`, not `Nav`.
- Because the push route cannot delete (Step 1), `Nav.tsx` is KEPT in the
  main folder so the local tree matches what the repo will hold after the
  push. Deleting it locally would create local/repo divergence. Deleting it
  from the repo later requires a deletion-capable route (GitHub web-UI file
  delete or a git client) — a follow-up, not part of this push.

## Step 5 — Push manifest (recomputed AFTER this report was written)

Diff of the merged tree vs the Step 0 backup, excluding `node_modules`,
`.next`, `tsconfig.tsbuildinfo`. The parent pushes EXACTLY these 31 files.
Deleted: NONE.

### Changed (14)

- CHANGELOG.md
- package-lock.json
- package.json
- scripts/test-flashcards.mjs
- scripts/test-i18n.mjs
- scripts/test-tier4.mjs
- src/app/analysis/page.tsx
- src/app/flashcards/page.tsx
- src/app/globals.css
- src/app/layout.tsx
- src/app/page.tsx
- src/app/review/page.tsx
- src/lib/i18n.tsx
- src/lib/tracking.ts

### New (17, including this report)

- VERIFY-stage3-foundation.md
- VERIFY-stage3-part2.md
- VERIFY-stage3-merge.md (this report)
- components.json
- postcss.config.mjs
- scripts/test-stage3.mjs
- src/components/AnalysisCharts.tsx
- src/components/AppShell.tsx
- src/components/ShellTopbar.tsx
- src/components/Sidebar.tsx
- src/components/motion.tsx
- src/components/ui/badge.tsx
- src/components/ui/button.tsx
- src/components/ui/card.tsx
- src/components/ui/input.tsx
- src/components/ui/skeleton.tsx
- src/lib/utils.ts

### Deleted (0)

None. `src/components/Nav.tsx` is intentionally kept (see Step 3).

Every difference vs the backup is Stage 3 foundation + part 2 content; no
other file changed. Total: 14 changed + 17 new + 0 deleted = 31 files.

## Step 4 — Verification of the merged tree

All commands run in `~/workspace/etea-prep-next/`.

- `npm install`: exit 0 (Tailwind v4, motion, recharts, shadcn deps added
  per the merged `package.json`).
- `npm run build`: PASS. 21 routes (+ `/_not-found`): `/`, `/analysis`,
  `/flashcards`, `/issues`, `/library`, `/links`, `/mock`, `/mock/[id]`,
  `/plan`, `/practice`, `/review`, `/robots.txt`, `/topics`, `/tracks`,
  `/tracks/[id]`, `/tutor`, `/vacancies`, plus 4 API routes.
- `npx tsc --noEmit` (strict): exit 0, clean.
- Node suites: **21 of 21 suites fully green (974 checks, 0 failures)** —
  qa 52/52 plus all `test:*` suites including `test:stage3` 165/165.
- **Post-merge test fix (parent, after the merge agent's run):** the
  merge agent's run showed `test:stage3` 153/165 — the 12 failures were
  ALL the `isolation:` checks, obsolete by design post-merge (they
  asserted Stage 3 files were ABSENT from `../etea-prep-next`, which
  post-merge IS this folder). §14 of `scripts/test-stage3.mjs` was
  rewritten to assert the merged state instead (same 12 checks, markers
  PRESENT + deps present; one transient `pkg` redeclaration in the first
  edit was caught by the suite itself and fixed). Re-run: 165/165 PASS.
  The pre-merge isolation guard lives on in the stage3 record folder's
  copy of the test. No product code was changed by this fix.
- Local prod server (`next start`, port 3123, stopped afterwards): all 15
  static routes + `/mock/zam1` + `/tracks/zamungkor` + `/api/tutor/health`
  returned HTTP 200 (18/18).
- Shell on every page: all 16 page HTML responses contain the AppShell skip
  link (`shell-skip-link`) and the sidebar filter
  (`aria-label="Filter navigation links"`); legacy topbar markers
  (`topbar-inner`, `class="topbar"`) appear ZERO times on every page.
- Defect (b) /review blank count: PROVEN in served HTML —
  "Structural check: 186 pass · 14 needs review · 0 problem."
- Defect (a) home "63 / 0": verified at SOURCE + TEST level, NOT via
  curl-served HTML. The plan stat renders client-side (`stats` starts
  `null`, populated in `useEffect`), so the fraction is absent from SSR
  HTML entirely — plain curl cannot show it either way. Source read
  confirms `<span dir="ltr">{planDone} / 63</span>` in
  `src/app/page.tsx`, and the passing regression test
  (`test-stage3.mjs`, "defect (a): home plan fraction is isolated LTR")
  asserts the wrap. CORRECTION to VERIFY-stage3-part2.md: its claim that
  served HTML proves `<span dir="ltr">0 / 63</span>` does not reproduce
  via plain curl; hydrated-browser confirmation is part of live
  verification (owner evidence item 2). The fix itself is real.
- Zero Nastaliq refs in `src/` (grep: 0). Noto Sans Arabic only.
- No key material: no `.env` file in the tree; a key-shaped-token scan
  flagged 6 files, all containing only format descriptions / redaction
  patterns / truncated prefixes in docs and one code comment (longest
  token 24 chars; values never printed). `.env.example` holds placeholders
  only. Health endpoint in this sandbox returns `overall: down` (no keys
  configured here) — expected; provider health is a live-site check.

## Gaps carried forward (need a real browser post-deploy)

3D flip animation, chart SVGs (both render after hydration), 360px sidebar,
collapse/expand, Escape + focus return, theme/language switching, RTL drawer
direction, and the hydrated "0 / 63" check in Urdu mode. These belong to
live verification after deploy. The eventual `Nav.tsx` repo deletion (needs a deletion-capable route) is
a follow-up; the `test-stage3.mjs` §14 update is DONE (see Step 4).
