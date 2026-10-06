"use client";

import Link from "next/link";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

export function AdminNavigation() {
  const { user, logout } = useAdminAuth();
  if (!user?.is_staff) return null;
  return (
    <nav className="border-b border-slate-200 bg-white" aria-label="Administration">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-5 py-3 sm:px-8">
        <Link className="button-dark" href="/admin">Admin</Link>
        <Link className="rounded-lg px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100" href="/admin/events">Events</Link>
        <Link className="rounded-lg px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100" href="/admin/teams">Teams</Link>
        <span className="ml-auto text-sm text-slate-500">Signed in as {user.username}</span>
        <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold" type="button" onClick={() => void logout()}>Log out</button>
      </div>
    </nav>
  );
}
