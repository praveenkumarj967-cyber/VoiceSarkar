"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Badge, PriorityBadge, LoadingSpinner } from "@/components/ui";
import { complaintsApi } from "@/lib/api";
import { format } from "date-fns";

type DetailComplaint = {
  complaint_ref: string; intent: string; status: string; priority: string;
  target_portal: string; portal_reference_id?: string; submission_mode: string;
  slots: Record<string, string>; created_at: string; updated_at: string;
  resolved_at?: string; officer_notes?: string;
  status_history: Array<{ status: string; changed_by: string; note?: string; changed_at: string }>;
  notifications: Array<{ channel: string; to_address: string; body: string; delivery_status?: string; sent_at: string }>;
};

const STATUS_OPTIONS = ["open", "in_progress", "resolved", "escalated", "failed"];

export default function ComplaintDetail() {
  const router = useRouter();
  const { ref } = useParams<{ ref: string }>();
  const [c, setC] = useState<DetailComplaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [note, setNote] = useState("");
  const [role, setRole] = useState("admin");

  useEffect(() => {
    const u = localStorage.getItem("vs_user");
    if (!u) { router.push("/login"); return; }
    setRole(JSON.parse(u).role);
    complaintsApi.get(ref as string)
      .then((r) => { setC(r.data); setNewStatus(r.data.status); })
      .catch(() => router.push("/admin/complaints"))
      .finally(() => setLoading(false));
  }, [ref]);

  const handleUpdate = async () => {
    if (!newStatus || !c) return;
    setUpdating(true);
    try {
      await complaintsApi.update(c.complaint_ref, { status: newStatus, officer_notes: note });
      const r = await complaintsApi.get(c.complaint_ref);
      setC(r.data);
    } finally { setUpdating(false); }
  };

  if (loading || !c) return (
    <div className="flex h-screen"><Sidebar role={role} /><div className="flex-1 flex items-center justify-center"><LoadingSpinner /></div></div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0a0a0f" }}>
      <Sidebar role={role} />
      <main className="flex-1 overflow-y-auto p-8">
        {/* Back */}
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-white mb-6 flex items-center gap-1">
          ← Back to complaints
        </button>

        <div className="flex items-start gap-4 mb-8">
          <div>
            <div className="font-mono text-orange-400 text-sm mb-1">{c.complaint_ref}</div>
            <h1 className="text-2xl font-bold capitalize mb-2">{c.intent.replace("_", " ")} Complaint</h1>
            <div className="flex gap-2"><Badge status={c.status} /><PriorityBadge priority={c.priority} /></div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left col - details */}
          <div className="md:col-span-2 space-y-6">
            {/* Info card */}
            <div className="glass p-6">
              <h2 className="font-bold mb-4">Complaint Details</h2>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-gray-500">Portal</dt><dd className="mt-1">{c.target_portal}</dd></div>
                <div><dt className="text-gray-500">Portal Ref</dt><dd className="mt-1 font-mono text-xs text-orange-400">{c.portal_reference_id || "—"}</dd></div>
                <div><dt className="text-gray-500">Mode</dt><dd className="mt-1 capitalize">{c.submission_mode}</dd></div>
                <div><dt className="text-gray-500">Filed</dt><dd className="mt-1">{format(new Date(c.created_at), "dd MMM yyyy, HH:mm")}</dd></div>
                {c.resolved_at && <div><dt className="text-gray-500">Resolved</dt><dd className="mt-1">{format(new Date(c.resolved_at), "dd MMM yyyy")}</dd></div>}
              </dl>
            </div>

            {/* Slots */}
            <div className="glass p-6">
              <h2 className="font-bold mb-4">Citizen Provided Details</h2>
              <dl className="space-y-3 text-sm">
                {Object.entries(c.slots || {}).map(([k, v]) => (
                  <div key={k} className="flex gap-4">
                    <dt className="text-gray-500 w-36 shrink-0 capitalize">{k.replace("_", " ")}</dt>
                    <dd>{v || "—"}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Status History */}
            <div className="glass p-6">
              <h2 className="font-bold mb-4">Status History</h2>
              <div className="relative pl-6 border-l-2" style={{ borderColor: "rgba(255,153,51,0.2)" }}>
                {c.status_history.map((h, i) => (
                  <div key={i} className="mb-5 relative">
                    <div className="absolute -left-[29px] top-1 w-3 h-3 rounded-full border-2"
                         style={{ borderColor: "#FF9933", background: "#0a0a0f" }} />
                    <div className="flex items-center gap-3 mb-1">
                      <Badge status={h.status} />
                      <span className="text-xs text-gray-500">{format(new Date(h.changed_at), "dd MMM, HH:mm")}</span>
                    </div>
                    {h.note && <p className="text-sm text-gray-400 mt-1">{h.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right col - actions */}
          <div className="space-y-6">
            {/* Update Status */}
            <div className="glass p-6">
              <h2 className="font-bold mb-4">Update Status</h2>
              <select className="input-field mb-3" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                      style={{ background: "rgba(255,255,255,0.05)" }}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s} style={{ background: "#1a1a2e" }}>{s}</option>)}
              </select>
              <textarea className="input-field mb-3 h-20 resize-none" placeholder="Officer note (optional)"
                        value={note} onChange={(e) => setNote(e.target.value)} />
              <button onClick={handleUpdate} disabled={updating} className="btn-primary w-full">
                {updating ? "Updating..." : "Save Update"}
              </button>
            </div>

            {/* Escalate */}
            <div className="glass p-6">
              <h2 className="font-bold mb-3 text-red-400">Escalate</h2>
              <p className="text-sm text-gray-500 mb-3">Mark as high priority and escalate to senior officer.</p>
              <button onClick={() => complaintsApi.escalate(c.complaint_ref).then(() => window.location.reload())}
                      className="w-full py-2 rounded-lg text-sm font-semibold border"
                      style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", borderColor: "rgba(239,68,68,0.3)" }}>
                Escalate Complaint
              </button>
            </div>

            {/* Notifications */}
            {c.notifications.length > 0 && (
              <div className="glass p-6">
                <h2 className="font-bold mb-4">Notifications Sent</h2>
                {c.notifications.map((n, i) => (
                  <div key={i} className="text-xs mb-3 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <div className="flex justify-between mb-1">
                      <span className="capitalize text-gray-400">{n.channel}</span>
                      <span className="text-gray-600">{format(new Date(n.sent_at), "HH:mm")}</span>
                    </div>
                    <p className="text-gray-400 leading-relaxed">{n.body}</p>
                    <span className={`mt-1 inline-block ${n.delivery_status === "sent" ? "text-green-400" : "text-yellow-400"}`}>
                      {n.delivery_status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
