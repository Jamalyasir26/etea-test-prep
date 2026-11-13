// Stage 3 foundation — Tailwind CSS v4 via the official PostCSS plugin.
// Next.js 16 picks up this file automatically; no next.config.mjs change
// is needed. The plugin compiles src/app/globals.css (which imports the
// Tailwind theme + utilities WITHOUT preflight — see globals.css).
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
