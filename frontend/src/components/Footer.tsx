import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <h3 className="footer-logo font-serif">uaartist</h3>
            <p>
              Косметички и аксессуары ручной работы из натуральных тканей. Сшито вручную в
              Череповце, отправляем по всей России.
            </p>
          </div>
          <div className="footer-links">
            <h4>Магазин</h4>
            <ul>
              <li>
                <Link href="/catalog">Все товары</Link>
              </li>
              <li>
                <Link href="/custom">Индивидуальные заказы</Link>
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
                <Link href="/delivery">Доставка и оплата</Link>
              </li>
              <li>
                <Link href="/offer">Публичная оферта</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} uaartist. Все права защищены.</p>
          {/* Реквизиты продавца — требование дистанционной торговли и модерации ЮKassa */}
          <p style={{ marginTop: 8, fontSize: "0.8rem", opacity: 0.7 }}>
            ИП Алексеева Ульяна Андрияновна · ОГРНИП 324350000007097 · ИНН 352811360022 ·{" "}
            <a href="mailto:uaartist@yandex.ru">uaartist@yandex.ru</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
