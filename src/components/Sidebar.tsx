// Sidebar — Stage 3 foundation. The same 14 nav links as the legacy
// Nav (same hrefs, same i18n keys), with lucide icons, a filter box,
// a due-today card, and a desktop collapse toggle.
//
// RTL: the drawer is anchored with inset-inline-start and bordered
// with border-inline-end, so in Urdu mode (dir="rtl" on <html>) it
// docks to the right automatically. The off-canvas translate
// direction cannot be expressed with logical properties, so it is
// chosen in JS from the current language (translate-x-full in RTL,
// -translate-x-full in LTR). The collapse chevron flips via the
// plain-CSS .shell-flip-rtl rule in globals.css.
//
// KEYBOARD / A11Y (mirrors the legacy Nav's B02 pattern): on mobile
// the drawer opens with focus on its close button, Escape closes it
// and returns focus to the topbar hamburger, and every icon-only link
// in the collapsed rail carries an aria-label + title.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type RefObject } from "react";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  FileText,
  Flag,
  GraduationCap,
  History,
  Home,
  Layers,
  Link2,
  PenLine,
  X,
  type LucideIcon,
} from "lucide-react";
import { useLang } from "@/lib/i18n";
import { FLASHCARDS } from "@/lib/data";
import { countDueFlashcards } from "@/lib/tracking";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "./ui/button";
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";

// Same 14 links as src/components/Nav.tsx (same hrefs, same keys).
// Step 2a — navigation GROUPS (report §7): Home stays top-level;
// Study (Library, Practice, Mock, Flashcards), Progress (Plan,
// Analysis), Exam Resources (Tracks, Topics, Vacancies, Official
// Links), Quality (Issues, Review). The report's group list omits
// Tutor; Tutor is placed in Study (it is a study tool, grouped with
// the other study surfaces). Groups are headings + role="group", never
// a visual-only divider.
type NavGroup = "study" | "progress" | "resources" | "quality";
const LINKS: { href: string; key: string; Icon: LucideIcon; group: NavGroup | null }[] = [
  { href: "/", key: "home", Icon: Home, group: null },
  { href: "/library", key: "library", Icon: BookOpen, group: "study" },
  { href: "/practice", key: "practice", Icon: PenLine, group: "study" },
  { href: "/mock", key: "mocks", Icon: FileText, group: "study" },
  { href: "/flashcards", key: "flashcards", Icon: Layers, group: "study" },
  { href: "/tutor", key: "tutor", Icon: GraduationCap, group: "study" },
  { href: "/plan", key: "plan", Icon: CalendarDays, group: "progress" },
  { href: "/analysis", key: "analysis", Icon: BarChart3, group: "progress" },
  { href: "/tracks", key: "tracks", Icon: Briefcase, group: "resources" },
  { href: "/topics", key: "topics", Icon: History, group: "resources" },
  { href: "/vacancies", key: "vacancies", Icon: Building2, group: "resources" },
  { href: "/links", key: "links", Icon: Link2, group: "resources" },
  { href: "/issues", key: "issues", Icon: Flag, group: "quality" },
  { href: "/review", key: "review", Icon: ClipboardCheck, group: "quality" },
];

const GROUPS: { id: NavGroup; key: string }[] = [
  { id: "study", key: "navGroupStudy" },
  { id: "progress", key: "navGroupProgress" },
  { id: "resources", key: "navGroupResources" },
  { id: "quality", key: "navGroupQuality" },
];

type SidebarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  returnFocusRef,
}: SidebarProps) {
  const { t, lang } = useLang();
  const pathname = usePathname();
  const [filter, setFilter] = useState("");
  const [due, setDue] = useState<number | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  // Step 2a — focus trap needs the drawer element itself.
  const asideRef = useRef<HTMLElement>(null);

  // Due count is client-only (reads review state from localStorage
  // via countDueFlashcards); a skeleton shows until it loads.
  useEffect(() => {
    setDue(countDueFlashcards(FLASHCARDS, new Date()));
  }, []);

  // Mobile drawer: focus the close button on open; Escape closes and
  // returns focus to the topbar hamburger (same pattern as Nav B02).
  // Step 2a — focus TRAP: Tab/Shift+Tab cycle inside the drawer while
  // it is open (the page behind is inert via AppShell), so keyboard
  // users can never tab into the hidden background.
  useEffect(() => {
    if (!mobileOpen) return;
    closeBtnRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCloseMobile();
        returnFocusRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !asideRef.current) return;
      const focusable = asideRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, onCloseMobile, returnFocusRef]);

  const query = filter.trim().toLowerCase();
  const visible = query ? LINKS.filter((l) => t(l.key).toLowerCase().includes(query)) : LINKS;
  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
  // Off-canvas direction: the drawer docks at the inline-start side,
  // so it slides out toward the inline-start edge (right in RTL).
  const offCanvas = lang === "ur" ? "tw:translate-x-full" : "tw:-translate-x-full";

  // Step 2a — one link renderer for Home and for every group, so the
  // touch target, active state, and aria-current can never drift apart.
  const renderLink = ({ href, key, Icon }: (typeof LINKS)[number]) => {
    const active = isActive(href);
    return (
      <li key={href}>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          aria-label={collapsed ? t(key) : undefined}
          title={collapsed ? t(key) : undefined}
          onClick={onCloseMobile}
          className={cn(
            // Step 2a — 44px minimum touch target (was ~36px).
            "tw:flex tw:min-h-11 tw:items-center tw:gap-3 tw:rounded-md tw:px-3 tw:py-2 tw:text-sm tw:font-medium tw:no-underline tw:transition-colors",
            collapsed && "tw:justify-center",
            // Step 2a — active route uses the semantic selected state
            // (.shell-nav-active: selected surface + 2px logical
            // border + aria-current). Hue alone never marks it.
            active
              ? "shell-nav-active"
              : "tw:text-muted-foreground tw:hover:bg-accent tw:hover:text-accent-foreground",
          )}
        >
          <Icon className="tw:size-5 tw:shrink-0" aria-hidden="true" />
          {!collapsed && <span className="tw:truncate">{t(key)}</span>}
        </Link>
      </li>
    );
  };

  return (
    <aside
      id="app-sidebar"
      ref={asideRef}
      className={cn(
        "tw:flex tw:flex-col tw:border-e tw:border-border tw:bg-background",
        // Step 2a — reduced-motion: the drawer opens instantly
        // (motion-reduce:transition-none on both mobile + desktop
        // transition utilities).
        "tw:fixed tw:inset-y-0 tw:start-0 tw:z-40 tw:w-72 tw:max-w-[85vw] tw:transition-transform tw:duration-200 tw:motion-reduce:transition-none",
        "tw:md:sticky tw:md:top-0 tw:md:z-auto tw:md:h-screen tw:md:translate-x-0 tw:md:transition-[width] tw:md:duration-200 tw:md:motion-reduce:transition-none",
        collapsed ? "tw:md:w-16" : "tw:md:w-64",
        mobileOpen ? "tw:translate-x-0" : offCanvas,
      )}
    >
      <div className="tw:flex tw:items-center tw:gap-2 tw:px-3 tw:py-3">
        <Link
          href="/"
          className="tw:flex tw:min-w-0 tw:flex-1 tw:items-center tw:gap-2 tw:rounded-md tw:px-1 tw:py-1 tw:font-semibold tw:text-foreground tw:no-underline"
          aria-label={collapsed ? "ETEA Prep Library" : undefined}
          onClick={onCloseMobile}
        >
          <BookOpen className="tw:size-6 tw:shrink-0 tw:text-brand-teal" aria-hidden="true" />
          {!collapsed && (
            <span className="tw:min-w-0 tw:flex-1">
              {/* Proper name kept in English, isolated LTR (same rule
                  as the legacy Nav brand). */}
              <span dir="ltr" className="tw:block tw:truncate tw:text-sm">
                ETEA Prep Library
              </span>
              <span className="tw:block tw:truncate tw:text-xs tw:font-normal tw:text-muted-foreground">
                {t("brandTagline")}
              </span>
            </span>
          )}
        </Link>
        <Button
          ref={closeBtnRef}
          variant="ghost"
          size="icon"
          // Step 2a — 44px touch target (icon size is 36px).
          className="tw:shrink-0 tw:size-11 tw:md:hidden"
          aria-label={t("closeMenu")}
          onClick={onCloseMobile}
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      {!collapsed && (
        <div className="tw:px-3 tw:pb-2">
          <Input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("sidebarNavFilter")}
            aria-label={t("sidebarNavFilterLabel")}
          />
        </div>
      )}

      <nav aria-label={t("mainNavLabel")} className="tw:min-h-0 tw:flex-1 tw:overflow-y-auto tw:px-2 tw:py-1">
        {/* Step 2a — Home stays top-level, outside the groups. */}
        <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-1 tw:p-0">
          {visible
            .filter((l) => l.group === null)
            .map((l) => renderLink(l))}
        </ul>
        {/* Step 2a — groups: a labelled group per section. Empty groups
            (no filter match) render nothing; the heading is hidden in
            the collapsed rail, where the group is unnamed but every
            link still carries its own aria-label. */}
        {GROUPS.map((g) => {
          const items = visible.filter((l) => l.group === g.id);
          if (items.length === 0) return null;
          const headingId = `nav-group-${g.id}`;
          return (
            <div
              key={g.id}
              role="group"
              aria-labelledby={collapsed ? undefined : headingId}
              className="tw:mt-3"
            >
              {!collapsed && (
                <h2
                  id={headingId}
                  className="tw:m-0 tw:px-3 tw:pb-1 tw:text-xs tw:font-semibold tw:tracking-wide tw:text-muted-foreground tw:uppercase"
                >
                  {t(g.key)}
                </h2>
              )}
              <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-1 tw:p-0">
                {items.map((l) => renderLink(l))}
              </ul>
            </div>
          );
        })}
        {!collapsed && visible.length === 0 && (
          <p className="tw:px-3 tw:py-2 tw:text-sm tw:text-muted-foreground">{t("noNavResults")}</p>
        )}
      </nav>

      {!collapsed && (
        <Card className="tw:mx-3 tw:mb-3 tw:gap-3 tw:py-4">
          <CardHeader className="tw:px-4">
            <CardTitle className="tw:text-sm">{t("cardsDueLabel")}</CardTitle>
            <CardAction>
              {/* FSRS-7 is a version literal (ID/code), not UI text. */}
              <Badge variant="secondary">FSRS-7</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="tw:px-4">
            {due === null ? (
              <Skeleton className="tw:h-8 tw:w-16" aria-hidden="true" />
            ) : (
              <p dir="ltr" className="tw:m-0 tw:text-2xl tw:font-bold">
                {due}
              </p>
            )}
          </CardContent>
          <CardFooter className="tw:px-4">
            <Link
              href="/flashcards"
              onClick={onCloseMobile}
              className={cn(buttonVariants({ size: "sm" }), "tw:w-full")}
            >
              {t("reviewNow")}
            </Link>
          </CardFooter>
        </Card>
      )}

      <div className="tw:hidden tw:border-t tw:border-border tw:p-3 tw:md:block">
        <Button
          variant="ghost"
          size="sm"
          className={cn("tw:w-full", collapsed ? "tw:justify-center" : "tw:justify-start")}
          aria-expanded={!collapsed}
          aria-controls="app-sidebar"
          onClick={onToggleCollapse}
        >
          {collapsed ? (
            <ChevronsRight className="shell-flip-rtl" aria-hidden="true" />
          ) : (
            <ChevronsLeft className="shell-flip-rtl" aria-hidden="true" />
          )}
          {!collapsed && <span>{t("sidebarCollapse")}</span>}
          {collapsed && <span className="tw:sr-only">{t("sidebarExpand")}</span>}
        </Button>
      </div>
    </aside>
  );
}
