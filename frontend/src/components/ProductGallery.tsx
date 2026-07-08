"use client";

import Image from "next/image";
import { useState } from "react";

import type { ProductImage } from "@/lib/api/client";

/** Галерея карточки: крупное фото + кликабельные миниатюры (вместо простыни фото). */
export default function ProductGallery({ images, alt }: { images: ProductImage[]; alt: string }) {
  const sorted = [...images].sort((a, b) => Number(b.is_main) - Number(a.is_main));
  const [active, setActive] = useState(0);

  if (sorted.length === 0) {
    return <div style={{ aspectRatio: "1", background: "#f5f3f0", borderRadius: "8px" }} />;
  }

  const current = sorted[active] ?? sorted[0];

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Image
        src={current.image}
        alt={current.alt_text || alt}
        width={800}
        height={800}
        priority
        style={{
          width: "100%",
          height: "auto",
          aspectRatio: "1",
          objectFit: "cover",
          borderRadius: 8,
        }}
      />
      {sorted.length > 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {sorted.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Фото ${i + 1}`}
              style={{
                padding: 0,
                border: i === active ? "2px solid #6b4e37" : "2px solid transparent",
                borderRadius: 8,
                cursor: "pointer",
                background: "none",
                lineHeight: 0,
              }}
            >
              <Image
                src={img.image}
                alt=""
                width={72}
                height={72}
                style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 6 }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
