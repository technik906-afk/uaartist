"use client";

import Link from "next/link";
import { useMemo } from "react";

import type { OrderRead } from "@/lib/api/client";
import { formatPrice } from "@/lib/cart";
import { useSessionValue } from "@/lib/hooks";

export default function ThankYouPage() {
  const raw = useSessionValue("uaartist_last_order");
  const order = useMemo<OrderRead | null>(() => (raw ? JSON.parse(raw) : null), [raw]);

  return (
    <section className="page-header" style={{ paddingBottom: 96 }}>
      <div className="container" style={{ textAlign: "center", maxWidth: 560 }}>
        <h1 className="page-title font-serif">Спасибо за заказ!</h1>
        {order ? (
          <>
            <p className="page-subtitle">
              Заказ #{order.id} на {formatPrice(Number(order.total))} принят.
            </p>
            <p style={{ marginTop: 8 }}>
              Мы свяжемся с вами по телефону {order.customer_phone} в ближайшее время.
            </p>
          </>
        ) : (
          <p className="page-subtitle">Мы свяжемся с вами в ближайшее время.</p>
        )}
        <Link href="/catalog" className="btn btn-primary" style={{ marginTop: 32 }}>
          Вернуться в каталог
        </Link>
      </div>
    </section>
  );
}
