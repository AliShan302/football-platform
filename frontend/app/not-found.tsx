import Link from "next/link";

export default function NotFound() {
  return <div className="page-shell grid min-h-[55vh] place-items-center text-center"><div><p className="eyebrow">404 · Not found</p><h1 className="mt-3 text-4xl font-black text-slate-950">That football page is off the pitch</h1><p className="mt-4 text-slate-600">The event or match may no longer exist.</p><Link className="button-primary mt-7" href="/">Return to dashboard</Link></div></div>;
}
