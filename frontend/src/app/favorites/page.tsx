"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import ProductCard from "@/components/ProductCard";
import { getProducts, type ProductList } from "@/lib/api/client";
import { useMounted } from "@/lib/hooks";
import { useWishlist } from "@/lib/wishlist";

export default function FavoritesPage() {
  const mounted = useMounted();
  const slugs = useWishlist((s) => s.slugs);
  const [products, setProducts] = useState<ProductList[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!mounted || slugs.length === 0) return;
    let cancelled = false;
    // Каталог небольшой — тянем максимум страницы и фильтруем по слагам.
    getProducts({ page: "1" })
      .then((data) => {
        if (!cancelled) setProducts(data.results.filter((p) => slugs.includes(p.slug)));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [mounted, slugs]);

  return (
    <>
      <section className="page-header">
        <div className="container">
          <h1 className="page-title font-serif">Избранное</h1>
          <p className="page-subtitle">Товары, которые вам приглянулись</p>
        </div>
      </section>

      <section className="products" style={{ padding: "48px 0 96px" }}>
        <div className="container">
          {!mounted ? null : slugs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <p style={{ fontSize: "1.125rem", marginBottom: 8 }}>В избранном нет товаров</p>
              <p style={{ fontSize: "0.875rem", color: "#888", marginBottom: 24 }}>
                Добавьте товары, нажав на значок сердца
              </p>
              <Link href="/catalog" className="btn btn-primary">
                В каталог
              </Link>
            </div>
          ) : failed ? (
            <p style={{ textAlign: "center", padding: "48px 0" }}>
              Не удалось загрузить товары. Попробуйте позже.
            </p>
          ) : products === null ? (
            <p style={{ textAlign: "center", padding: "48px 0" }}>Загрузка…</p>
          ) : (
            <div className="products-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
