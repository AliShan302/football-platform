"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminErrorMessage } from "@/lib/admin/client";
import { adminResources } from "@/lib/admin/resources";
import type { TeamInput } from "@/lib/admin/types";

export function TeamForm({ teamId }: { teamId?: number }) {
  const router = useRouter();
  const [values, setValues] = useState<TeamInput>({ name: "", code: "" });
  const [logo, setLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(teamId));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!teamId) return;
    let active = true;
    adminResources.team(teamId).then((team) => { if (active) { setValues({ name: team.name, code: team.code }); setLogo(team.logo); } }).catch((caught) => active && setError(adminErrorMessage(caught))).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [teamId]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setError("");
    try { if (teamId) await adminResources.updateTeam(teamId, values); else await adminResources.createTeam(values); router.push("/admin/teams"); router.refresh(); }
    catch (caught) { setError(adminErrorMessage(caught)); }
    finally { setPending(false); }
  }
  if (loading) return <p role="status">Loading team…</p>;
  return <form className="card max-w-xl space-y-5 p-6" onSubmit={submit}>{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}{logo && <p className="text-sm text-slate-500">An existing team logo is preserved by this edit.</p>}<label className="block font-bold">Name<input className="mt-2 w-full rounded-xl border p-3 font-normal" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} required /></label><label className="block font-bold">Code<input className="mt-2 w-full rounded-xl border p-3 font-normal uppercase" maxLength={10} value={values.code} onChange={(e) => setValues({ ...values, code: e.target.value.toUpperCase() })} required /></label><button className="button-primary" disabled={pending}>{pending ? "Saving…" : "Save team"}</button></form>;
}
