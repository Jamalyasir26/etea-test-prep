// ShellTopbar — Stage 3 foundation. The sticky top bar of the new
// shell (home page only): mobile hamburger, mobile brand, and the
// language + theme controls. The controls reuse the EXISTING i18n +
// theme systems — the same setLang/setTheme calls and the same option
// labels as the legacy Nav, so behaviour is identical.
"use client";

import Link from "next/link";
import type { RefObject } from "react";
import { BookOpen, Menu, Moon, Sun } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { Button } from "./ui/button";

type ShellTopbarProps = {
  onOpenMobile: () => void;
  mobileOpen: boolean;
  toggleRef: RefObject<HTMLButtonElement | null>;
};

export default function ShellTopbar({ onOpenMobile, mobileOpen, toggleRef }: ShellTopbarProps) {
  const { t, lang, setLang, theme, setTheme } = useLang();
  return (
    <header className="tw:sticky tw:top-0 tw:z-20 tw:border-b tw:border-border tw:bg-background/80 tw:backdrop-blur">
      <div className="tw:flex tw:h-14 tw:items-center tw:gap-2 tw:px-3 tw:md:px-4">
        <Button
          ref={toggleRef}
          variant="ghost"
          size="icon"
          className="tw:md:hidden"
          aria-expanded={mobileOpen}
          aria-controls="app-sidebar"
          aria-label={t("navMenuLabel")}
          onClick={onOpenMobile}
        >
          <Menu aria-hidden="true" />
        </Button>
        <Link
          href="/"
          className="tw:flex tw:items-center tw:gap-2 tw:font-semibold tw:text-foreground tw:no-underline tw:md:hidden"
        >
          <BookOpen className="tw:size-5 tw:shrink-0 tw:text-brand-teal" aria-hidden="true" />
          <span dir="ltr">ETEA Prep Library</span>
        </Link>
        <div className="tw:ms-auto tw:flex tw:items-center tw:gap-2">
          <select
            aria-label={t("languageLabel")}
            value={lang}
            onChange={(e) => setLang(e.target.value as "en" | "roman" | "ur")}
            className="tw:h-9 tw:rounded-md tw:border tw:border-input tw:bg-background tw:px-2 tw:text-sm tw:shadow-xs tw:outline-none tw:focus-visible:ring-ring/50 tw:focus-visible:ring-[3px]"
          >
            <option value="en">English</option>
            <option value="roman">Roman Urdu</option>
            <option value="ur">اردو</option>
          </select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={t("toggleDarkLabel")}
          >
            {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
