/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  compress: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  webpack: (config, { dev }) => {
    // Mencegah korupsi cache chunk webpack (Error: Cannot find module './161.js') di Windows saat mode dev
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
