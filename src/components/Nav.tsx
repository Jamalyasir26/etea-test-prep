"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand">
          📚 ETEA Prep Library
          <small>KP Government Jobs — personal preparation</small>
        </Link>
        <nav className="nav" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={pathname === l.href ? "active" : ""}>
              {t(l.key)}
            </Link>
          ))}
          {/* "issues" has no i18n string (t() would fall back to lowercase "issues"), so it is a plain label. */}
          <Link href="/issues" className={pathname === "/issues" ? "active" : ""}>
            Issues
          </Link>
        </nav>
        <div className="controls">
          <select
            aria-label="Language"
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
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </div>
    </header>
  );
}
