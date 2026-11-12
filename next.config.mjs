/** @type {import('next').NextConfig} */

// Stage 1 P1 Tier 3 (2026-11-12) — security headers. Verified on the
// local production server: every page still renders and the tutor still
// calls the API with these headers active (see VERIFY-p1-tier3.md).
//
// CSP HONESTY: this policy keeps 'unsafe-inline' for scripts AND styles
// because the site uses React inline styles (style={{...}}) and Next.js
// injects inline scripts for hydration — a CSP without 'unsafe-inline'
// would break the UI. 'unsafe-inline' weakens CSP (an injected inline
// script would still run), so a nonce-based CSP is future work; the
// remaining directives still block foreign scripts, framing, plugins,
// and form posts to other origins. No external resources are loaded:
// all fetches are same-origin /api/* calls, there are no <img> tags,
// no web fonts, and no CSS @imports (checked 2026-11-12).
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig = {
  // No remote images, no external fetches at runtime from the client.
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Supplemental only: ask search engines not to index any response.
          // This is NOT access control — anyone with the link can still open the site.
          { key: "X-Robots-Tag", value: "noindex" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // The site uses no camera, microphone, geolocation, or payments.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          // The site never needs to be framed by anyone, including itself.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
