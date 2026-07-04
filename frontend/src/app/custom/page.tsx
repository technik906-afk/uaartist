"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

import {
  getConstructorOptions,
  type ConstructorOption,
  type ConstructorOptions,
} from "@/lib/api/client";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

// three.js — только в браузере
const ConstructorScene = dynamic(() => import("@/components/ConstructorScene"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "100%",
        minHeight: 320,
        display: "grid",
        placeItems: "center",
        color: "#888",
      }}
    >
      Загружаем 3D-превью…
    </div>
  ),
});

// Масштаб 3D-модели по слагу размера (small/medium/large из БД).
const SIZE_SCALE: Record<string, number> = { small: 0.8, medium: 1, large: 1.25 };

export default function ConstructorPage() {
  const [options, setOptions] = useState<ConstructorOptions | null>(null);
  const [failed, setFailed] = useState(false);

  const [size, setSize] = useState<ConstructorOption | null>(null);
  const [bagColor, setBagColor] = useState<ConstructorOption | null>(null);
  const [zipperColor, setZipperColor] = useState<ConstructorOption | null>(null);
  const [tassel, setTassel] = useState(true);
  const [added, setAdded] = useState(false);

  const addCustom = useCart((s) => s.addCustom);

  useEffect(() => {
    let cancelled = false;
    getConstructorOptions()
      .then((data) => {
        if (cancelled) return;
        setOptions(data);
        setSize(data.sizes[0] ?? null);
        setBagColor(data.bag_colors[0] ?? null);
        setZipperColor(data.zipper_colors[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tasselOption = useMemo(
    () => options?.addons.find((a) => a.slug === "tassel") ?? null,
    [options]
  );

  const total = useMemo(() => {
    if (!size || !bagColor || !zipperColor) return 0;
    let sum = Number(size.price) + Number(bagColor.price) + Number(zipperColor.price);
    if (tassel && tasselOption) sum += Number(tasselOption.price);
    return sum;
  }, [size, bagColor, zipperColor, tassel, tasselOption]);

  if (failed) {
    return (
      <section className="page-header" style={{ paddingBottom: 96 }}>
        <div className="container" style={{ textAlign: "center" }}>
          <h1 className="page-title font-serif">Конструктор временно недоступен</h1>
          <p className="page-subtitle">Попробуйте обновить страницу.</p>
        </div>
      </section>
    );
  }

  if (!options || !size || !bagColor || !zipperColor) {
    return (
      <section className="page-header" style={{ paddingBottom: 96 }}>
        <div className="container" style={{ textAlign: "center" }}>
          <h1 className="page-title font-serif">Конструктор</h1>
          <p className="page-subtitle">Загрузка…</p>
        </div>
      </section>
    );
  }

  const handleAdd = () => {
    addCustom(
      {
        size: size.slug,
        bag_color: bagColor.slug,
        zipper_color: zipperColor.slug,
        tassel: tassel && !!tasselOption,
      },
      `Косметичка «${size.name}» (${bagColor.name}, индивидуальный пошив)`,
      total
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const swatchStyle = (option: ConstructorOption, selected: boolean) => ({
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: option.color_hex || "#ddd",
    border: selected ? "3px solid #8B7355" : "1px solid #ddd",
    cursor: "pointer",
  });

  return (
    <section className="constructor" style={{ padding: "120px 0 96px" }}>
      <div className="container">
        <div className="constructor-header">
          <h1 className="constructor-title font-serif">Конструктор</h1>
          <p className="constructor-text">
            Соберите свою косметичку — поворачивайте модель, меняйте цвета и размер
          </p>
        </div>

        <div className="constructor-grid">
          {/* 3D-превью */}
          <div
            className="constructor-preview"
            style={{ minHeight: 420, borderRadius: 16, overflow: "hidden", background: "#f5f3f0" }}
          >
            <ConstructorScene
              bagColor={bagColor.color_hex || "#E8E4D9"}
              zipperColor={zipperColor.color_hex || "#D4AF37"}
              tassel={tassel && !!tasselOption}
              scale={SIZE_SCALE[size.slug] ?? 1}
            />
          </div>

          {/* Опции */}
          <div className="constructor-options">
            <div className="option-group">
              <h3 className="option-title">Размер</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {options.sizes.map((s) => (
                  <button
                    key={s.slug}
                    className={`filter-btn${s.slug === size.slug ? " active" : ""}`}
                    onClick={() => setSize(s)}
                  >
                    {s.name} — {formatPrice(Number(s.price))}
                  </button>
                ))}
              </div>
            </div>

            <div className="option-group" style={{ marginTop: 24 }}>
              <h3 className="option-title">Цвет ткани: {bagColor.name}</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {options.bag_colors.map((c) => (
                  <button
                    key={c.slug}
                    aria-label={c.name}
                    title={c.name}
                    onClick={() => setBagColor(c)}
                    style={swatchStyle(c, c.slug === bagColor.slug)}
                  />
                ))}
              </div>
            </div>

            <div className="option-group" style={{ marginTop: 24 }}>
              <h3 className="option-title">Цвет молнии: {zipperColor.name}</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {options.zipper_colors.map((c) => (
                  <button
                    key={c.slug}
                    aria-label={c.name}
                    title={c.name}
                    onClick={() => setZipperColor(c)}
                    style={swatchStyle(c, c.slug === zipperColor.slug)}
                  />
                ))}
              </div>
            </div>

            {tasselOption && (
              <div className="option-group" style={{ marginTop: 24 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={tassel}
                    onChange={(e) => setTassel(e.target.checked)}
                  />
                  {tasselOption.name} (+{formatPrice(Number(tasselOption.price))})
                </label>
              </div>
            )}

            <button className="btn btn-primary" style={{ marginTop: 32 }} onClick={handleAdd}>
              {added ? "✓ Добавлено в корзину" : `В корзину — ${formatPrice(total)}`}
            </button>
            <p style={{ marginTop: 12, fontSize: "0.8rem", color: "#888" }}>
              Итоговая цена подтверждается при оформлении заказа.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
