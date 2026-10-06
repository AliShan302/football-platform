"use client";
import { useParams } from "next/navigation";
import { TeamForm } from "@/components/admin/TeamForm";
export default function EditTeamPage() { const { id } = useParams<{ id: string }>(); return <div className="page-shell"><header className="page-heading"><p className="eyebrow">Teams</p><h1>Edit team</h1></header><TeamForm teamId={Number(id)} /></div>; }
