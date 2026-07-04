import type { Metadata } from "next";

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
          <p className="page-subtitle">Мы всегда на связи</p>
        </div>
      </section>
      <section className="products" style={{ padding: "48px 0 96px" }}>
        <div className="container" style={{ maxWidth: 560 }}>
          <div className="feature-card">
            <h3 className="feature-title font-serif">Как с нами связаться</h3>
            <p className="feature-text" style={{ marginTop: 16 }}>
              Instagram:{" "}
              <a href="https://instagram.com/uaartist" target="_blank" rel="noopener noreferrer">
                @uaartist
              </a>
            </p>
            <p className="feature-text">Email: hello@uaartist.ru</p>
            <p className="feature-text" style={{ marginTop: 16 }}>
              Отвечаем на вопросы о заказах, доставке и индивидуальном пошиве ежедневно с 10:00 до
              20:00 (МСК).
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
