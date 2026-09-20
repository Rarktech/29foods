/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@29foods/core", "@29foods/supabase-client"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
};

module.exports = nextConfig;
