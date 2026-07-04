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
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
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

export function createOrder(payload: Checkout, accessToken?: string | null): Promise<OrderRead> {
  return request<OrderRead>(`/orders/`, {
    method: "POST",
    body: JSON.stringify(payload),
    // С токеном заказ привяжется к аккаунту; без — гостевой чекаут.
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export { ApiError };
