/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 移除靜態導出，啟用動態功能
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
