# ETEA Test Preparation — ZamungKor 2026

Temporary study + test website for ETEA test preparation (Khyber Pakhtunkhwa, Pakistan).

Posts: Theology / Religious Teacher (BPS-16) and Qari / Imam Masjid (BPS-12).
Test: 100-MCQ screening test by ETEA.

> **Expected pattern — ETEA has not published the official 2026 syllabus.**
> Pattern used: Islamiyat 30%, English 15%, Urdu 15%, Pak Studies 15%, Maths 15%, Pedagogy 10%, plus Tajweed for Qari.

## Contents

- `index.html` — single self-contained static site (all CSS/JS/data inline, no backend, no external resources, works offline after first load)
- Home dashboard: 3-week study plan, 2–3 hours/day, daily tasks + progress bar
- Subject notes (53), topic quizzes (20 per attempt, shuffled, instant feedback)
- 3 full mock tests, 100 MCQs each, 100 minutes timed, score report per subject
- Tajweed section + quiz, past-paper-style practice (20), flashcards (40)
- Progress tracking in browser localStorage, no login/signup

## Run locally

Open `index.html` directly in any browser, or serve the folder with any static server.

## Deploy

Static site — no framework, no build command, no environment variables.
Import this repository on Vercel as a static site.
