"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Stats = { total: number; by_status: Record<string, number>; by_intent: Record<string, number>; total_calls_today: number; open_complaints: number; resolved_today: number };
type Complaint = { complaint_ref: string; intent: string; status: string; priority: string; created_at: string };
type User = { full_name: string; role: string; email: string };

const S = {
  page: { minHeight: "100vh", background: "#0a0a0f", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#f0f0f0", display: "flex" } as React.CSSProperties,
  sidebar: { width: 240, flexShrink: 0, background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "20px 12px", display: "flex", flexDirection: "column" as const, minHeight: "100vh" },
  logo: { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 24 },
  navItem: (active: boolean) => ({ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, marginBottom: 4, cursor: "pointer", fontSize: 14, fontWeight: 500, textDecoration: "none", color: active ? "#FF9933" : "#9ca3af", background: active ? "rgba(255,153,51,0.1)" : "transparent", border: active ? "1px solid rgba(255,153,51,0.2)" : "1px solid transparent", transition: "all 0.2s" } as React.CSSProperties),
  main: { flex: 1, padding: "32px", overflowY: "auto" as const },
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px" } as React.CSSProperties,
  statCard: (color: string) => ({ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 16, padding: "20px", borderTop: `2px solid ${color}` } as React.CSSProperties),
};

const NAV = [
  { href: "/admin", icon: "📊", label: "Dashboard" },
  { href: "/admin/complaints", icon: "📋", label: "Complaints" },
  { href: "/admin/simulator", icon: "🎙️", label: "Voice Simulator" },
  { href: "/admin/web-phone", icon: "📱", label: "Web Phone" },
  { href: "/analytics", icon: "📈", label: "Analytics" },
];

function Sidebar({ user, onLogout }: { user: User; onLogout: () => void }) {
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  return (
    <div style={S.sidebar}>
      <div style={S.logo}>
        <span style={{ fontSize: 24 }}>🎙️</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Voice Sarkar</div>
          <div style={{ fontSize: 11, color: "#6b7280", textTransform: "capitalize" }}>{user.role} Portal</div>
        </div>
      </div>
      {NAV.map(n => (
        <a key={n.href} href={n.href} style={S.navItem(path === n.href)}>
          <span>{n.icon}</span>{n.label}
        </a>
      ))}
      <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
        <div style={{ fontSize: 12, color: "#6b7280", padding: "0 14px 12px" }}>
          <div style={{ fontWeight: 600, color: "#9ca3af", marginBottom: 2 }}>{user.full_name}</div>
          <div>{user.email}</div>
        </div>
        <button onClick={onLogout} style={{ ...S.navItem(false), width: "100%", border: "none", background: "rgba(239,68,68,0.06)", color: "#f87171", cursor: "pointer" } as React.CSSProperties}>
          🚪 Sign Out
        </button>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  return (
    <div style={S.statCard(color)}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 13, color: "#9ca3af" }}>{title}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, [string, string]> = {
    open: ["#60a5fa", "rgba(59,130,246,0.15)"],
    in_progress: ["#facc15", "rgba(234,179,8,0.15)"],
    resolved: ["#4ade80", "rgba(34,197,94,0.15)"],
    escalated: ["#f87171", "rgba(239,68,68,0.15)"],
    failed: ["#9ca3af", "rgba(107,114,128,0.15)"],
  };
  const [color, bg] = colors[status] || colors.open;
  return (
    <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, background: bg, color, border: `1px solid ${color}33` }}>
      {status.replace("_", " ")}
    </span>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser]           = useState<User | null>(null);
  const [stats, setStats]         = useState<Stats | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  const logout = () => {
    localStorage.removeItem("vs_token");
    localStorage.removeItem("vs_user");
    router.push("/login");
  };

  useEffect(() => {
    const stored = localStorage.getItem("vs_user");
    const token  = localStorage.getItem("vs_token");
    if (!stored || !token) { router.push("/login"); return; }
    const u: User = JSON.parse(stored);
    if (u.role !== "admin") { router.push("/officer"); return; }
    setUser(u);

    const headers = { Authorization: `Bearer ${token}` };
    const BASE = "http://localhost:8000/api/v1";

    Promise.all([
      fetch(`${BASE}/analytics/stats`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${BASE}/complaints?limit=10`, { headers }).then(r => r.ok ? r.json() : []),
    ]).then(([s, c]) => {
      if (s) setStats(s);
      setComplaints(Array.isArray(c) ? c : []);
    }).catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [router]);

  if (!user) return (
    <div style={{ ...S.page, alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        <p style={{ color: "#6b7280" }}>Loading dashboard…</p>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <Sidebar user={user} onLogout={logout} />
      <main style={S.main}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 4 }}>Welcome back,</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>{user.full_name} 👋</h1>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, color: "#f87171", fontSize: 14 }}>
            ⚠️ Some data failed to load: {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#6b7280" }}>Loading stats…</div>
        ) : (
          <>
            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
              <StatCard title="Total Complaints" value={stats?.total ?? 0} icon="📋" color="#FF9933" />
              <StatCard title="Open" value={stats?.open_complaints ?? 0} icon="🔵" color="#60a5fa" />
              <StatCard title="Calls Today" value={stats?.total_calls_today ?? 0} icon="📞" color="#a78bfa" />
              <StatCard title="Resolved Today" value={stats?.resolved_today ?? 0} icon="✅" color="#4ade80" />
            </div>

            {/* Status breakdown */}
            {stats && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                <div style={S.card}>
                  <h2 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Status Breakdown</h2>
                  {Object.entries(stats.by_status).map(([s, count]) => (
                    <div key={s} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <StatusBadge status={s} />
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 100, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 3, background: "#FF9933", width: stats.total > 0 ? `${(count / stats.total) * 100}%` : "0%" }} />
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: "right" }}>{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={S.card}>
                  <h2 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Top Intents</h2>
                  {Object.entries(stats.by_intent).sort(([,a],[,b]) => b - a).slice(0, 6).map(([intent, count]) => (
                    <div key={intent} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontSize: 13, textTransform: "capitalize", color: "#d1d5db" }}>{intent.replace("_"," ")}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#FF9933" }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent complaints */}
            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>Recent Complaints</h2>
                <a href="/admin/complaints" style={{ fontSize: 13, color: "#FF9933", textDecoration: "none" }}>View All →</a>
              </div>
              {complaints.length === 0 ? (
                <p style={{ color: "#6b7280", textAlign: "center", padding: "32px 0" }}>No complaints yet. Try the Voice Simulator!</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: "#6b7280", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      {["Reference","Intent","Status","Priority","Filed"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, fontSize: 11, textTransform: "uppercase" as const }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((c) => (
                      <tr key={c.complaint_ref} onClick={() => router.push(`/admin/complaints/${c.complaint_ref}`)}
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}>
                        <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#FF9933", fontWeight: 700 }}>{c.complaint_ref}</td>
                        <td style={{ padding: "10px 12px", textTransform: "capitalize" as const }}>{c.intent?.replace("_"," ")}</td>
                        <td style={{ padding: "10px 12px" }}><StatusBadge status={c.status} /></td>
                        <td style={{ padding: "10px 12px", textTransform: "capitalize" as const, color: "#9ca3af" }}>{c.priority}</td>
                        <td style={{ padding: "10px 12px", color: "#6b7280" }}>{new Date(c.created_at).toLocaleDateString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
