import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api } from "./api";

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  is_admin: boolean;
  avatar_url: string | null;
  bio: string;
  social_instagram: string;
  social_youtube: string;
  social_facebook: string;
  social_tiktok: string;
  favorites_public: boolean;
  visits_public: boolean;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, username: string, email: string, password: string, agreedPledge: boolean) => Promise<void>;
  loginWithGoogle: (credential: string, agreedPledge: boolean) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUser: (u: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((d) => setUser(d.user))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const d = await api.login(email, password);
    localStorage.setItem("token", d.token);
    setUser(d.user);
  }

  async function register(name: string, username: string, email: string, password: string, agreedPledge: boolean) {
    const d = await api.register(name, username, email, password, agreedPledge);
    localStorage.setItem("token", d.token);
    setUser(d.user);
  }

  async function loginWithGoogle(credential: string, agreedPledge: boolean) {
    const d = await api.loginWithGoogle(credential, agreedPledge);
    localStorage.setItem("token", d.token);
    setUser(d.user);
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  async function refreshUser() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const d = await api.me();
    setUser(d.user);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
