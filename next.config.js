/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 恢復動態功能以支援 Vercel 部署
  images: {
    unoptimized: true,
  },
};
module.exports = nextConfig;
