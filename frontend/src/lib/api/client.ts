/**
 * Typed API client for the Django backend.
 * Types come from the generated OpenAPI schema (npm run gen:api).
 */

import type { components } from "./schema";

export type ProductList = components["schemas"]["ProductList"];
export type ProductDetail = components["schemas"]["ProductDetail"];
export type ProductVariant = components["schemas"]["ProductVariant"];
export type ProductImage = components["schemas"]["ProductImage"];
export type Category = components["schemas"]["Category"];
export type Checkout = components["schemas"]["Checkout"];
export type CheckoutItem = components["schemas"]["CheckoutItem"];
/** Конфиг конструктора — единственный источник истины: OpenAPI-схема бэкенда. */
export type CustomConfig = NonNullable<CheckoutItem["custom"]>;
export type OrderRead = components["schemas"]["OrderRead"];
export type PaginatedProducts = components["schemas"]["PaginatedProductListList"];
export type ConstructorOption = components["schemas"]["ConstructorOption"];
export type ConstructorOptions = components["schemas"]["ConstructorOptionsResponse"];
export type PaymentRead = components["schemas"]["PaymentRead"];
export type PaymentStatusResponse = components["schemas"]["PaymentStatusResponse"];

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown
  ) {
    super(`API error ${status}`);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // ВАЖНО: init раскрывается первым, headers мержатся после —
  // иначе init.headers затирает Content-Type (ловили 415 на чекауте).
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new ApiError(response.status, data);
  return data as T;
}

export interface ProductFilters {
  category?: string;
  min_price?: string;
  max_price?: string;
  in_stock?: string;
  search?: string;
  ordering?: string;
  page?: string;
}

export function getProducts(filters: ProductFilters = {}): Promise<PaginatedProducts> {
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== "") as [string, string][]
  );
  const qs = params.toString();
  return request<PaginatedProducts>(`/products/${qs ? `?${qs}` : ""}`);
}

export function getProduct(slug: string): Promise<ProductDetail> {
  return request<ProductDetail>(`/products/${slug}/`);
}

export function getCategories(): Promise<Category[]> {
  return request<Category[]>(`/categories/`);
}

export function getConstructorOptions(): Promise<ConstructorOptions> {
  return request<ConstructorOptions>(`/constructor/options/`);
}

export interface DeliveryPayload {
  method: "cdek_pvz" | "cdek_courier" | "post";
  city_code?: number;
  city_name: string;
  postcode?: string;
  address?: string;
  pvz_code?: string;
  pvz_address?: string;
}

/** Payload чекаута (валидацию делает сервер — тип для удобства фронта). */
export interface CheckoutPayload {
  customer: { name: string; phone: string; email: string; comment?: string };
  items: CheckoutItem[];
  delivery: DeliveryPayload;
}

export function createOrder(
  payload: CheckoutPayload,
  accessToken?: string | null
): Promise<OrderRead> {
  return request<OrderRead>(`/orders/`, {
    method: "POST",
    body: JSON.stringify(payload),
    // С токеном заказ привяжется к аккаунту; без — гостевой чекаут.
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

// --- Доставка ---
export interface DeliveryCity {
  code: number;
  full_name: string;
}
export interface DeliveryPoint {
  code: string;
  name: string;
  address: string;
  work_time: string;
}
export interface DeliveryQuote {
  method: "cdek_pvz" | "cdek_courier" | "post";
  name: string;
  price: number;
  days: string;
}

export function getDeliveryCities(q: string): Promise<DeliveryCity[]> {
  return request<DeliveryCity[]>(`/delivery/cities/?q=${encodeURIComponent(q)}`);
}

export function getDeliveryPoints(cityCode: number): Promise<DeliveryPoint[]> {
  return request<DeliveryPoint[]>(`/delivery/points/?city_code=${cityCode}`);
}

export function getDeliveryQuotes(payload: {
  city_code?: number;
  postcode?: string;
  items: CheckoutItem[];
}): Promise<DeliveryQuote[]> {
  return request<DeliveryQuote[]>(`/delivery/quote/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Создать платёж ЮKassa (или переиспользовать незавершённый). */
export function createPayment(orderId: number, email: string): Promise<PaymentRead> {
  return request<PaymentRead>(`/payments/create/`, {
    method: "POST",
    body: JSON.stringify({ order_id: orderId, email }),
  });
}

/** Статус оплаты заказа (поллинг со страницы «Спасибо»). */
export function getPaymentStatus(orderId: number, email: string): Promise<PaymentStatusResponse> {
  const params = new URLSearchParams({ order_id: String(orderId), email });
  return request<PaymentStatusResponse>(`/payments/status/?${params}`);
}

export { ApiError };
