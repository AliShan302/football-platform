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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(Boolean(teamId));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!teamId) return;
    let active = true;
    adminResources.team(teamId)
      .then((team) => {
        if (active) {
          setValues({ name: team.name, code: team.code });
          setLogo(team.logo);
        }
      })
      .catch((caught) => active && setError(adminErrorMessage(caught)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [teamId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const payload: TeamInput | FormData = logoFile
        ? (() => {
            const data = new FormData();
            data.set("name", values.name);
            data.set("code", values.code);
            data.set("logo", logoFile);
            return data;
          })()
        : values;
      if (teamId) await adminResources.updateTeam(teamId, payload);
      else await adminResources.createTeam(payload);
      router.push("/admin/teams");
      router.refresh();
    } catch (caught) {
      setError(adminErrorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  if (loading) return <p role="status">Loading team…</p>;
  const fallback = values.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <form className="section-card max-w-xl space-y-5" onSubmit={submit}>
      {error && <p role="alert" className="alert-error">{error}</p>}
      <label className="field-label">Name<input className="form-control mt-1.5 font-normal" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} required /></label>
      <label className="field-label">Code<input className="form-control mt-1.5 font-normal uppercase" maxLength={10} value={values.code} onChange={(event) => setValues({ ...values, code: event.target.value.toUpperCase() })} required /></label>
      <div>
        <label className="field-label" htmlFor="team-logo">Team logo <span className="font-normal text-slate-500">(optional)</span></label>
        <div className="flex items-center gap-4">
          {logo ? (
            // Dynamic media URL returned by the existing API.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="Current team logo" className="size-12 rounded-full object-cover ring-1 ring-slate-200" />
          ) : (
            <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-emerald-100 text-lg font-black text-emerald-800">{fallback}</span>
          )}
          <input id="team-logo" className="form-control min-w-0 font-normal file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:font-bold file:text-emerald-800" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)} />
        </div>
        <p className="mt-2 text-xs text-slate-500">PNG, JPEG, or WebP. Without a logo, the team’s first letter is shown.</p>
      </div>
      <button className="button-primary" disabled={pending}>{pending ? "Saving…" : "Save team"}</button>
    </form>
  );
}
