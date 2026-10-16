"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (name: string, email: string, password: string, role?: string) => Promise<User>;
  logout: () => void;
  /** Re-reads the signed-in user from the server, e.g. after editing the profile. */
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => { throw new Error("AuthProvider not mounted"); },
  signup: async () => { throw new Error("AuthProvider not mounted"); },
  logout: () => {},
  refreshUser: async () => null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          setToken("exists");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) {
        setUser(null);
        setToken(null);
        return null;
      }
      const data = await res.json();
      setUser(data.user);
      setToken("exists");
      return data.user;
    } catch {
      return null;
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string, role?: string): Promise<User> => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setToken(null);
    setUser(null);
    document.cookie = "token=; max-age=0; path=/";
    window.location.href = "/";
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
