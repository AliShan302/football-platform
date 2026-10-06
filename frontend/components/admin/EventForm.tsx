"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminErrorMessage } from "@/lib/admin/client";
import { adminResources } from "@/lib/admin/resources";
import type { EventInput } from "@/lib/admin/types";

const empty: EventInput = { name: "", description: "", start_date: "", end_date: "", status: "draft" };

export function EventForm({ eventId }: { eventId?: number }) {
  const router = useRouter();
  const [values, setValues] = useState<EventInput>(empty);
  const [loading, setLoading] = useState(Boolean(eventId));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!eventId) return;
    let active = true;
    adminResources.event(eventId).then((item) => {
      if (active) setValues({ name: item.name, description: item.description, start_date: item.start_date, end_date: item.end_date, status: item.status });
    }).catch((caught) => active && setError(adminErrorMessage(caught))).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [eventId]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setError("");
    try {
      const saved = eventId ? await adminResources.updateEvent(eventId, values) : await adminResources.createEvent(values);
      router.push(`/admin/events/${saved.id}`); router.refresh();
    } catch (caught) { setError(adminErrorMessage(caught)); }
    finally { setPending(false); }
  }
  if (loading) return <p role="status">Loading event…</p>;
  const field = (name: keyof EventInput, value: string) => setValues((current) => ({ ...current, [name]: value }));
  return (
    <form className="card max-w-2xl space-y-5 p-6" onSubmit={submit}>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
      <label className="block font-bold">Name<input className="mt-2 w-full rounded-xl border p-3 font-normal" value={values.name} onChange={(e) => field("name", e.target.value)} required /></label>
      <label className="block font-bold">Description<textarea className="mt-2 min-h-28 w-full rounded-xl border p-3 font-normal" value={values.description} onChange={(e) => field("description", e.target.value)} /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="font-bold">Start date<input className="mt-2 w-full rounded-xl border p-3 font-normal" type="date" value={values.start_date} onChange={(e) => field("start_date", e.target.value)} required /></label><label className="font-bold">End date<input className="mt-2 w-full rounded-xl border p-3 font-normal" type="date" value={values.end_date} onChange={(e) => field("end_date", e.target.value)} required /></label></div>
      <label className="block font-bold">Status<select className="mt-2 w-full rounded-xl border p-3 font-normal" value={values.status} onChange={(e) => field("status", e.target.value)}><option value="draft">Draft</option><option value="active">Active</option><option value="completed">Completed</option></select></label>
      <button className="button-primary" disabled={pending}>{pending ? "Saving…" : "Save event"}</button>
    </form>
  );
}
