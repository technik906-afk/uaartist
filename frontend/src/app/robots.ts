import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Служебные страницы: не для поисковой выдачи.
      disallow: [
        "/cart",
        "/checkout",
        "/thank-you",
        "/account",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/favorites",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
