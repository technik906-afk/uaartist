/**
 * Опции конструктора — зеркало backend/apps/orders/pricing.py.
 * Цены здесь только для отображения; сервер пересчитывает заказ сам.
 */

export const SIZES = [
  { id: "small", name: "Мини", price: 2490 },
  { id: "medium", name: "Стандарт", price: 2890 },
  { id: "large", name: "Макси", price: 3490 },
] as const;

export const BAG_COLORS = [
  { id: "beige", name: "Бежевый", hex: "#E8E4D9" },
  { id: "sage", name: "Шалфей", hex: "#9CAF88" },
  { id: "olive", name: "Олива", hex: "#8B9A6B" },
  { id: "gray", name: "Серый", hex: "#B8B8B8" },
  { id: "natural", name: "Натуральный", hex: "#D4C4B0" },
  { id: "white", name: "Белый", hex: "#F5F3F0" },
] as const;

export const ZIPPER_COLORS = [
  { id: "gold", name: "Золотая", hex: "#D4AF37" },
  { id: "silver", name: "Серебряная", hex: "#C0C0C0" },
  { id: "bronze", name: "Бронзовая", hex: "#CD7F32" },
  { id: "black", name: "Чёрная", hex: "#2C2C2C" },
  { id: "beige", name: "Бежевая", hex: "#C4B5A0" },
] as const;

export const TASSEL_PRICE = 200;
