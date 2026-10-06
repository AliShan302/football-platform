"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { adminErrorMessage } from "@/lib/admin/client";

export default function AdminLoginPage() {
  const { user, loading, login } = useAdminAuth();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!loading && user?.is_staff) router.replace("/admin");
  }, [loading, user, router]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      await login(String(data.get("username")), String(data.get("password")));
      router.replace("/admin");
    } catch (caught) { setError(adminErrorMessage(caught)); }
    finally { setPending(false); }
  }
  return (
    <div className="page-shell grid min-h-[65vh] place-items-center">
      <form className="section-card w-full max-w-md space-y-5" onSubmit={submit}>
        <div><p className="eyebrow">Administration</p><h1 className="text-3xl font-black">Sign in</h1></div>
        {error && <p role="alert" className="alert-error">{error}</p>}
        <label className="field-label">Username<input className="form-control mt-1.5 font-normal" name="username" required autoComplete="username" /></label>
        <label className="field-label">Password<input className="form-control mt-1.5 font-normal" name="password" type="password" required autoComplete="current-password" /></label>
        <button className="button-primary w-full" disabled={pending} type="submit">{pending ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}
