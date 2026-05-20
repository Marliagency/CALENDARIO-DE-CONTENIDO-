import { createContext, useContext, useEffect, useState } from "react";
import { mockMode } from "./api/client";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  workspaces?: { slug: string; name: string; role: string; brandColorPrimary: string }[];
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

// Usuario mock en modo VITE_MOCK_API=1 — coincide con currentUser de mock-data
const MOCK_USER: AuthUser = {
  id: "user-diego",
  email: "diego@qyro.app",
  name: "Diego",
  workspaces: [
    { slug: "qyro", name: "QYRO", role: "owner", brandColorPrimary: "#3B82F6" },
    { slug: "personal", name: "Diego Personal", role: "owner", brandColorPrimary: "#64748B" },
  ],
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(mockMode ? MOCK_USER : null);
  const [loading, setLoading] = useState(!mockMode);

  async function refresh() {
    if (mockMode) {
      setUser(MOCK_USER);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/v1/auth/me`, { credentials: "include" });
      if (res.ok) setUser(await res.json());
      else setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    if (mockMode) {
      setUser(MOCK_USER);
      return;
    }
    const res = await fetch(`${BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Login failed");
    await refresh();
  }

  async function register(email: string, password: string, name?: string) {
    if (mockMode) {
      setUser(MOCK_USER);
      return;
    }
    const res = await fetch(`${BASE}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, name }),
    });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(typeof body.error === "string" ? body.error : "Registration failed");
    }
    await refresh();
  }

  async function logout() {
    if (mockMode) {
      // En modo mock no se cierra sesión.
      return;
    }
    await fetch(`${BASE}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
