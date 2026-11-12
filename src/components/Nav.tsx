"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";

const LINKS = [
  { href: "/", key: "home" },
  { href: "/library", key: "library" },
  { href: "/practice", key: "practice" },
  { href: "/mock", key: "mocks" },
  { href: "/flashcards", key: "flashcards" },
  { href: "/tutor", key: "tutor" },
  { href: "/plan", key: "plan" },
  { href: "/analysis", key: "analysis" },
  { href: "/tracks", key: "tracks" },
  { href: "/topics", key: "topics" },
  { href: "/vacancies", key: "vacancies" },
  { href: "/links", key: "links" },
];

export default function Nav() {
  const { t, lang, setLang, theme, setTheme } = useLang();
  const pathname = usePathname();
  // Stage 1 P1 Tier 4 (B02) — mobile menu disclosure. On narrow
  // viewports the 14 nav links collapse behind the hamburger toggle
  // (see globals.css .nav-toggle / .nav.open). Desktop is unchanged:
  // the toggle is hidden and the links always show.
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand" onClick={() => setMenuOpen(false)}>
          {/* Localization Pass 1 (RTL) — the brand is a proper name kept
              in English; isolated LTR so it cannot reorder in RTL mode. */}
          <span dir="ltr">📚 ETEA Prep Library</span>
          <small>{t("brandTagline")}</small>
        </Link>
        <button
          ref={toggleRef}
          type="button"
          className="nav-toggle"
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          aria-label={t("navMenuLabel")}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
        <nav
          id="main-nav"
          className={menuOpen ? "nav open" : "nav"}
          aria-label={t("mainNavLabel")}
          onClick={() => setMenuOpen(false)}
        >
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={pathname === l.href ? "active" : ""}>
              {t(l.key)}
            </Link>
          ))}
          <Link href="/issues" className={pathname === "/issues" ? "active" : ""}>
            {t("issues")}
          </Link>
          <Link href="/review" className={pathname === "/review" ? "active" : ""}>
            {t("review")}
          </Link>
        </nav>
        <div className="controls">
          <select
            aria-label={t("languageLabel")}
            value={lang}
            onChange={(e) => setLang(e.target.value as "en" | "roman" | "ur")}
          >
            <option value="en">English</option>
            <option value="roman">Roman Urdu</option>
            <option value="ur">اردو</option>
          </select>
          <button
            className="secondary"
            style={{ minHeight: 36, padding: "4px 10px", borderColor: "#fff", color: "#fff" }}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={t("toggleDarkLabel")}
          >
            {theme === "dark" ? `☀️ ${t("light")}` : `🌙 ${t("dark")}`}
          </button>
        </div>
      </div>
    </header>
  );
}
