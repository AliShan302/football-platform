"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  ["Dashboard", "/"],
  ["Events", "/events"],
  ["Live", "/live"],
  ["Admin", "/admin"],
] as const;

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-30 border-b border-white/10 bg-[#071b18] text-white">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Football Hub home" className="flex cursor-pointer items-center gap-3 font-bold tracking-tight">
          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-400 text-emerald-950">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="m12 7 3 2.2-1.15 3.55h-3.7L9 9.2 12 7Z" fill="currentColor" />
              <path d="m9 9.2-3.35-.65M15 9.2l3.35-.65M10.15 12.75l-2.1 2.85M13.85 12.75l2.1 2.85M8.05 15.6l.8 3.05M15.95 15.6l-.8 3.05" />
            </svg>
          </span>
          Football Hub
        </Link>
        <button className="grid size-11 place-items-center rounded-xl border border-white/15 md:hidden" type="button" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen((value) => !value)}>
          <span aria-hidden="true" className="text-xl leading-none">{open ? "×" : "☰"}</span>
        </button>
        <nav aria-label="Primary navigation" className="hidden md:block">
          <ul className="flex items-center gap-1 text-sm font-semibold text-emerald-50">
            {links.map(([label, href]) => (
              <li key={href}>
                <Link className="block rounded-xl px-4 py-2.5 hover:bg-white/10" href={href}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      {open && (
        <nav id="mobile-navigation" aria-label="Mobile navigation" className="border-t border-white/10 px-4 py-3 md:hidden">
          <ul className="mx-auto grid max-w-7xl gap-1 text-sm font-semibold text-emerald-50">
            {links.map(([label, href]) => <li key={href}><Link className="block rounded-xl px-4 py-3 hover:bg-white/10" href={href} onClick={() => setOpen(false)}>{label}</Link></li>)}
          </ul>
        </nav>
      )}
    </header>
  );
}
