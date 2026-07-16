import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Контакты",
  description: "Свяжитесь с uaartist: вопросы о заказах, доставке и индивидуальном пошиве.",
};

export default function ContactsPage() {
  return (
    <>
      <section className="page-header">
        <div className="container">
          <h1 className="page-title font-serif">Контакты</h1>
          <p className="page-subtitle">Вопросы о заказах, доставке и индивидуальном пошиве</p>
        </div>
      </section>
      <section className="products" style={{ padding: "48px 0 96px" }}>
        <div className="container" style={{ maxWidth: 560 }}>
          <div className="feature-card">
            <p className="feature-text">
              Почта:{" "}
              <a href="mailto:uaartist@yandex.ru" style={{ textDecoration: "underline" }}>
                uaartist@yandex.ru
              </a>
            </p>
            <p className="feature-text" style={{ marginTop: 12 }}>
              Пишите по вопросам заказов, доставки, возврата и индивидуального пошива — отвечаем
              в течение рабочего дня.
            </p>
            <p className="feature-text" style={{ marginTop: 16 }}>
              Статус своего заказа можно посмотреть в{" "}
              <Link href="/account" style={{ textDecoration: "underline" }}>
                личном кабинете
              </Link>
              ; подтверждение и детали заказа приходят на email, указанный при оформлении.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
