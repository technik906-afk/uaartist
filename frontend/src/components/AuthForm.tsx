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
  const isLogin = mode === "login";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    try {
      await (isLogin ? login(email, password) : registerAccount(email, password));
      router.push("/account");
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && !isLogin) {
        setError(
          "Не удалось зарегистрироваться: возможно, email занят или пароль слишком простой."
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
          <input name="email" type="email" placeholder="Email" required className="form-input" />
          <input
            name="password"
            type="password"
            placeholder="Пароль"
            required
            minLength={8}
            className="form-input"
          />
          {error && (
            <p style={{ color: "#c00", fontSize: "0.9rem" }} role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
            {submitting ? "..." : isLogin ? "Войти" : "Зарегистрироваться"}
          </button>
        </form>
        <p style={{ textAlign: "center", marginTop: 24, fontSize: "0.9rem" }}>
          {isLogin ? (
            <>
              Нет аккаунта? <Link href="/register">Зарегистрироваться</Link>
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
