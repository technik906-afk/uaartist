"use client";

import { useState } from "react";

import { BAG_COLORS, SIZES, TASSEL_PRICE, ZIPPER_COLORS } from "@/lib/constructor";
import { formatPrice, useCart, type CustomConfig } from "@/lib/cart";

export default function ConstructorPage() {
  const [size, setSize] = useState<(typeof SIZES)[number]>(SIZES[0]);
  const [bagColor, setBagColor] = useState<(typeof BAG_COLORS)[number]>(BAG_COLORS[0]);
  const [zipperColor, setZipperColor] = useState<(typeof ZIPPER_COLORS)[number]>(ZIPPER_COLORS[0]);
  const [tassel, setTassel] = useState(true);
  const [added, setAdded] = useState(false);
  const addCustom = useCart((s) => s.addCustom);

  const total = size.price + (tassel ? TASSEL_PRICE : 0);

  const handleAdd = () => {
    const config: CustomConfig = {
      size: size.id,
      bag_color: bagColor.id,
      zipper_color: zipperColor.id,
      tassel,
    };
    addCustom(config, `Косметичка «${size.name}» (${bagColor.name}, индивидуальный пошив)`, total);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <section className="constructor">
      <div className="container">
        <div className="constructor-header">
          <h1 className="constructor-title font-serif">Конструктор</h1>
          <p className="constructor-text">
            Выберите параметры вашего уникального изделия ручной работы
          </p>
        </div>

        <div className="constructor-grid">
          {/* Превью */}
          <div className="constructor-preview">
            <div className="bag-preview">
              <div
                className="bag-body"
                style={{ background: bagColor.hex, borderRadius: 12, minHeight: 220 }}
              >
                <div
                  className="bag-zipper"
                  style={{ background: zipperColor.hex, height: 10, borderRadius: 4 }}
                />
                {tassel && (
                  <div
                    className="bag-tassel"
                    style={{
                      background: zipperColor.hex,
                      width: 8,
                      height: 42,
                      borderRadius: 4,
                      margin: "8px auto 0",
                    }}
                  />
                )}
              </div>
              <p className="preview-name font-serif" style={{ marginTop: 16 }}>
                Косметичка «{size.name}»
              </p>
              <p className="preview-desc">
                {bagColor.name} лён, {zipperColor.name.toLowerCase()} молния
              </p>
              <div className="preview-price">
                <span className="price-label">Стоимость: </span>
                <span className="price-value">{formatPrice(total)}</span>
              </div>
            </div>
          </div>

          {/* Опции */}
          <div className="constructor-options">
            <div className="option-group">
              <h3 className="option-title">Размер</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {SIZES.map((s) => (
                  <button
                    key={s.id}
                    className={`filter-btn${s.id === size.id ? " active" : ""}`}
                    onClick={() => setSize(s)}
                  >
                    {s.name} — {formatPrice(s.price)}
                  </button>
                ))}
              </div>
            </div>

            <div className="option-group" style={{ marginTop: 24 }}>
              <h3 className="option-title">Цвет ткани</h3>
              <div style={{ display: "flex", gap: 8 }}>
                {BAG_COLORS.map((c) => (
                  <button
                    key={c.id}
                    aria-label={c.name}
                    title={c.name}
                    onClick={() => setBagColor(c)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: c.hex,
                      border: c.id === bagColor.id ? "3px solid #8B7355" : "1px solid #ddd",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="option-group" style={{ marginTop: 24 }}>
              <h3 className="option-title">Цвет молнии</h3>
              <div style={{ display: "flex", gap: 8 }}>
                {ZIPPER_COLORS.map((c) => (
                  <button
                    key={c.id}
                    aria-label={c.name}
                    title={c.name}
                    onClick={() => setZipperColor(c)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: c.hex,
                      border: c.id === zipperColor.id ? "3px solid #8B7355" : "1px solid #ddd",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="option-group" style={{ marginTop: 24 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={tassel}
                  onChange={(e) => setTassel(e.target.checked)}
                />
                Кисточка (+{formatPrice(TASSEL_PRICE)})
              </label>
            </div>

            <button className="btn btn-primary" style={{ marginTop: 32 }} onClick={handleAdd}>
              {added ? "✓ Добавлено в корзину" : `В корзину — ${formatPrice(total)}`}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
