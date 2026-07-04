"use client";

/** Избранное: список слагов товаров в localStorage (перенос легаси-фичи). */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WishlistState {
  slugs: string[];
  toggle: (slug: string) => void;
  has: (slug: string) => boolean;
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      slugs: [],
      toggle: (slug) =>
        set((state) => ({
          slugs: state.slugs.includes(slug)
            ? state.slugs.filter((s) => s !== slug)
            : [...state.slugs, slug],
        })),
      has: (slug) => get().slugs.includes(slug),
    }),
    { name: "uaartist_wishlist_v2" }
  )
);
