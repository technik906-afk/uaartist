import type { Metadata } from "next";
import Link from "next/link";

import ProductCard from "@/components/ProductCard";
import { getCategories, getProducts } from "@/lib/api/client";

export const metadata: Metadata = {
  title: "Каталог",
  description: "Каталог аксессуаров ручной работы из органических материалов.",
};

interface Props {
  // Next 16: searchParams — промис
  searchParams: Promise<{ category?: string; in_stock?: string; page?: string }>;
}

export default async function CatalogPage({ searchParams }: Props) {
  const params = await searchParams;
  const [products, categories] = await Promise.all([
    getProducts({
      category: params.category,
      in_stock: params.in_stock,
      page: params.page,
    }).catch(() => null),
    getCategories().catch(() => []),
  ]);

  const results = products?.results ?? [];

  return (
    <>
      <section className="page-header">
        <div className="container">
          <h1 className="page-title font-serif">Каталог</h1>
          <p className="page-subtitle">Выберите изделие из нашей коллекции</p>
        </div>
      </section>

      <section className="products" style={{ padding: "48px 0" }}>
        <div className="container">
          <div className="products-filters">
            <Link href="/catalog" className={`filter-btn${!params.category ? " active" : ""}`}>
              Все
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/catalog?category=${cat.slug}`}
                className={`filter-btn${params.category === cat.slug ? " active" : ""}`}
              >
                {cat.name}
              </Link>
            ))}
            <Link
              href={`/catalog?in_stock=true${params.category ? `&category=${params.category}` : ""}`}
              className={`filter-btn${params.in_stock === "true" ? " active" : ""}`}
            >
              В наличии
            </Link>
          </div>

          {results.length === 0 ? (
            <p style={{ textAlign: "center", padding: "48px 0" }}>
              По выбранным фильтрам товаров нет.
            </p>
          ) : (
            <div className="products-grid">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <div style={{ textAlign: "center", margin: "48px 0" }}>
            <Link href="/contacts" className="btn btn-outline">
              Нужен индивидуальный пошив? Свяжитесь с нами
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
