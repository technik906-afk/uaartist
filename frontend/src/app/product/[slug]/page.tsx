import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import ProductGallery from "@/components/ProductGallery";
import VariantPicker from "@/components/VariantPicker";
import { getProduct } from "@/lib/api/client";

interface Props {
  params: Promise<{ slug: string }>; // Next 16: params — промис
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  if (!product) return {};
  return {
    title: product.meta_title || product.name,
    description: product.meta_description || product.description?.slice(0, 160),
    openGraph: {
      title: product.meta_title || product.name,
      images: product.main_image ? [product.main_image.image] : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  if (!product) notFound();

  // Характеристики: показываем только заполненные в админке
  const specs = [
    ["Размеры", product.dimensions],
    ["Состав", product.composition],
    ["Уход", product.care],
    ["Срок изготовления", product.production_time],
  ].filter(([, value]) => value);

  return (
    <section className="products" style={{ padding: "120px 0 48px" }}>
      <div className="container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "48px",
            alignItems: "start",
          }}
        >
          <ProductGallery images={product.images} alt={product.name} />

          {/* Информация и выбор варианта */}
          <div>
            <p className="section-badge">{product.category_name}</p>
            <h1 className="section-title font-serif" style={{ textAlign: "left" }}>
              {product.name}
            </h1>
            <VariantPicker product={product} />

            {product.description && (
              <p style={{ margin: "24px 0 0", lineHeight: 1.7 }}>{product.description}</p>
            )}

            {specs.length > 0 && (
              <dl style={{ margin: "24px 0 0", display: "grid", gap: 8 }}>
                {specs.map(([label, value]) => (
                  <div key={label} style={{ display: "flex", gap: 12, fontSize: "0.95rem" }}>
                    <dt style={{ color: "#8b7d6b", minWidth: 150 }}>{label}</dt>
                    <dd style={{ margin: 0 }}>{value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div
              style={{
                margin: "28px 0 0",
                padding: "16px 20px",
                background: "#f5f3f0",
                borderRadius: 8,
                fontSize: "0.9rem",
                lineHeight: 1.6,
              }}
            >
              <p style={{ margin: 0 }}>
                <strong>Доставка:</strong> СДЭК (пункт выдачи или курьер) и Почта России, отправка
                из Череповца. Точная стоимость и сроки рассчитаются при оформлении заказа.
              </p>
              <p style={{ margin: "8px 0 0" }}>
                <strong>Возврат:</strong> в течение 7 дней после получения (кроме изделий, сшитых
                по индивидуальному заказу).{" "}
                <Link href="/delivery" style={{ textDecoration: "underline" }}>
                  Подробнее о доставке и оплате
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
