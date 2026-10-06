"use client";
import { useParams } from "next/navigation";
import { EventForm } from "@/components/admin/EventForm";
export default function EditEventPage() { const { id } = useParams<{ id: string }>(); return <div className="page-shell"><header className="page-heading"><p className="eyebrow">Events</p><h1>Edit event</h1></header><EventForm eventId={Number(id)} /></div>; }
