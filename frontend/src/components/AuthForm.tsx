"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError } from "@/lib/api/client";
import { login, registerAccount } from "@/lib/auth";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [consent, setConsent] = useState(false);
  const isLogin = mode === "login";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await registerAccount({
          email,
          password,
          name: String(form.get("name") ?? ""),
          phone: String(form.get("phone") ?? ""),
          consent,
        });
      }
      router.push("/account");
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && !isLogin) {
        setError(
          "Не удалось зарегистрироваться: проверьте поля — возможно, email занят или пароль слишком простой."
        );
      } else if (err instanceof ApiError && err.status === 401) {
        setError("Неверный email или пароль.");
      } else {
        setError("Сервер недоступен. Попробуйте позже.");
      }
      setSubmitting(false);
    }
  };

  return (
    <section className="page-header" style={{ paddingBottom: 96 }}>
      <div className="container" style={{ maxWidth: 420 }}>
        <h1 className="page-title font-serif" style={{ textAlign: "center" }}>
          {isLogin ? "Вход" : "Регистрация"}
        </h1>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16, marginTop: 32 }}>
          {!isLogin && (
            <>
              <input
                name="name"
                type="text"
                placeholder="Имя"
                required
                minLength={2}
                className="form-input"
              />
              <input
                name="phone"
                type="tel"
                placeholder="Телефон"
                required
                className="form-input"
              />
            </>
          )}
          <input name="email" type="email" placeholder="Email" required className="form-input" />
          <input
            name="password"
            type="password"
            placeholder="Пароль"
            required
            minLength={8}
            className="form-input"
          />
          {!isLogin && (
            <label
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <span>Согласие на обработку персональных данных</span>
            </label>
          )}
          {error && (
            <p style={{ color: "#c00", fontSize: "0.9rem" }} role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={submitting || (!isLogin && !consent)}
            style={!isLogin && !consent ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
          >
            {submitting ? "..." : isLogin ? "Войти" : "Зарегистрироваться"}
          </button>
        </form>
        <p style={{ textAlign: "center", marginTop: 24, fontSize: "0.9rem" }}>
          {isLogin ? (
            <>
              Нет аккаунта? <Link href="/register">Зарегистрироваться</Link>
              <br />
              <Link href="/forgot-password" style={{ color: "#888" }}>
                Забыли пароль?
              </Link>
            </>
          ) : (
            <>
              Уже есть аккаунт? <Link href="/login">Войти</Link>
            </>
          )}
        </p>
      </div>
    </section>
  );
}
