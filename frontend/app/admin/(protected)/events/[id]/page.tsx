"use client";
import { useParams } from "next/navigation";
import { EventWorkspace } from "@/components/admin/EventWorkspace";
export default function EventWorkspacePage() { const { id } = useParams<{ id: string }>(); return <div className="page-shell"><EventWorkspace eventId={Number(id)} /></div>; }
