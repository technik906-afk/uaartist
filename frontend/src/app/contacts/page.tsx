import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Контакты",
  description: "Свяжитесь с uaartist: вопросы о заказах, доставке и индивидуальном пошиве.",
};

// Временный минимум: настоящего почтового ящика пока нет (появится вместе с
// офертой) — несуществующий hello@ и инстаграм убраны, чтобы не отправлять
// людей в пустоту. Как будет ящик — вписать сюда и в оферту.
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
              Раздел обновляется — скоро здесь появится почта для связи.
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
