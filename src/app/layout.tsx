import type { Metadata } from "next";
import { LangProvider } from "@/lib/i18n";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "ETEA Prep Library — KP Government Jobs",
  description:
    "Personal preparation library for KP government job tests (ETEA / KPPSC): 590 MCQs, notes, flashcards, mocks, live AI tutor and preparation tracking.",
  // Supplemental only: ask search engines not to index. This is NOT access
  // control — anyone with the link can still open the site.
  robots: { index: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
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
