import { useEffect, useState } from "react";

const TOKEN_KEY = "404nfd_auth_token";

export interface AuthUser {
  telegramId: number;
  username: string | null;
  firstName: string;
  photoUrl: string | null;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

async function fetchMe(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return res.json();
}

// Shared across every component that cares who's logged in (AuthBadge, the queue button, …) so
// logging in from one place is reflected everywhere at once, without each doing its own fetch.
type Listener = (u: AuthUser | null) => void;
let currentUser: AuthUser | null = null;
let loaded = false;
const listeners: Listener[] = [];

function setCurrentUser(u: AuthUser | null): void {
  currentUser = u;
  listeners.forEach((cb) => cb(u));
}

/** React hook: current logged-in user, or null. Undefined briefly on first mount while loading. */
export function useAuthUser(): AuthUser | null | undefined {
  const [user, setUser] = useState<AuthUser | null | undefined>(loaded ? currentUser : undefined);

  useEffect(() => {
    const listener: Listener = setUser;
    listeners.push(listener);

    if (!loaded) {
      loaded = true;
      void fetchMe().then(setCurrentUser);
    } else {
      setUser(currentUser);
    }

    return () => {
      const i = listeners.indexOf(listener);
      if (i >= 0) listeners.splice(i, 1);
    };
  }, []);

  return user;
}

export async function loginWithTelegram(payload: Record<string, unknown>): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/api/auth/telegram`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Telegram login failed");
  const data = await res.json();
  setToken(data.token);
  setCurrentUser(data.user);
  return data.user;
}

export async function logout(): Promise<void> {
  const token = getToken();
  clearToken();
  setCurrentUser(null);
  if (token) {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
}

/** Attaches the auth token (if logged in) so backend routes can prefer the Telegram identity. */
export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
