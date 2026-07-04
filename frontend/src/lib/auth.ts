"use client";

/**
 * JWT-аутентификация: токены в zustand+localStorage.
 * authFetch добавляет Bearer и один раз пробует refresh при 401.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { API_BASE, ApiError, type OrderRead } from "@/lib/api/client";

interface AuthState {
  access: string | null;
  refresh: string | null;
  setTokens: (access: string, refresh: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      access: null,
      refresh: null,
      setTokens: (access, refresh) => set({ access, refresh }),
      logout: () => set({ access: null, refresh: null }),
    }),
    { name: "uaartist_auth" }
  )
);

export interface Profile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  date_joined: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone: string;
  consent: boolean;
}

async function jsonOrThrow(response: Response) {
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new ApiError(response.status, data);
  return data;
}

export async function registerAccount(payload: RegisterData) {
  const data = await jsonOrThrow(
    await fetch(`${API_BASE}/auth/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
  useAuth.getState().setTokens(data.access, data.refresh);
}

export async function login(email: string, password: string) {
  const data = await jsonOrThrow(
    await fetch(`${API_BASE}/auth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // username = email (так регистрируем на бэкенде)
      body: JSON.stringify({ username: email, password }),
    })
  );
  useAuth.getState().setTokens(data.access, data.refresh);
}

async function tryRefresh(): Promise<boolean> {
  const { refresh, setTokens, logout } = useAuth.getState();
  if (!refresh) return false;
  try {
    const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!response.ok) throw new Error("refresh failed");
    const data = await response.json();
    setTokens(data.access, data.refresh ?? refresh);
    return true;
  } catch {
    logout();
    return false;
  }
}

/** fetch с Bearer; при 401 — одна попытка refresh и повтор запроса. */
export async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const doFetch = () =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
        Authorization: `Bearer ${useAuth.getState().access}`,
      },
    });

  let response = await doFetch();
  if (response.status === 401 && (await tryRefresh())) {
    response = await doFetch();
  }
  return response;
}

export async function fetchProfile(): Promise<Profile> {
  return jsonOrThrow(await authFetch("/auth/me/"));
}

export async function updateProfile(data: {
  first_name?: string;
  phone?: string;
}): Promise<Profile> {
  return jsonOrThrow(await authFetch("/auth/me/", { method: "PATCH", body: JSON.stringify(data) }));
}

export async function changePassword(oldPassword: string, newPassword: string) {
  return jsonOrThrow(
    await authFetch("/auth/password/change/", {
      method: "POST",
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    })
  );
}

export async function requestPasswordReset(email: string) {
  return jsonOrThrow(
    await fetch(`${API_BASE}/auth/password/reset/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
  );
}

export async function confirmPasswordReset(uid: string, token: string, newPassword: string) {
  return jsonOrThrow(
    await fetch(`${API_BASE}/auth/password/reset/confirm/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, token, new_password: newPassword }),
    })
  );
}

export async function fetchMyOrders(): Promise<{ count: number; results: OrderRead[] }> {
  return jsonOrThrow(await authFetch("/orders/my/"));
}
