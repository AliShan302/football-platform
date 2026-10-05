import Link from "next/link";
import { pageFromUrl } from "@/lib/format";

export function Pagination({ next, previous }: { next: string | null; previous: string | null }) {
  const nextPage = pageFromUrl(next);
  const previousPage = pageFromUrl(previous);
  if (!nextPage && !previousPage) return null;
  return (
    <nav aria-label="Event pages" className="mt-8 flex items-center justify-between gap-4">
      {previousPage ? <Link className="button-secondary" href={`/events?page=${previousPage}`}>← Previous</Link> : <span />}
      {nextPage && <Link className="button-secondary" href={`/events?page=${nextPage}`}>Next →</Link>}
    </nav>
  );
}
