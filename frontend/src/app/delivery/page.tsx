import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Доставка и оплата",
  description:
    "Доставка СДЭК и Почтой России по всей стране из Череповца. Оплата картой онлайн. Условия возврата.",
};

const BLOCKS = [
  {
    title: "Доставка",
    items: [
      "СДЭК — до пункта выдачи или курьером до двери.",
      "Почта России — в любое отделение по индексу.",
      "Отправляем из Череповца. Точная стоимость и сроки считаются автоматически при оформлении заказа — по живым тарифам перевозчиков, без наценки.",
    ],
  },
  {
    title: "Оплата",
    items: [
      "Банковской картой онлайн при оформлении заказа (через ЮKassa).",
      "После оплаты на почту придёт подтверждение заказа.",
    ],
  },
  {
    title: "Сроки изготовления",
    items: [
      "Товары в наличии отправляем в ближайшие дни после заказа.",
      "Срок пошива под заказ указан в карточке товара.",
    ],
  },
  {
    title: "Возврат",
    items: [
      "Вернуть изделие можно в течение 7 дней после получения, если оно не использовалось и сохранён товарный вид.",
      "Изделия, сшитые по индивидуальному заказу (конструктор), возврату не подлежат — закон «О защите прав потребителей», ст. 26.1.",
      "Для возврата напишите нам — контакты на странице «Связаться».",
    ],
  },
];

export default function DeliveryPage() {
  return (
    <section className="page-header" style={{ paddingBottom: 96 }}>
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 className="page-title font-serif" style={{ textAlign: "center" }}>
          Доставка и оплата
        </h1>

        {BLOCKS.map((block) => (
          <div key={block.title} style={{ marginTop: 40 }}>
            <h2 className="font-serif" style={{ fontSize: "1.4rem", marginBottom: 12 }}>
              {block.title}
            </h2>
            <ul style={{ display: "grid", gap: 8, paddingLeft: 20, lineHeight: 1.7 }}>
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}

        <p style={{ marginTop: 40, color: "#8b7d6b" }}>
          Остались вопросы?{" "}
          <Link href="/contacts" style={{ textDecoration: "underline" }}>
            Свяжитесь с нами
          </Link>{" "}
          — ответим и поможем выбрать.
        </p>
      </div>
    </section>
  );
}
