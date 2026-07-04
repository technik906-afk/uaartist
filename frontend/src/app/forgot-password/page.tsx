"use client";

import Link from "next/link";
import { useState } from "react";

import { requestPasswordReset } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(String(new FormData(e.currentTarget).get("email") ?? ""));
      setSent(true);
    } catch {
      setError("Сервер недоступен. Попробуйте позже.");
      setSubmitting(false);
    }
  };

  return (
    <section className="page-header" style={{ paddingBottom: 96 }}>
      <div className="container" style={{ maxWidth: 420 }}>
        <h1 className="page-title font-serif" style={{ textAlign: "center" }}>
          Сброс пароля
        </h1>
        {sent ? (
          <p style={{ textAlign: "center", marginTop: 24 }}>
            Если такой email зарегистрирован, мы отправили письмо со ссылкой для сброса пароля.
            Проверьте почту.
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16, marginTop: 32 }}>
            <input name="email" type="email" placeholder="Email" required className="form-input" />
            {error && (
              <p style={{ color: "#c00", fontSize: "0.9rem" }} role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
              {submitting ? "..." : "Отправить ссылку"}
            </button>
          </form>
        )}
        <p style={{ textAlign: "center", marginTop: 24, fontSize: "0.9rem" }}>
          <Link href="/login">Вернуться ко входу</Link>
        </p>
      </div>
    </section>
  );
}
