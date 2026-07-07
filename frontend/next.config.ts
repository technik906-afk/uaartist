import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-hosted прод (Docker на VM): минимальный сервер в .next/standalone.
  // `npm run start` со standalone не работает — только node server.js (см. Dockerfile).
  output: "standalone",
  images: {
    // Фото товаров отдаёт Django (MEDIA_URL): dev — localhost, прод — api-домен.
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "api.uaartist.ru",
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
