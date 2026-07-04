import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Отзывы",
  description: "Отзывы покупателей об аксессуарах uaartist ручной работы.",
};

const TESTIMONIALS = [
  {
    name: "Мария",
    text: "Косметичка превзошла ожидания — качество пошива отличное, ткань приятная. Видно, что сделано с душой.",
  },
  {
    name: "Ольга",
    text: "Заказывала индивидуальный пошив через конструктор. Получилось ровно то, что хотела. Спасибо!",
  },
  {
    name: "Анна",
    text: "Дорожный набор — лучшая покупка. Удобно, красиво и экологично. Рекомендую.",
  },
];

export default function TestimonialsPage() {
  return (
    <>
      <section className="page-header">
        <div className="container">
          <h1 className="page-title font-serif">Отзывы</h1>
          <p className="page-subtitle">Что говорят наши покупатели</p>
        </div>
      </section>
      <section className="products" style={{ padding: "48px 0 96px" }}>
        <div className="container">
          <div className="features-grid">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="feature-card">
                <p className="feature-text">«{t.text}»</p>
                <p className="feature-title font-serif" style={{ marginTop: 16 }}>
                  — {t.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
