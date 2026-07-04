"use client";

import { useMounted } from "@/lib/hooks";
import { useWishlist } from "@/lib/wishlist";

/** Сердечко на карточке товара (клиентский остров внутри серверной карточки). */
export default function WishlistButton({ slug }: { slug: string }) {
  const mounted = useMounted();
  const slugs = useWishlist((s) => s.slugs);
  const toggle = useWishlist((s) => s.toggle);
  const active = mounted && slugs.includes(slug);

  return (
    <button
      className={`product-wishlist${active ? " active" : ""}`}
      aria-label={active ? "Убрать из избранного" : "В избранное"}
      onClick={(e) => {
        // кнопка живёт внутри ссылки на товар — не даём ей сработать
        e.preventDefault();
        e.stopPropagation();
        toggle(slug);
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    </button>
  );
}
