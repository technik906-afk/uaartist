"use client";

import { useMemo, useState } from "react";

import type { ProductDetail } from "@/lib/api/client";
import { formatPrice, useCart } from "@/lib/cart";

/** Выбор варианта (размер/цвет) и добавление в корзину. */
export default function VariantPicker({ product }: { product: ProductDetail }) {
  const inStockVariants = useMemo(
    () => product.variants.filter((v) => v.in_stock),
    [product.variants]
  );
  const [selectedId, setSelectedId] = useState<number | null>(inStockVariants[0]?.id ?? null);
  const [added, setAdded] = useState(false);
  const addVariant = useCart((s) => s.addVariant);

  const selected = product.variants.find((v) => v.id === selectedId);

  if (product.variants.length === 0) {
    return <p>Товар временно недоступен.</p>;
  }

  const handleAdd = () => {
    if (!selected) return;
    addVariant({
      variantId: selected.id,
      name:
        product.variants.length > 1
          ? `${product.name} (${selected.attribute_values.map((av) => av.value).join(", ")})`
          : product.name,
      price: Number(selected.price),
      image: product.main_image?.image ?? null,
      maxQuantity: selected.stock ?? undefined,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div>
      {product.variants.length > 1 && (
        <div style={{ margin: "16px 0" }}>
          <p style={{ fontWeight: 500, marginBottom: 8 }}>Вариант:</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {product.variants.map((variant) => (
              <button
                key={variant.id}
                className={`filter-btn${variant.id === selectedId ? " active" : ""}`}
                disabled={!variant.in_stock}
                onClick={() => setSelectedId(variant.id)}
                style={!variant.in_stock ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
              >
                {variant.attribute_values.map((av) => av.value).join(" / ") || variant.sku}
                {!variant.in_stock && " (нет)"}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="product-price" style={{ fontSize: "1.5rem", margin: "16px 0" }}>
        {selected ? formatPrice(Number(selected.price)) : "—"}
      </p>

      {selected ? (
        <button className="btn btn-primary" onClick={handleAdd}>
          {added ? "✓ Добавлено" : "В корзину"}
        </button>
      ) : (
        <button className="btn btn-primary" disabled>
          Нет в наличии
        </button>
      )}
      {selected && selected.stock != null && selected.stock <= 3 && (
        <p style={{ marginTop: 8, fontSize: "0.875rem", color: "#a67c52" }}>
          Осталось {selected.stock} шт.
        </p>
      )}
    </div>
  );
}
