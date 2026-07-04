"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/lib/auth";
import { cartCount, useCart } from "@/lib/cart";
import { useMounted } from "@/lib/hooks";

const NAV = [
  { href: "/", label: "Главная" },
  { href: "/catalog", label: "Каталог" },
  { href: "/testimonials", label: "Отзывы" },
  { href: "/contacts", label: "Контакты" },
];

function CartIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

export default function Header() {
  const pathname = usePathname();
  const items = useCart((s) => s.items);
  // Гидрация: localStorage доступен только в браузере — счётчик рисуем после mount.
  const mounted = useMounted();
  const count = mounted ? cartCount(items) : 0;
  const access = useAuth((s) => s.access);
  const authHref = mounted && access ? "/account" : "/login";
  const authLabel = mounted && access ? "Аккаунт" : "Войти";

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="header">
      <div className="container">
        <div className="header-container">
          <Link href="/" className="logo">
            uaartist
          </Link>
          <nav className={`nav${menuOpen ? " active" : ""}`}>
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={pathname === href ? "active" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <Link href={authHref} className="filter-btn" style={{ marginRight: 12 }}>
              {authLabel}
            </Link>
            <Link href="/cart" className="btn-cart-header" aria-label="Корзина">
              <CartIcon />
              <span className="cart-count">{count}</span>
            </Link>
          </div>
        </div>
      </div>
      <div className="mobile-actions">
        <Link href="/cart" className="mobile-cart-btn" aria-label="Корзина">
          <CartIcon />
          <span className="cart-count">{count}</span>
        </Link>
        <button
          className="mobile-menu-btn"
          aria-label="Меню"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 12h16" />
            <path d="M4 18h16" />
            <path d="M4 6h16" />
          </svg>
        </button>
      </div>
    </header>
  );
}
