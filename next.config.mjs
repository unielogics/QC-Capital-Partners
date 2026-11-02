/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Every page in the member portal is private. Belt and braces on top of the
  // per-page metadata: no crawler gets a different answer from a header.
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] }];
  },
};
export default nextConfig;
