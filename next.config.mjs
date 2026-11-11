/** @type {import('next').NextConfig} */
const nextConfig = {
  // No remote images, no external fetches at runtime from the client.
  reactStrictMode: true,
};

export default nextConfig;
