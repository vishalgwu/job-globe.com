/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Required for Docker/Railway standalone deployment
  output: "standalone",
};

export default nextConfig;
