import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Отзывы",
  description: "Отзывы покупателей об аксессуарах uaartist ручной работы.",
};

// Реальных отзывов пока нет — выдуманные (сгенерированные) убраны сознательно:
// фейковые отзывы разрушают доверие и нарушают закон о защите прав потребителей.
// Как появятся первые настоящие — добавить сюда (имя + текст, с согласия автора).
export default function TestimonialsPage() {
  return (
    <section className="page-header" style={{ paddingBottom: 96 }}>
      <div className="container" style={{ textAlign: "center", maxWidth: 640 }}>
        <h1 className="page-title font-serif">Отзывы</h1>
        <p className="page-subtitle" style={{ marginTop: 16, lineHeight: 1.7 }}>
          Магазин открылся совсем недавно — здесь появятся отзывы первых покупателей.
        </p>
        <p style={{ marginTop: 12, lineHeight: 1.7 }}>
          Уже купили косметичку? Напишите пару слов через страницу{" "}
          <Link href="/contacts" style={{ textDecoration: "underline" }}>
            «Контакты»
          </Link>{" "}
          — с вашего разрешения опубликую отзыв здесь, и он станет первым.
        </p>
        <Link href="/catalog" className="btn btn-primary" style={{ marginTop: 32 }}>
          Перейти в каталог
        </Link>
      </div>
    </section>
  );
}
