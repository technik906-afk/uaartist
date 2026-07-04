import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <h3 className="footer-logo font-serif">uaartist</h3>
            <p>
              Аксессуары ручной работы из органических материалов для сознательных покупателей.
              Устойчивые, элегантные, вневременные.
            </p>
          </div>
          <div className="footer-links">
            <h4>Магазин</h4>
            <ul>
              <li>
                <Link href="/catalog">Все товары</Link>
              </li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>О нас</h4>
            <ul>
              <li>
                <Link href="/testimonials">Отзывы</Link>
              </li>
              <li>
                <Link href="/contacts">Контакты</Link>
              </li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Поддержка</h4>
            <ul>
              <li>
                <Link href="/contacts">Связаться</Link>
              </li>
              <li>
                <Link href="/contacts">Доставка</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} uaartist. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
}
