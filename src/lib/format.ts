// Phase 2 — language-aware date/time formatting.
//
// WHY: date and datetime displays used toLocaleString() /
// toLocaleDateString(undefined, …), i.e. the BROWSER locale, not the
// language the user selected in the app. These helpers pass an
// explicit Intl locale per app language so Urdu mode shows Urdu month
// names and English/Roman modes show Latin-script dates with Latin
// digits (Roman Urdu uses Latin script and Latin digits, so Roman
// shares the English locale — "17 November 2026" is natural Roman
// Urdu). All functions are pure and dependency-free so plain-node
// tests can import this module directly.
//
// TIMEZONE: calendar dates are LOCAL dates. An ISO datetime string
// parses with its own offset; a bare "yyyy-mm-dd" key parses as UTC
// midnight in JS, which is the previous evening in Pakistan —
// parseLocalDateKey() builds a local-midnight Date instead, so a
// stored "2026-11-13" always displays as 13 November, never the 12th.

export type FormatLang = "en" | "roman" | "ur";

/** Intl locale for the app language. Roman shares the English locale
 *  (Latin script, Latin digits); Urdu uses ur-PK month names. */
export function appDateLocale(lang: FormatLang): string {
  return lang === "ur" ? "ur-PK" : "en-US";
}

/** Parse a bare "yyyy-mm-dd" key as a LOCAL-midnight Date, or null
 *  when malformed. (Mirrors plan.ts parseLocalDateKey without
 *  importing the data chain.) */
export function parseLocalDateKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  const d = new Date(y, mo - 1, da);
  // The Date constructor rolls overflow (month 13 -> next January),
  // so reject any key that does not round-trip exactly.
  if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da) return null;
  return d;
}

/** Parse a stored date value for display: bare "yyyy-mm-dd" keys as
 *  local dates, anything else via the Date constructor. Returns null
 *  when unparseable — callers fall back to the raw string, never
 *  crash. */
export function parseDisplayDate(value: string): Date | null {
  const local = parseLocalDateKey(value);
  if (local) return local;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format a Date as a calendar date in the app language. Options
 *  default to year + short month + day (the previous
 *  formatLocalDueDate shape). */
export function formatAppDate(
  d: Date,
  lang: FormatLang,
  opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" },
): string {
  return d.toLocaleDateString(appDateLocale(lang), opts);
}

/** Format a Date as a date + time in the app language (the previous
 *  toLocaleString() shape, now locale-explicit). */
export function formatAppDateTime(d: Date, lang: FormatLang): string {
  return d.toLocaleString(appDateLocale(lang));
}

/** Format a stored ISO date/datetime string for display in a table.
 *  Unparseable values fall back to the raw string (or its yyyy-mm-dd
 *  slice when present), never crash. */
export function formatStoredDate(value: string, lang: FormatLang): string {
  const d = parseDisplayDate(value);
  if (!d) return value.slice(0, 10) || value;
  return formatAppDate(d, lang);
}
