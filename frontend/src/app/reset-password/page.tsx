"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { ApiError } from "@/lib/api/client";
import { confirmPasswordReset } from "@/lib/auth";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const uid = params.get("uid") ?? "";
  const token = params.get("token") ?? "";

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!uid || !token) {
    return (
      <p style={{ textAlign: "center", marginTop: 24 }}>
        Некорректная ссылка. Запросите сброс пароля{" "}
        <Link href="/forgot-password" style={{ textDecoration: "underline" }}>
          заново
        </Link>
        .
      </p>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await confirmPasswordReset(
        uid,
        token,
        String(new FormData(e.currentTarget).get("password") ?? "")
      );
      router.push("/login");
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError("Ссылка недействительна или устарела. Запросите сброс заново.");
      } else {
        setError("Сервер недоступен. Попробуйте позже.");
      }
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16, marginTop: 32 }}>
      <input
        name="password"
        type="password"
        placeholder="Новый пароль"
        required
        minLength={8}
        className="form-input"
        autoComplete="new-password"
      />
      {error && (
        <p style={{ color: "#c00", fontSize: "0.9rem" }} role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
        {submitting ? "..." : "Установить пароль"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <section className="page-header" style={{ paddingBottom: 96 }}>
      <div className="container" style={{ maxWidth: 420 }}>
        <h1 className="page-title font-serif" style={{ textAlign: "center" }}>
          Новый пароль
        </h1>
        {/* useSearchParams требует Suspense-границу при пререндере */}
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </section>
  );
}
