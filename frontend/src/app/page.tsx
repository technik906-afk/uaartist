import Image from "next/image";
import Link from "next/link";

import ProductCard from "@/components/ProductCard";
import { getProducts } from "@/lib/api/client";

// ISR: страница статическая, но пересобирается не реже раза в 5 минут —
// новые товары появляются на главной без redeploy.
export const revalidate = 300;

export default async function HomePage() {
  // SSR: товары в HTML — поисковики видят контент сразу.
  const products = await getProducts({ in_stock: "true" }).catch(() => null);
  const popular = products?.results.slice(0, 3) ?? [];

  return (
    <>
      <section className="hero">
        <div className="hero-bg">
          <Image
            src="/img/IMG_6677.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
          <div className="hero-overlay"></div>
        </div>
        <div className="container hero-container">
          <div className="hero-content">
            <p className="hero-badge">Устойчивая красота</p>
            <h1 className="hero-title">
              <span className="font-serif">Красота ручной работы</span>
            </h1>
            <h2 className="hero-subtitle">Аксессуары из органического хлопка и льна</h2>
            <p className="hero-text">
              Воплотите устойчивую элегантность с нашими аксессуарами ручной работы. Каждое изделие
              рассказывает историю осознанной жизни и вневременного стиля.
            </p>
            <div className="hero-buttons">
              <Link href="/catalog" className="btn btn-primary">
                Перейти в каталог
              </Link>
            </div>
          </div>
          <div className="hero-image">
            <div className="hero-image-wrapper">
              <Image
                src="/img/IMG_6666.jpg"
                alt="Косметичка ручной работы из органического льна"
                width={800}
                height={800}
                priority
              />
              <div className="hero-image-accent"></div>
            </div>
            <div className="hero-blur hero-blur-1"></div>
            <div className="hero-blur hero-blur-2"></div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="features-blur features-blur-1"></div>
        <div className="features-blur features-blur-2"></div>
        <div className="container">
          <div className="section-header">
            <p className="section-badge">Почему мы</p>
            <h2 className="section-title font-serif">Создано с заботой и осознанностью</h2>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <h3 className="feature-title font-serif">Органические материалы</h3>
              <p className="feature-text">
                100% сертифицированный органический хлопок и натуральный лён — бережно для вашей
                кожи и планеты.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="feature-title font-serif">Ручная работа</h3>
              <p className="feature-text">
                Каждое изделие изготавливается вручную с исключительным вниманием к деталям.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="feature-title font-serif">Устойчивая жизнь</h3>
              <p className="feature-text">
                Безотходное производство, упаковка без пластика, биоразлагаемые материалы.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="feature-title font-serif">Вневременной дизайн</h3>
              <p className="feature-text">
                Эстетика бохо-шик с натуральными оттенками, которые дополнят любой стиль.
              </p>
            </div>
          </div>
        </div>
      </section>

      {popular.length > 0 && (
        <section className="products-preview">
          <div className="container">
            <div className="section-header">
              <p className="section-badge">Каталог</p>
              <h2 className="section-title font-serif">Популярные модели</h2>
            </div>
            <div
              className="products-grid"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
            >
              {popular.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <div style={{ textAlign: "center", margin: "48px 0" }}>
              <Link href="/catalog" className="btn btn-primary">
                Смотреть весь каталог
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
