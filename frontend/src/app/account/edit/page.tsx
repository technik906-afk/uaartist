"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api/client";
import { changePassword, fetchProfile, updateProfile, useAuth, type Profile } from "@/lib/auth";
import { useMounted } from "@/lib/hooks";

export default function EditProfilePage() {
  const router = useRouter();
  const mounted = useMounted();
  const access = useAuth((s) => s.access);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    if (!access) {
      router.replace("/login");
      return;
    }
    fetchProfile()
      .then(setProfile)
      .catch(() => router.replace("/login"));
  }, [mounted, access, router]);

  if (!mounted || !access || !profile) return null;

  const handleProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileErr(null);
    const form = new FormData(e.currentTarget);
    try {
      const updated = await updateProfile({
        first_name: String(form.get("first_name") ?? ""),
        phone: String(form.get("phone") ?? ""),
      });
      setProfile(updated);
      setProfileMsg("Профиль обновлён.");
    } catch {
      setProfileErr("Не удалось сохранить. Проверьте формат телефона.");
    }
  };

  const handlePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordErr(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      await changePassword(
        String(data.get("old_password") ?? ""),
        String(data.get("new_password") ?? "")
      );
      setPasswordMsg("Пароль изменён.");
      form.reset();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setPasswordErr(
          "Не удалось сменить пароль: проверьте текущий пароль, новый должен быть надёжным."
        );
      } else {
        setPasswordErr("Сервер недоступен. Попробуйте позже.");
      }
    }
  };

  return (
    <section className="products" style={{ padding: "120px 0 96px" }}>
      <div className="container" style={{ maxWidth: 480 }}>
        <p style={{ marginBottom: 8 }}>
          <Link href="/account" style={{ fontSize: "0.85rem", color: "#888" }}>
            ← Личный кабинет
          </Link>
        </p>
        <h1 className="page-title font-serif" style={{ marginBottom: 32 }}>
          Редактировать профиль
        </h1>

        <form onSubmit={handleProfile} style={{ display: "grid", gap: 16 }}>
          <label style={{ fontSize: "0.85rem", color: "#888" }}>
            Email: {profile.email} (изменить нельзя)
          </label>
          <input
            name="first_name"
            type="text"
            placeholder="Имя"
            required
            minLength={2}
            defaultValue={profile.first_name}
            className="form-input"
          />
          <input
            name="phone"
            type="tel"
            placeholder="Телефон"
            required
            defaultValue={profile.phone}
            className="form-input"
          />
          {profileMsg && <p style={{ color: "#2a7d2a", fontSize: "0.9rem" }}>{profileMsg}</p>}
          {profileErr && (
            <p style={{ color: "#c00", fontSize: "0.9rem" }} role="alert">
              {profileErr}
            </p>
          )}
          <button type="submit" className="btn btn-primary">
            Сохранить
          </button>
        </form>

        <h2 className="font-serif" style={{ fontSize: "1.25rem", margin: "48px 0 16px" }}>
          Смена пароля
        </h2>
        <form onSubmit={handlePassword} style={{ display: "grid", gap: 16 }}>
          <input
            name="old_password"
            type="password"
            placeholder="Текущий пароль"
            required
            className="form-input"
            autoComplete="current-password"
          />
          <input
            name="new_password"
            type="password"
            placeholder="Новый пароль"
            required
            minLength={8}
            className="form-input"
            autoComplete="new-password"
          />
          {passwordMsg && <p style={{ color: "#2a7d2a", fontSize: "0.9rem" }}>{passwordMsg}</p>}
          {passwordErr && (
            <p style={{ color: "#c00", fontSize: "0.9rem" }} role="alert">
              {passwordErr}
            </p>
          )}
          <button type="submit" className="btn btn-secondary">
            Сменить пароль
          </button>
        </form>
      </div>
    </section>
  );
}
