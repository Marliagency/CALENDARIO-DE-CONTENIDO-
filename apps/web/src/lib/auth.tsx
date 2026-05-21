import { createContext, useContext, useEffect, useState } from "react";
import { mockMode } from "./api/client";
import { dataCache } from "./api/data-cache";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  notificationPrefs?: Record<string, unknown>;
  workspaces?: { slug: string; name: string; role: string; brandColorPrimary: string }[];
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: AuthUser | null) => void;
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
      if (res.ok) {
        const u: AuthUser = await res.json();
        setUser(u);
        // Pre-cargar todos los datos de los workspaces del usuario en caché.
        if (u.workspaces && u.workspaces.length > 0) {
          await dataCache.prefetchAll(u.workspaces.map((w) => w.slug));
        }
      } else {
        setUser(null);
        dataCache.reset();
      }
    } catch {
      setUser(null);
      dataCache.reset();
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
      return;
    }
    await fetch(`${BASE}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    dataCache.reset();
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout, refresh, setUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
