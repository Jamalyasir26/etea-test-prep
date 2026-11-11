/** @type {import('next').NextConfig} */
const nextConfig = {
  // No remote images, no external fetches at runtime from the client.
  reactStrictMode: true,
  // Supplemental only: ask search engines not to index any response.
  // This is NOT access control — anyone with the link can still open the site.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ];
  },
};

export default nextConfig;
