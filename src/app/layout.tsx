import type { Metadata } from "next";
import { LangProvider } from "@/lib/i18n";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "ETEA Prep Library — KP Government Jobs",
  description:
    "Personal preparation library for KP government job tests (ETEA / KPPSC): 540 MCQs, notes, flashcards, mocks, live AI tutor and preparation tracking.",
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
              AI Tutor answers are generated from this library only. AI-generated content is
              labelled “AI-generated — not verified” and never appears in mocks. No Hadith
              numbers, references, dates or quotes are invented on this site.
            </p>
          </footer>
        </LangProvider>
      </body>
    </html>
  );
}
