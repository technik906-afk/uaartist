import Image from "next/image";
import Link from "next/link";

import WishlistButton from "@/components/WishlistButton";
import type { ProductList } from "@/lib/api/client";
import { formatPrice } from "@/lib/format";

// Серверный компонент: выбор варианта (и добавление в корзину) — на странице товара.
export default function ProductCard({ product }: { product: ProductList }) {
  const price = Number(product.price_min ?? 0);
  const priceLabel =
    product.price_min !== product.price_max ? `от ${formatPrice(price)}` : formatPrice(price);

  return (
    <div className="product-card">
      <Link href={`/product/${product.slug}`} className="product-image">
        {/* Кнопка ПОСЛЕ картинки в DOM — иначе transform фото при ховере
            перекрывает её (стек-контекст) */}
        {product.main_image ? (
          <Image
            src={product.main_image.image}
            alt={product.main_image.alt_text || product.name}
            width={400}
            height={400}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ aspectRatio: "1", background: "var(--color-cream, #f5f3f0)" }} />
        )}
        <WishlistButton slug={product.slug} />
      </Link>
      <div className="product-info">
        <div className="product-header">
          <div>
            <h3 className="product-title font-serif">
              <Link href={`/product/${product.slug}`}>{product.name}</Link>
            </h3>
            <p className="product-desc">{product.category_name}</p>
          </div>
          <span className="product-price">{priceLabel}</span>
        </div>
        {product.in_stock ? (
          <Link href={`/product/${product.slug}`} className="btn btn-cart-mobile btn-full">
            Выбрать
          </Link>
        ) : (
          <button className="btn btn-cart-mobile btn-full" disabled>
            Нет в наличии
          </button>
        )}
      </div>
    </div>
  );
}
