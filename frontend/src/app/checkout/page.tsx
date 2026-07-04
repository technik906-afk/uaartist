"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ApiError, type CheckoutItem } from "@/lib/api/client";
import { fetchProfile, submitOrder, useAuth, type Profile } from "@/lib/auth";
import { cartTotal, formatPrice, useCart } from "@/lib/cart";
import { useMounted } from "@/lib/hooks";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clear } = useCart();
  const access = useAuth((s) => s.access);
  const mounted = useMounted();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Для залогиненного — предзаполняем форму данными профиля.
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    if (!mounted || !access) return;
    let cancelled = false;
    fetchProfile()
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {}) // не удалось — оформит как гость
      .finally(() => {
        if (!cancelled) setProfileReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [mounted, access]);

  // Гость видит форму сразу; залогиненный — после загрузки профиля (для предзаполнения).
  if (!mounted || (access && !profileReady)) return null;

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
      const order = await submitOrder(payload);
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
    <section className="products" style={{ padding: "120px 0 48px" }}>
      <div className="container" style={{ maxWidth: 640 }}>
        <h1 className="page-title font-serif" style={{ marginBottom: 8 }}>
          Оформление заказа
        </h1>
        <p style={{ marginBottom: 24, color: "#888" }}>
          {items.length} поз. на {formatPrice(cartTotal(items))}. Итоговая сумма будет подтверждена
          менеджером.
        </p>

        {profile && (
          <p
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              background: "#f5f3f0",
              borderRadius: 8,
              fontSize: "0.9rem",
            }}
          >
            Вы оформляете заказ как <strong>{profile.email}</strong> — заказ появится в{" "}
            <Link href="/account" style={{ textDecoration: "underline" }}>
              личном кабинете
            </Link>
            .
          </p>
        )}

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
              defaultValue={profile?.first_name ?? ""}
              className="form-input"
            />
            <input
              name="phone"
              type="tel"
              placeholder="Телефон"
              required
              defaultValue={profile?.phone ?? ""}
              className="form-input"
            />
          </div>
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            defaultValue={profile?.email ?? ""}
            className="form-input"
          />
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
