import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

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

  return (
    <section className="products" style={{ padding: "48px 0" }}>
      <div className="container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "48px",
            alignItems: "start",
          }}
        >
          {/* Галерея */}
          <div>
            {product.images.length > 0 ? (
              <div style={{ display: "grid", gap: "16px" }}>
                {product.images.map((img) => (
                  <Image
                    key={img.id}
                    src={img.image}
                    alt={img.alt_text || product.name}
                    width={800}
                    height={800}
                    style={{ width: "100%", height: "auto", borderRadius: "8px" }}
                    priority={!!img.is_main}
                  />
                ))}
              </div>
            ) : (
              <div style={{ aspectRatio: "1", background: "#f5f3f0", borderRadius: "8px" }} />
            )}
          </div>

          {/* Информация и выбор варианта */}
          <div>
            <p className="section-badge">{product.category_name}</p>
            <h1 className="section-title font-serif" style={{ textAlign: "left" }}>
              {product.name}
            </h1>
            {product.description && (
              <p style={{ margin: "16px 0 24px", lineHeight: 1.7 }}>{product.description}</p>
            )}
            <VariantPicker product={product} />
          </div>
        </div>
      </div>
    </section>
  );
}
