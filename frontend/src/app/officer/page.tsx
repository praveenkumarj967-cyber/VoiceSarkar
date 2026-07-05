"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Badge, PriorityBadge, LoadingSpinner, EmptyState, SectionHeader } from "@/components/ui";
import { complaintsApi } from "@/lib/api";
import { format } from "date-fns";

type Complaint = {
  complaint_ref: string; intent: string; status: string;
  priority: string; created_at: string; target_portal: string;
};

export default function OfficerPage() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState("");
  const [user, setUser]             = useState<{ full_name: string } | null>(null);

  useEffect(() => {
    const u = localStorage.getItem("vs_user");
    if (!u) { router.push("/login"); return; }
    const parsed = JSON.parse(u);
    setUser(parsed);
    complaintsApi.list({ assigned_to_me: true, limit: 100 })
      .then((r) => setComplaints(r.data))
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = filter
    ? complaints.filter((c) => c.status === filter)
    : complaints;

  const quickUpdate = async (ref: string, status: string) => {
    await complaintsApi.update(ref, { status });
    setComplaints((prev) => prev.map((c) => c.complaint_ref === ref ? { ...c, status } : c));
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0a0a0f" }}>
      <Sidebar role="officer" />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mb-8">
          <p className="text-gray-500 text-sm">Officer Dashboard</p>
          <h1 className="text-3xl font-bold">{user?.full_name || "Officer"} 👮</h1>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Assigned", val: complaints.length, color: "#FF9933" },
            { label: "Open", val: complaints.filter(c => c.status === "open").length, color: "#60a5fa" },
            { label: "Resolved", val: complaints.filter(c => c.status === "resolved").length, color: "#4ade80" },
          ].map((s) => (
            <div key={s.label} className="glass p-5 text-center">
              <div className="text-3xl font-extrabold mb-1" style={{ color: s.color }}>{s.val}</div>
              <div className="text-sm text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        <SectionHeader
          title="My Assigned Complaints"
          action={
            <select className="input-field w-40 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}
                    style={{ background:"rgba(255,255,255,0.05)" }}>
              {["","open","in_progress","resolved","escalated"].map(s =>
                <option key={s} value={s} style={{ background:"#1a1a2e" }}>{s || "All"}</option>
              )}
            </select>
          }
        />

        <div className="glass p-0 overflow-hidden">
          {loading ? <LoadingSpinner /> : filtered.length === 0 ? <EmptyState message="No complaints assigned to you yet." /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase border-b" style={{ borderColor:"rgba(255,255,255,0.06)", background:"rgba(0,0,0,0.2)" }}>
                  <th className="text-left px-5 py-4">Reference</th>
                  <th className="text-left px-4 py-4">Intent</th>
                  <th className="text-left px-4 py-4">Status</th>
                  <th className="text-left px-4 py-4">Priority</th>
                  <th className="text-left px-4 py-4">Filed</th>
                  <th className="px-4 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.complaint_ref} className="border-b hover:bg-white/[0.02] transition-colors"
                      style={{ borderColor:"rgba(255,255,255,0.04)" }}>
                    <td className="px-5 py-3 font-mono text-orange-400 text-xs font-bold">{c.complaint_ref}</td>
                    <td className="px-4 py-3 capitalize">{c.intent.replace("_"," ")}</td>
                    <td className="px-4 py-3"><Badge status={c.status} /></td>
                    <td className="px-4 py-3"><PriorityBadge priority={c.priority} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(c.created_at), "dd MMM")}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {c.status !== "resolved" && (
                          <button onClick={() => quickUpdate(c.complaint_ref, "resolved")}
                                  className="text-xs px-3 py-1 rounded-lg font-medium"
                                  style={{ background:"rgba(34,197,94,0.15)", color:"#4ade80", border:"1px solid rgba(34,197,94,0.3)" }}>
                            Resolve
                          </button>
                        )}
                        {c.status !== "in_progress" && c.status !== "resolved" && (
                          <button onClick={() => quickUpdate(c.complaint_ref, "in_progress")}
                                  className="text-xs px-3 py-1 rounded-lg font-medium"
                                  style={{ background:"rgba(234,179,8,0.15)", color:"#facc15", border:"1px solid rgba(234,179,8,0.3)" }}>
                            Start
                          </button>
                        )}
                        <button onClick={() => router.push(`/admin/complaints/${c.complaint_ref}`)}
                                className="text-xs text-orange-400 hover:underline">View</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
