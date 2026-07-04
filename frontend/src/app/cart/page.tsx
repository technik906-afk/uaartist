"use client";

import Image from "next/image";
import Link from "next/link";

import { cartTotal, formatPrice, useCart } from "@/lib/cart";
import { useMounted } from "@/lib/hooks";

export default function CartPage() {
  const { items, setQuantity, remove, clear } = useCart();
  const mounted = useMounted();

  if (!mounted) return null; // localStorage доступен только в браузере

  if (items.length === 0) {
    return (
      <section className="page-header" style={{ paddingBottom: 96 }}>
        <div className="container" style={{ textAlign: "center" }}>
          <h1 className="page-title font-serif">Корзина пуста</h1>
          <p className="page-subtitle">Выберите товары из каталога</p>
          <Link href="/catalog" className="btn btn-primary" style={{ marginTop: 24 }}>
            В каталог
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="products" style={{ padding: "120px 0 48px" }}>
      <div className="container" style={{ maxWidth: 800 }}>
        <h1 className="page-title font-serif" style={{ marginBottom: 32 }}>
          Ваш заказ
        </h1>

        {items.map((item) => (
          <div
            key={item.key}
            className="cart-item"
            style={{
              display: "flex",
              gap: 16,
              alignItems: "center",
              padding: "16px 0",
              borderBottom: "1px solid #eee",
            }}
          >
            {item.image ? (
              <Image
                src={item.image}
                alt={item.name}
                width={80}
                height={80}
                style={{ borderRadius: 8, objectFit: "cover" }}
              />
            ) : (
              <div style={{ width: 80, height: 80, background: "#f5f3f0", borderRadius: 8 }} />
            )}
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 500 }}>{item.name}</p>
              {item.custom && (
                <p style={{ fontSize: "0.8rem", color: "#888" }}>
                  индивидуальный пошив{item.custom.tassel ? ", с кисточкой" : ""}
                </p>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <button
                  className="filter-btn"
                  onClick={() => setQuantity(item.key, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  −
                </button>
                <span style={{ minWidth: 24, textAlign: "center" }}>{item.quantity}</span>
                <button
                  className="filter-btn"
                  onClick={() => setQuantity(item.key, item.quantity + 1)}
                >
                  +
                </button>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontWeight: 500 }}>{formatPrice(item.price * item.quantity)}</p>
              <button
                onClick={() => remove(item.key)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#c00",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  marginTop: 8,
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        ))}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            margin: "32px 0",
          }}
        >
          <button className="btn btn-secondary" onClick={clear}>
            Очистить корзину
          </button>
          <p style={{ fontSize: "1.25rem", fontWeight: 600 }}>
            Итого: {formatPrice(cartTotal(items))}
          </p>
        </div>

        <div style={{ display: "flex", gap: 16, justifyContent: "flex-end" }}>
          <Link href="/catalog" className="btn btn-secondary">
            Продолжить покупки
          </Link>
          <Link href="/checkout" className="btn btn-primary">
            Оформить заказ
          </Link>
        </div>
      </div>
    </section>
  );
}
