"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { StatCard, Badge, PriorityBadge, LoadingSpinner, EmptyState, SectionHeader } from "@/components/ui";
import { analyticsApi, complaintsApi } from "@/lib/api";
import { format } from "date-fns";

type Stats = {
  total: number;
  by_status: Record<string, number>;
  by_intent: Record<string, number>;
  total_calls_today: number;
  open_complaints: number;
  resolved_today: number;
};

type Complaint = {
  complaint_ref: string;
  intent: string;
  status: string;
  priority: string;
  created_at: string;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [user, setUser] = useState<{ full_name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("vs_user");
    if (!stored) { router.push("/login"); return; }
    const u = JSON.parse(stored);
    if (u.role !== "admin") { router.push("/officer"); return; }
    setUser(u);

    Promise.all([
      analyticsApi.stats(),
      complaintsApi.list({ limit: 10 }),
    ]).then(([s, c]) => {
      setStats(s.data);
      setComplaints(c.data);
    }).catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return (
    <div className="flex h-screen"><Sidebar role="admin" /><div className="flex-1 flex items-center justify-center"><LoadingSpinner /></div></div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0a0a0f" }}>
      <Sidebar role="admin" />
      <main className="flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-gray-500 text-sm">Welcome back,</p>
          <h1 className="text-3xl font-bold">{user?.full_name || "Administrator"} 👋</h1>
        </div>

        {/* Stats grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
            <StatCard title="Total Complaints" value={stats.total} icon="📋" color="#FF9933" />
            <StatCard title="Open" value={stats.open_complaints} icon="🔵" color="#60a5fa" />
            <StatCard title="Calls Today" value={stats.total_calls_today} icon="📞" color="#a78bfa" />
            <StatCard title="Resolved Today" value={stats.resolved_today} icon="✅" color="#4ade80" />
          </div>
        )}

        {/* Status breakdown */}
        {stats && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="glass p-6">
              <h2 className="font-bold mb-4 text-lg">Status Breakdown</h2>
              <div className="space-y-3">
                {Object.entries(stats.by_status).map(([s, count]) => (
                  <div key={s} className="flex items-center justify-between">
                    <Badge status={s} />
                    <div className="flex items-center gap-3">
                      <div className="h-2 rounded-full bg-gray-800 w-32 overflow-hidden">
                        <div className="h-full rounded-full bg-orange-500"
                             style={{ width: stats.total > 0 ? `${(count / stats.total) * 100}%` : "0%" }} />
                      </div>
                      <span className="text-sm font-bold w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass p-6">
              <h2 className="font-bold mb-4 text-lg">Top Intents</h2>
              <div className="space-y-3">
                {Object.entries(stats.by_intent)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 6)
                  .map(([intent, count]) => (
                  <div key={intent} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-gray-300">{intent.replace("_", " ")}</span>
                    <div className="flex items-center gap-3">
                      <div className="h-2 rounded-full bg-gray-800 w-24 overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: stats.total > 0 ? `${(count / stats.total) * 100}%` : "0%",
                          background: "linear-gradient(90deg,#FF9933,#e8831c)"
                        }} />
                      </div>
                      <span className="font-bold text-orange-400 w-5 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Complaints Table */}
        <div className="glass p-6">
          <SectionHeader
            title="Recent Complaints"
            action={
              <button onClick={() => router.push("/admin/complaints")} className="btn-ghost text-sm py-2 px-4">
                View All →
              </button>
            }
          />
          {complaints.length === 0 ? <EmptyState message="No complaints yet. Seed the database or simulate a call." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <th className="text-left py-3 px-2">Reference</th>
                    <th className="text-left py-3 px-2">Intent</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-left py-3 px-2">Priority</th>
                    <th className="text-left py-3 px-2">Filed</th>
                    <th className="py-3 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((c) => (
                    <tr key={c.complaint_ref} className="border-b hover:bg-white/[0.02] transition-colors"
                        style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      <td className="py-3 px-2 font-mono text-orange-400 text-xs">{c.complaint_ref}</td>
                      <td className="py-3 px-2 capitalize">{c.intent.replace("_", " ")}</td>
                      <td className="py-3 px-2"><Badge status={c.status} /></td>
                      <td className="py-3 px-2"><PriorityBadge priority={c.priority} /></td>
                      <td className="py-3 px-2 text-gray-500">{format(new Date(c.created_at), "dd MMM, HH:mm")}</td>
                      <td className="py-3 px-2">
                        <button onClick={() => router.push(`/admin/complaints/${c.complaint_ref}`)}
                                className="text-xs text-orange-400 hover:underline">View →</button>
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
