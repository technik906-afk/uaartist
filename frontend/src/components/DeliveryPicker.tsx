"use client";

import { useEffect, useRef, useState } from "react";

import {
  getDeliveryCities,
  getDeliveryPoints,
  getDeliveryQuotes,
  type CheckoutItem,
  type DeliveryCity,
  type DeliveryPoint,
  type DeliveryQuote,
} from "@/lib/api/client";
import { formatPrice } from "@/lib/format";

export interface DeliverySelection {
  method: DeliveryQuote["method"];
  city_code?: number;
  city_name: string;
  postcode?: string;
  address?: string;
  pvz_code?: string;
  pvz_address?: string;
  price: number; // для отображения; сервер пересчитает сам
}

interface Props {
  items: CheckoutItem[];
  onChange: (selection: DeliverySelection | null) => void;
}

export default function DeliveryPicker({ items, onChange }: Props) {
  const [cityQuery, setCityQuery] = useState("");
  const [suggestions, setSuggestions] = useState<DeliveryCity[]>([]);
  const [city, setCity] = useState<DeliveryCity | null>(null);
  const [postcode, setPostcode] = useState("");
  const [quotes, setQuotes] = useState<DeliveryQuote[] | null>(null);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [method, setMethod] = useState<DeliveryQuote["method"] | null>(null);
  const [points, setPoints] = useState<DeliveryPoint[]>([]);
  const [pvz, setPvz] = useState<DeliveryPoint | null>(null);
  const [address, setAddress] = useState("");
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Подсказки городов (с дебаунсом; setState только в таймауте — асинхронно)
  useEffect(() => {
    if (city && cityQuery === city.full_name) return; // город выбран
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      if (cityQuery.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      getDeliveryCities(cityQuery)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 350);
    return () => clearTimeout(debounce.current);
  }, [cityQuery, city]);

  // Котировки при выборе города / вводе индекса (сбросы — в onChange инпутов)
  useEffect(() => {
    if (!city && postcode.length !== 6) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setLoadingQuotes(true);
      getDeliveryQuotes({
        city_code: city?.code,
        postcode: postcode.length === 6 ? postcode : undefined,
        items,
      })
        .then((data) => {
          if (!cancelled) setQuotes(data);
        })
        .catch(() => {
          if (!cancelled) setQuotes([]);
        })
        .finally(() => {
          if (!cancelled) setLoadingQuotes(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // items меняются только вместе с корзиной — сериализуем для зависимости
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, postcode, JSON.stringify(items)]);

  // Пункты выдачи для СДЭК ПВЗ (сброс — в обработчике выбора способа)
  useEffect(() => {
    if (method !== "cdek_pvz" || !city) return;
    let cancelled = false;
    getDeliveryPoints(city.code)
      .then((data) => {
        if (!cancelled) setPoints(data);
      })
      .catch(() => {
        if (!cancelled) setPoints([]);
      });
    return () => {
      cancelled = true;
    };
  }, [method, city]);

  // Сообщаем родителю о полном выборе
  useEffect(() => {
    if (!method || !quotes) {
      onChange(null);
      return;
    }
    const quote = quotes.find((q) => q.method === method);
    if (!quote) {
      onChange(null);
      return;
    }
    const base = {
      method,
      city_code: city?.code,
      city_name: city?.full_name ?? cityQuery,
      price: quote.price,
    };
    if (method === "cdek_pvz") {
      onChange(pvz ? { ...base, pvz_code: pvz.code, pvz_address: pvz.address } : null);
    } else if (method === "cdek_courier") {
      onChange(address.trim() ? { ...base, address } : null);
    } else {
      onChange(postcode.length === 6 && address.trim() ? { ...base, postcode, address } : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, quotes, pvz, address, postcode, city]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h3 className="font-serif" style={{ fontSize: "1.1rem" }}>
        Доставка
      </h3>

      {/* Город */}
      <div style={{ position: "relative" }}>
        <input
          type="text"
          placeholder="Город"
          className="form-input"
          value={cityQuery}
          onChange={(e) => {
            setCityQuery(e.target.value);
            setCity(null);
            setMethod(null);
            setQuotes(null);
            setPoints([]);
            setPvz(null);
          }}
        />
        {suggestions.length > 0 && !city && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: 8,
              zIndex: 20,
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {suggestions.map((s) => (
              <button
                key={s.code}
                type="button"
                onClick={() => {
                  setCity(s);
                  setCityQuery(s.full_name);
                  setSuggestions([]);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                {s.full_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Индекс — открывает вариант Почты России */}
      <input
        type="text"
        placeholder="Почтовый индекс — чтобы рассчитать Почту России"
        className="form-input"
        value={postcode}
        maxLength={6}
        onChange={(e) => setPostcode(e.target.value.replace(/\D/g, ""))}
      />

      {/* Способы с ценами */}
      {loadingQuotes && <p style={{ color: "#888", fontSize: "0.9rem" }}>Считаем доставку…</p>}
      {quotes && quotes.length === 0 && !loadingQuotes && (
        <p style={{ color: "#c00", fontSize: "0.9rem" }}>
          Не удалось рассчитать доставку — проверьте город/индекс.
        </p>
      )}
      {quotes && quotes.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          {quotes.map((q) => (
            <label
              key={q.method}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                border: `1px solid ${method === q.method ? "#8B7355" : "#ddd"}`,
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="delivery_method"
                checked={method === q.method}
                onChange={() => {
                  setMethod(q.method);
                  if (q.method !== "cdek_pvz") {
                    setPoints([]);
                    setPvz(null);
                  }
                }}
              />
              <span style={{ flex: 1 }}>
                {q.name}
                <span style={{ color: "#888", fontSize: "0.85rem" }}> · {q.days} дн</span>
              </span>
              <strong>{formatPrice(q.price)}</strong>
            </label>
          ))}
        </div>
      )}

      {/* ПВЗ */}
      {method === "cdek_pvz" && points.length > 0 && (
        <select
          className="form-input"
          value={pvz?.code ?? ""}
          onChange={(e) => setPvz(points.find((p) => p.code === e.target.value) ?? null)}
        >
          <option value="">Выберите пункт выдачи…</option>
          {points.map((p) => (
            <option key={p.code} value={p.code}>
              {p.address} ({p.work_time})
            </option>
          ))}
        </select>
      )}

      {/* Адрес для курьера и почты */}
      {(method === "cdek_courier" || method === "post") && (
        <input
          type="text"
          placeholder="Улица, дом, квартира"
          className="form-input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      )}
    </div>
  );
}
