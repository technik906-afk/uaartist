import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Фото товаров отдаёт Django (MEDIA_URL). В проде добавить домен API.
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
    ],
  },
};

export default nextConfig;
