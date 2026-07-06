"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { createPayment, getPaymentStatus, type OrderRead } from "@/lib/api/client";
import { formatPrice } from "@/lib/cart";
import { useSessionValue } from "@/lib/hooks";

const POLL_INTERVAL_MS = 4000;
const POLL_MAX_ATTEMPTS = 30; // ~2 минуты

type PayState = "none" | "pending" | "paid" | "failed";

export default function ThankYouPage() {
  const raw = useSessionValue("uaartist_last_order");
  const order = useMemo<OrderRead | null>(() => (raw ? JSON.parse(raw) : null), [raw]);

  const [payState, setPayState] = useState<PayState>("none");
  const [retrying, setRetrying] = useState(false);
  const attempts = useRef(0);

  useEffect(() => {
    if (!order) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (cancelled || attempts.current >= POLL_MAX_ATTEMPTS) return;
      attempts.current += 1;
      try {
        const data = await getPaymentStatus(order.id, order.customer_email);
        if (cancelled) return;
        if (data.payment_status === "paid") {
          setPayState("paid");
          return;
        }
        if (data.payment_status === "failed") {
          setPayState("failed");
          return;
        }
        if (data.payment) {
          setPayState("pending");
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        } else {
          setPayState("none"); // платёж не создавался (оплата отключена)
        }
      } catch {
        if (!cancelled) setPayState("none");
      }
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [order]);

  const handleRetry = async () => {
    if (!order) return;
    setRetrying(true);
    try {
      const payment = await createPayment(order.id, order.customer_email);
      if (payment.confirmation_url) {
        window.location.assign(payment.confirmation_url);
        return;
      }
    } catch {
      // оплата недоступна — остаёмся на странице
    }
    setRetrying(false);
  };

  return (
    <section className="page-header" style={{ paddingBottom: 96 }}>
      <div className="container" style={{ textAlign: "center", maxWidth: 560 }}>
        <h1 className="page-title font-serif">Спасибо за заказ!</h1>
        {order ? (
          <>
            <p className="page-subtitle">
              Заказ #{order.id} на {formatPrice(Number(order.total))} принят.
            </p>

            {payState === "paid" && (
              <p style={{ marginTop: 16, color: "#2a7d2a", fontWeight: 600 }}>✓ Оплата получена</p>
            )}
            {payState === "pending" && (
              <p style={{ marginTop: 16, color: "#888" }}>Проверяем оплату…</p>
            )}
            {payState === "failed" && (
              <div style={{ marginTop: 16 }}>
                <p style={{ color: "#c00", marginBottom: 12 }}>Оплата не завершена.</p>
                <button className="btn btn-primary" onClick={handleRetry} disabled={retrying}>
                  {retrying ? "..." : "Оплатить заказ"}
                </button>
              </div>
            )}

            <p style={{ marginTop: 16 }}>
              Мы свяжемся с вами по телефону {order.customer_phone} в ближайшее время.
            </p>
          </>
        ) : (
          <p className="page-subtitle">Мы свяжемся с вами в ближайшее время.</p>
        )}
        <Link href="/catalog" className="btn btn-secondary" style={{ marginTop: 32 }}>
          Вернуться в каталог
        </Link>
      </div>
    </section>
  );
}
