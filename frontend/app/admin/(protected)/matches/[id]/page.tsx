"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MatchControl } from "@/components/admin/MatchControl";
import type { MatchDetail } from "@/lib/api/types";
import { adminErrorMessage } from "@/lib/admin/client";
import { adminResources } from "@/lib/admin/resources";

export default function AdminMatchPage() {
  const { id } = useParams<{ id: string }>(); const [match, setMatch] = useState<MatchDetail | null>(null); const [error, setError] = useState("");
  useEffect(() => { let active = true; adminResources.match(id).then((value) => active && setMatch(value)).catch((caught) => active && setError(adminErrorMessage(caught))); return () => { active = false; }; }, [id]);
  return <div className="page-shell">{error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p> : match ? <MatchControl initialMatch={match} /> : <p role="status">Loading match controls…</p>}</div>;
}
