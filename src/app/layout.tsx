import type { Metadata } from "next";
import { Noto_Sans_Arabic } from "next/font/google";
import { LangProvider } from "@/lib/i18n";
import AppShell from "@/components/AppShell";
import TelemetryListener from "@/components/TelemetryListener";
import "./globals.css";

// Localization Pass 1 — fonts (owner's UPDATED decision, 2026-11-12:
// the earlier two-font decision is CANCELLED). The site uses ONLY Noto
// Sans Arabic — headings, body text and UI, in all languages. next/font/google
// downloads the files at BUILD time and serves them from this site's
// own origin (/_next/static), so no runtime request to Google Fonts ever
// happens — required, because the CSP allows font-src 'self' data:
// only. display: swap keeps text readable with system fallbacks while
// a font loads. If the build environment cannot reach Google Fonts,
// `next build` fails here with a clear fetch error (the Vercel build
// has network access); never fall back to external <link> font tags.
// NOTE: the P2 deploy (Nov 2026) shipped the cancelled heading font
// — this correction removes it in the next deploy.
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
    <html lang="en" className={sansArabic.variable}>
      <body>
        {/* Stage 1 P2 (B07) — records client/hydration errors with their
            route, on-device only, viewable on /issues. Renders nothing. */}
        <TelemetryListener />
        <LangProvider>
          {/* Stage 3 foundation — AppShell renders the new sidebar shell
              on the home page and the legacy Nav + .container chrome on
              every other page (see src/components/AppShell.tsx). */}
          <AppShell>{children}</AppShell>
        </LangProvider>
      </body>
    </html>
  );
}
