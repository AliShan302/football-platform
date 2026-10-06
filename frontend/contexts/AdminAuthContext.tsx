"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch, ensureCsrfToken, loginRequest, logoutRequest } from "@/lib/admin/client";
import type { AdminUser, AuthResponse } from "@/lib/admin/types";

interface AdminAuthValue {
  user: AdminUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<AdminUser>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        await ensureCsrfToken();
        const response = await adminFetch<AuthResponse>("/auth/me/");
        if (active) setUser(response.user);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    const expired = () => {
      setUser(null);
      router.replace("/admin/login");
    };
    window.addEventListener("admin-auth-expired", expired);
    void bootstrap();
    return () => {
      active = false;
      window.removeEventListener("admin-auth-expired", expired);
    };
  }, [router]);

  const login = useCallback(async (username: string, password: string) => {
    const response = await loginRequest(username, password);
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
      router.replace("/admin/login");
    }
  }, [router]);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const value = useContext(AdminAuthContext);
  if (!value) throw new Error("useAdminAuth must be used within AdminAuthProvider.");
  return value;
}
