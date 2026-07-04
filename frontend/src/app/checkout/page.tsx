"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createOrder, ApiError, type CheckoutItem } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { cartTotal, formatPrice, useCart } from "@/lib/cart";
import { useMounted } from "@/lib/hooks";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clear } = useCart();
  const access = useAuth((s) => s.access);
  const mounted = useMounted();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <section className="page-header" style={{ paddingBottom: 96 }}>
        <div className="container" style={{ textAlign: "center" }}>
          <h1 className="page-title font-serif">Корзина пуста</h1>
          <Link href="/catalog" className="btn btn-primary" style={{ marginTop: 24 }}>
            В каталог
          </Link>
        </div>
      </section>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      customer: {
        name: String(form.get("name") ?? ""),
        phone: String(form.get("phone") ?? ""),
        email: String(form.get("email") ?? ""),
        comment: String(form.get("comment") ?? ""),
      },
      items: items.map<CheckoutItem>((item) =>
        item.variantId
          ? { variant_id: item.variantId, quantity: item.quantity }
          : { custom: item.custom, quantity: item.quantity }
      ),
    };

    try {
      const order = await createOrder(payload, access);
      sessionStorage.setItem("uaartist_last_order", JSON.stringify(order));
      clear();
      router.push("/thank-you");
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError(
          "Не удалось оформить заказ. Проверьте данные формы; возможно, часть товаров закончилась."
        );
      } else {
        setError("Сервер недоступен. Попробуйте позже или свяжитесь с нами напрямую.");
      }
      setSubmitting(false);
    }
  };

  return (
    <section className="products" style={{ padding: "48px 0" }}>
      <div className="container" style={{ maxWidth: 640 }}>
        <h1 className="page-title font-serif" style={{ marginBottom: 8 }}>
          Оформление заказа
        </h1>
        <p style={{ marginBottom: 24, color: "#888" }}>
          {items.length} поз. на {formatPrice(cartTotal(items))}. Итоговая сумма будет подтверждена
          менеджером.
        </p>

        <form
          onSubmit={handleSubmit}
          className="order-modal-form"
          style={{ display: "grid", gap: 16 }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <input
              name="name"
              type="text"
              placeholder="Имя"
              required
              minLength={2}
              className="form-input"
            />
            <input name="phone" type="tel" placeholder="Телефон" required className="form-input" />
          </div>
          <input name="email" type="email" placeholder="Email" required className="form-input" />
          <textarea
            name="comment"
            placeholder="Комментарий к заказу (адрес доставки, пожелания)"
            rows={3}
            className="form-input"
          />

          {error && (
            <p style={{ color: "#c00", fontSize: "0.9rem" }} role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
            {submitting ? "Отправляем..." : "Подтвердить заказ"}
          </button>
        </form>
      </div>
    </section>
  );
}
