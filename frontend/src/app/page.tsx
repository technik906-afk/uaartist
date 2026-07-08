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
            <p className="hero-badge">Ручная работа · сшито в Череповце</p>
            <h1 className="hero-title">
              <span className="font-serif">Красота ручной работы</span>
            </h1>
            <h2 className="hero-subtitle">Косметички из хлопкового букле и льна</h2>
            <p className="hero-text">
              Шью косметички и аксессуары вручную, по одной. Плотное букле, льняной подклад,
              молнии, которые не заедают. Каждая — в единственном экземпляре: повторить фактуру
              ткани невозможно.
            </p>
            <div className="hero-buttons">
              <Link href="/catalog" className="btn btn-primary">
                Перейти в каталог
              </Link>
              <Link href="/custom" className="btn btn-secondary">
                Конструктор
              </Link>
            </div>
          </div>
          <div className="hero-image">
            <div className="hero-image-wrapper">
              <Image
                src="/img/IMG_6666.jpg"
                alt="Косметичка ручной работы из хлопкового букле"
                width={800}
                height={800}
                priority
              />
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
            <p className="section-badge">Почему у нас</p>
            <h2 className="section-title font-serif">Сшито руками — по одной</h2>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <h3 className="feature-title font-serif">Не фабрика</h3>
              <p className="feature-text">
                Один человек, одна швейная машинка, маленькие партии. Каждый шов под контролем —
                никакого конвейера.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="feature-title font-serif">Натуральные ткани</h3>
              <p className="feature-text">
                Хлопковое букле и лён: приятные к коже, держат форму и красиво стареют вместе с
                вами.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="feature-title font-serif">Единственный экземпляр</h3>
              <p className="feature-text">
                Фактура букле не повторяется — вторая такая же косметичка не получится, даже если
                захотеть.
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
