import type { Metadata } from "next";
import Link from "next/link";

import ProductCard from "@/components/ProductCard";
import { getCategories, getProducts } from "@/lib/api/client";

export const metadata: Metadata = {
  title: "Каталог",
  description: "Каталог аксессуаров ручной работы из органических материалов.",
};

// Зеркало DefaultPagination.page_size на бэкенде.
const PAGE_SIZE = 12;

interface Props {
  // Next 16: searchParams — промис
  searchParams: Promise<{ category?: string; in_stock?: string; page?: string }>;
}

/** Ссылка на каталог с сохранением активных фильтров. */
function catalogHref(params: { category?: string; in_stock?: string }, page?: number) {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.in_stock) query.set("in_stock", params.in_stock);
  if (page && page > 1) query.set("page", String(page));
  const qs = query.toString();
  return `/catalog${qs ? `?${qs}` : ""}`;
}

export default async function CatalogPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const [products, categories] = await Promise.all([
    getProducts({
      category: params.category,
      in_stock: params.in_stock,
      page: page > 1 ? String(page) : undefined,
    }).catch(() => null), // включая DRF 404 на несуществующей странице
    getCategories().catch(() => []),
  ]);

  const results = products?.results ?? [];
  const totalPages = products ? Math.max(1, Math.ceil(products.count / PAGE_SIZE)) : 0;

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
                href={catalogHref({ category: cat.slug })}
                className={`filter-btn${params.category === cat.slug ? " active" : ""}`}
              >
                {cat.name}
              </Link>
            ))}
            <Link
              href={catalogHref({ category: params.category, in_stock: "true" })}
              className={`filter-btn${params.in_stock === "true" ? " active" : ""}`}
            >
              В наличии
            </Link>
            <Link href="/favorites" className="filter-btn">
              ♥ Избранное
            </Link>
          </div>

          {results.length === 0 ? (
            <p style={{ textAlign: "center", padding: "48px 0" }}>
              {page > 1 ? (
                <>
                  Такой страницы нет.{" "}
                  <Link href={catalogHref(params)} style={{ textDecoration: "underline" }}>
                    К началу каталога
                  </Link>
                </>
              ) : (
                "По выбранным фильтрам товаров нет."
              )}
            </p>
          ) : (
            <div className="products-grid">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 16,
                marginTop: 32,
              }}
            >
              {page > 1 ? (
                <Link href={catalogHref(params, page - 1)} className="filter-btn">
                  ← Назад
                </Link>
              ) : (
                <span className="filter-btn" style={{ opacity: 0.4 }}>
                  ← Назад
                </span>
              )}
              <span style={{ fontSize: "0.9rem", color: "#888" }}>
                Страница {page} из {totalPages}
              </span>
              {page < totalPages ? (
                <Link href={catalogHref(params, page + 1)} className="filter-btn">
                  Вперёд →
                </Link>
              ) : (
                <span className="filter-btn" style={{ opacity: 0.4 }}>
                  Вперёд →
                </span>
              )}
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
