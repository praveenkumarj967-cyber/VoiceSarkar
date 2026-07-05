"use client";
import { useState, useEffect } from "react";
import { authApi } from "@/lib/api";

export type User = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("vs_user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    localStorage.setItem("vs_token", data.access_token);
    localStorage.setItem("vs_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("vs_token");
    localStorage.removeItem("vs_user");
    setUser(null);
    window.location.href = "/login";
  };

  return { user, loading, login, logout };
}
