import Link from "next/link";

const links = [
  ["Dashboard", "/"],
  ["Events", "/events"],
  ["Live", "/live"],
] as const;

export function Header() {
  return (
    <header className="border-b border-white/10 bg-[#071b18] text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-3 font-bold tracking-tight">
          <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-emerald-400 text-lg text-emerald-950">●</span>
          Football Hub
        </Link>
        <nav aria-label="Primary navigation">
          <ul className="flex items-center gap-1 text-sm font-semibold text-emerald-50">
            {links.map(([label, href]) => (
              <li key={href}>
                <Link className="block rounded-full px-4 py-2 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300" href={href}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
