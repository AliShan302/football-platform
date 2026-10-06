"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAdminAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace("/admin/login");
  }, [loading, user, router]);
  if (loading) return <p role="status" className="page-shell">Checking administrator session…</p>;
  if (!user) return <p role="status" className="page-shell">Redirecting to login…</p>;
  if (!user.is_staff) return <section className="page-shell"><h1 className="text-3xl font-black">Administrator access required</h1><p className="mt-3 text-slate-600">Your account is authenticated but does not have staff permissions.</p></section>;
  return children;
}
