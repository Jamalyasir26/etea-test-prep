import type { MetadataRoute } from "next";

// Supplemental only: ask all crawlers not to index anything.
// This is NOT access control — anyone with the link can still open the site.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
