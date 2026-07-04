"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { OrderRead } from "@/lib/api/client";
import { fetchMyOrders, fetchProfile, useAuth, type Profile } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { useMounted } from "@/lib/hooks";

const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  confirmed: "Подтверждён",
  shipped: "Отправлен",
  done: "Завершён",
  cancelled: "Отменён",
};

export default function AccountPage() {
  const router = useRouter();
  const mounted = useMounted();
  const access = useAuth((s) => s.access);
  const logout = useAuth((s) => s.logout);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<OrderRead[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    if (!access) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    Promise.all([fetchProfile(), fetchMyOrders()])
      .then(([p, o]) => {
        if (!cancelled) {
          setProfile(p);
          setOrders(o.results);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [mounted, access, router]);

  if (!mounted || !access) return null;

  if (failed) {
    return (
      <section className="page-header" style={{ paddingBottom: 96 }}>
        <div className="container" style={{ textAlign: "center" }}>
          <h1 className="page-title font-serif">Не удалось загрузить профиль</h1>
          <p className="page-subtitle">Попробуйте войти заново.</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 24 }}
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            Ко входу
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="products" style={{ padding: "48px 0 96px" }}>
      <div className="container" style={{ maxWidth: 800 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 32,
          }}
        >
          <h1 className="page-title font-serif">Личный кабинет</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/account/edit" className="filter-btn">
              Редактировать профиль
            </Link>
            <button
              className="filter-btn"
              onClick={() => {
                logout();
                router.push("/");
              }}
            >
              Выйти
            </button>
          </div>
        </div>

        {profile && (
          <p style={{ marginBottom: 32, color: "#888" }}>
            {profile.first_name && `${profile.first_name} · `}
            {profile.email}
            {profile.phone && ` · ${profile.phone}`} · с{" "}
            {new Date(profile.date_joined).toLocaleDateString("ru-RU", {
              year: "numeric",
              month: "long",
            })}
          </p>
        )}

        <h2 className="font-serif" style={{ fontSize: "1.25rem", marginBottom: 16 }}>
          Мои заказы
        </h2>

        {orders === null ? (
          <p>Загрузка…</p>
        ) : orders.length === 0 ? (
          <p>
            Заказов пока нет.{" "}
            <Link href="/catalog" style={{ textDecoration: "underline" }}>
              В каталог
            </Link>
          </p>
        ) : (
          orders.map((order) => (
            <div key={order.id} style={{ padding: "16px 0", borderBottom: "1px solid #eee" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <p style={{ fontWeight: 500 }}>
                  Заказ #{order.id} · {new Date(order.created_at).toLocaleDateString("ru-RU")}
                </p>
                <p style={{ fontWeight: 600 }}>{formatPrice(Number(order.total))}</p>
              </div>
              <p style={{ fontSize: "0.85rem", color: "#888", margin: "4px 0" }}>
                {STATUS_LABELS[order.status ?? "new"] ?? order.status}
              </p>
              <ul style={{ fontSize: "0.9rem", paddingLeft: 18 }}>
                {order.items.map((item, i) => (
                  <li key={i}>
                    {item.product_name} × {item.quantity}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
