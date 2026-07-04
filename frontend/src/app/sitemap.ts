import type { MetadataRoute } from "next";

import { getProducts } from "@/lib/api/client";

// Пересборка sitemap раз в час — подхватывает новые товары без redeploy.
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = ["", "/catalog", "/testimonials", "/contacts"].map(
    (path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "weekly" })
  );

  const products = await getProducts().catch(() => null);
  const productPages: MetadataRoute.Sitemap =
    products?.results.map((p) => ({
      url: `${SITE_URL}/product/${p.slug}`,
      changeFrequency: "weekly",
    })) ?? [];

  return [...staticPages, ...productPages];
}
