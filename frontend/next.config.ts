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
    // Next 16 блокирует оптимизацию картинок с локальных IP (SSRF-защита).
    // В dev медиа живёт на localhost:8000 — разрешаем ТОЛЬКО в dev-режиме;
    // в проде медиа должно отдаваться с публичного домена.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
  },
};

export default nextConfig;
