"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Badge, PriorityBadge, LoadingSpinner, EmptyState, SectionHeader } from "@/components/ui";
import { complaintsApi } from "@/lib/api";
import { format } from "date-fns";

type Complaint = {
  complaint_ref: string; intent: string; status: string;
  priority: string; created_at: string; citizen_id: string;
  target_portal: string; portal_reference_id?: string;
};

const STATUSES = ["", "open", "in_progress", "resolved", "escalated", "failed"];
const INTENTS = ["", "pension", "electricity", "water", "ration", "rti", "municipal", "health", "roads", "scholarship", "id_card"];

export default function ComplaintsPage() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [intent, setIntent] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("admin");

  const load = () => {
    setLoading(true);
    complaintsApi.list({ status: status || undefined, intent: intent || undefined, limit: 100 })
      .then((r) => setComplaints(r.data))
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const u = localStorage.getItem("vs_user");
    if (!u) { router.push("/login"); return; }
    setRole(JSON.parse(u).role);
    load();
  }, [status, intent]);

  const filtered = search
    ? complaints.filter((c) => c.complaint_ref.toLowerCase().includes(search.toLowerCase()))
    : complaints;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0a0a0f" }}>
      <Sidebar role={role} />
      <main className="flex-1 overflow-y-auto p-8">
        <SectionHeader title="Complaints Management" subtitle={`${filtered.length} complaints`} />

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <input className="input-field w-52" placeholder="Search by reference..." value={search}
                 onChange={(e) => setSearch(e.target.value)} />
          <select className="input-field w-40"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                  value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s} style={{ background: "#1a1a2e" }}>{s || "All Status"}</option>)}
          </select>
          <select className="input-field w-40"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                  value={intent} onChange={(e) => setIntent(e.target.value)}>
            {INTENTS.map((i) => <option key={i} value={i} style={{ background: "#1a1a2e" }}>{i || "All Intents"}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="glass p-0 overflow-hidden">
          {loading ? <LoadingSpinner /> : filtered.length === 0 ? <EmptyState /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase tracking-wider border-b"
                      style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)" }}>
                    <th className="text-left px-5 py-4">Reference</th>
                    <th className="text-left px-4 py-4">Intent</th>
                    <th className="text-left px-4 py-4">Status</th>
                    <th className="text-left px-4 py-4">Priority</th>
                    <th className="text-left px-4 py-4">Portal</th>
                    <th className="text-left px-4 py-4">Filed</th>
                    <th className="px-4 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.complaint_ref}
                        className="border-b hover:bg-white/[0.02] cursor-pointer transition-colors"
                        style={{ borderColor: "rgba(255,255,255,0.04)" }}
                        onClick={() => router.push(`/admin/complaints/${c.complaint_ref}`)}>
                      <td className="px-5 py-3 font-mono text-orange-400 text-xs font-bold">{c.complaint_ref}</td>
                      <td className="px-4 py-3 capitalize">{c.intent.replace("_", " ")}</td>
                      <td className="px-4 py-3"><Badge status={c.status} /></td>
                      <td className="px-4 py-3"><PriorityBadge priority={c.priority} /></td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px] truncate">{c.target_portal}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(c.created_at), "dd MMM yyyy")}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-orange-400 hover:underline">Details →</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
