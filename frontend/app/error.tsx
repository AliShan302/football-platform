"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="page-shell grid min-h-[55vh] place-items-center text-center"><div className="max-w-lg"><p className="eyebrow">Connection error</p><h1 className="mt-3 text-4xl font-black text-slate-950">We could not load this page</h1><p className="mt-4 leading-7 text-slate-600">The football API may be temporarily unavailable. Try again or return to the dashboard.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><button type="button" onClick={reset} className="button-primary">Try again</button><Link href="/" className="button-secondary">Dashboard</Link></div></div></div>;
}
