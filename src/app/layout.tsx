import type { Metadata } from "next";
import { Noto_Nastaliq_Urdu, Noto_Sans_Arabic } from "next/font/google";
import { LangProvider } from "@/lib/i18n";
import Nav from "@/components/Nav";
import TelemetryListener from "@/components/TelemetryListener";
import "./globals.css";

// Stage 1 P2 — fonts (owner's FINAL decision): headings Noto Nastaliq
// Urdu, body Noto Sans Arabic. next/font/google downloads the files at
// BUILD time and serves them from this site's own origin (/_next/static),
// so no runtime request to Google Fonts ever happens — required, because
// the CSP allows font-src 'self' data: only. display: swap keeps text
// readable with system fallbacks while a font loads. If the build
// environment cannot reach Google Fonts, `next build` fails here with a
// clear fetch error (the Vercel build has network access); never fall
// back to external <link> font tags.
const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-nastaliq",
});
const sansArabic = Noto_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans-arabic",
});

export const metadata: Metadata = {
  title: "ETEA Prep Library — KP Government Jobs",
  description:
    "Personal preparation library for KP government job tests (ETEA / KPPSC): 645 MCQs, notes, flashcards, mocks, live AI tutor and preparation tracking.",
  // Supplemental only: ask search engines not to index. This is NOT access
  // control — anyone with the link can still open the site.
  robots: { index: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nastaliq.variable} ${sansArabic.variable}`}>
      <body>
        {/* Stage 1 P2 (B07) — records client/hydration errors with their
            route, on-device only, viewable on /issues. Renders nothing. */}
        <TelemetryListener />
        <LangProvider>
          <Nav />
          <main className="container">{children}</main>
          <footer className="container">
            <p>
              All questions are original practice questions, not ETEA papers. Patterns are
              labelled per project — ETEA sets paper composition per project. Always verify
              against your specific advertisement / roll number slip.
            </p>
            <p>
              AI Tutor answers are generated from this library only. All practice
              questions are AI-generated and unreviewed unless marked reviewed — mocks
              are provisional practice built from those unreviewed items. Trusted mode
              uses reviewed items only. No Hadith numbers, references, dates or quotes
              are invented on this site.
            </p>
            <p>
              Search engines are asked not to index this site (robots.txt / noindex),
              but that is not access control: anyone with the link can open it, and a
              real access gate is future work.
            </p>
          </footer>
        </LangProvider>
      </body>
    </html>
  );
}
