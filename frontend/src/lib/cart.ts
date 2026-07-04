"use client";

/**
 * Client cart (decision: localStorage cart, server recomputes at checkout).
 * Prices here are for DISPLAY only — the backend re-prices every order.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { CustomConfig } from "@/lib/api/client";

export type { CustomConfig };

export interface CartItem {
  /** уникальный ключ строки корзины */
  key: string;
  /** каталожная позиция */
  variantId?: number;
  /** кастомная позиция конструктора */
  custom?: CustomConfig;
  name: string;
  price: number; // display price
  image?: string | null;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addVariant: (item: Omit<CartItem, "key" | "quantity" | "custom">) => void;
  addCustom: (config: CustomConfig, name: string, price: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      addVariant: (item) =>
        set((state) => {
          const key = `v-${item.variantId}`;
          const existing = state.items.find((i) => i.key === key);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.key === key ? { ...i, quantity: i.quantity + 1 } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, key, quantity: 1 }] };
        }),

      addCustom: (config, name, price) =>
        set((state) => ({
          items: [
            ...state.items,
            {
              key: `c-${Date.now()}`,
              custom: config,
              name,
              price,
              quantity: 1,
            },
          ],
        })),

      setQuantity: (key, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.key === key ? { ...i, quantity: Math.max(1, quantity) } : i
          ),
        })),

      remove: (key) => set((state) => ({ items: state.items.filter((i) => i.key !== key) })),

      clear: () => set({ items: [] }),
    }),
    { name: "uaartist_cart_v2" }
  )
);

export const cartTotal = (items: CartItem[]) =>
  items.reduce((sum, i) => sum + i.price * i.quantity, 0);

export const cartCount = (items: CartItem[]) => items.reduce((sum, i) => sum + i.quantity, 0);

export { formatPrice } from "@/lib/format";
