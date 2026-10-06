"use client";

import Link from "next/link";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

export function AdminNavigation() {
  const { user, logout } = useAdminAuth();
  if (!user?.is_staff) return null;
  return (
    <nav className="border-b border-slate-200 bg-white" aria-label="Administration">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-1 px-4 py-3 sm:gap-2 sm:px-6 lg:px-8">
        <Link className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-black text-white" href="/admin">Admin</Link>
        <Link className="rounded-lg px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100" href="/admin/events">Events</Link>
        <Link className="rounded-lg px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100" href="/admin/teams">Teams</Link>
        <Link className="rounded-lg px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100" href="/admin/matches">Matches</Link>
        <span className="order-last w-full pt-2 text-sm text-slate-500 sm:order-none sm:ml-auto sm:w-auto sm:pt-0">Signed in as {user.username}</span>
        <button className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold hover:border-emerald-500" type="button" onClick={() => void logout()}>Log out</button>
      </div>
    </nav>
  );
}
