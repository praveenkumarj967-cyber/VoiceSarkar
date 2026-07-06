"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Complaint = { complaint_ref: string; intent: string; status: string; priority: string; created_at: string; target_portal: string };
type User = { full_name: string; role: string; email: string };

const S = {
  page: { minHeight: "100vh", background: "#0a0a0f", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#f0f0f0", display: "flex" } as React.CSSProperties,
  sidebar: { width: 240, flexShrink: 0, background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "20px 12px", display: "flex", flexDirection: "column" as const, minHeight: "100vh" },
  logo: { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 24 },
  navItem: (active: boolean) => ({ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, marginBottom: 4, cursor: "pointer", fontSize: 14, fontWeight: 500, textDecoration: "none", color: active ? "#FF9933" : "#9ca3af", background: active ? "rgba(255,153,51,0.1)" : "transparent", border: active ? "1px solid rgba(255,153,51,0.2)" : "1px solid transparent", transition: "all 0.2s" } as React.CSSProperties),
  main: { flex: 1, padding: "32px", overflowY: "auto" as const },
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" } as React.CSSProperties,
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

export default function AdminComplaintsPage() {
  const router = useRouter();
  const [user, setUser]             = useState<User | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [intentFilter, setIntentFilter] = useState("");

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

    const query = new URLSearchParams();
    if (statusFilter) query.append("status", statusFilter);
    if (intentFilter) query.append("intent", intentFilter);

    fetch(`http://localhost:8000/api/v1/complaints?limit=100&${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => setComplaints(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router, statusFilter, intentFilter]);

  if (!user) return (
    <div style={{ ...S.page, alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "#6b7280" }}>Loading…</div>
    </div>
  );

  return (
    <div style={S.page}>
      <Sidebar user={user} onLogout={logout} />
      <main style={S.main}>
        <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 4 }}>Admin Dashboard</p>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>All Complaints 📋</h1>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 14px", color: "#f0f0f0", fontSize: 13 }}>
              <option value="" style={{ background: "#1a1a2e" }}>All Statuses</option>
              {["open","in_progress","resolved","escalated","failed"].map(s => <option key={s} value={s} style={{ background: "#1a1a2e" }}>{s.replace("_", " ")}</option>)}
            </select>
            <select value={intentFilter} onChange={e => setIntentFilter(e.target.value)}
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 14px", color: "#f0f0f0", fontSize: 13 }}>
              <option value="" style={{ background: "#1a1a2e" }}>All Intents</option>
              {["pension","electricity","water","ration","rti","municipal","road","sanitation"].map(i => <option key={i} value={i} style={{ background: "#1a1a2e" }}>{i}</option>)}
            </select>
          </div>
        </div>

        <div style={S.card}>
          {loading ? (
             <p style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Loading complaints…</p>
          ) : complaints.length === 0 ? (
             <p style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>No complaints found.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 13 }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.2)", color: "#6b7280", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Reference","Intent","Portal","Status","Priority","Filed"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, fontSize: 11, textTransform: "uppercase" as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {complaints.map(c => (
                  <tr key={c.complaint_ref} onClick={() => router.push(`/admin/complaints/${c.complaint_ref}`)}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "#FF9933", fontWeight: 700 }}>{c.complaint_ref}</td>
                    <td style={{ padding: "12px 16px", textTransform: "capitalize" as const }}>{c.intent?.replace("_"," ")}</td>
                    <td style={{ padding: "12px 16px" }}>{c.target_portal}</td>
                    <td style={{ padding: "12px 16px" }}><StatusBadge status={c.status} /></td>
                    <td style={{ padding: "12px 16px", color: "#9ca3af", textTransform: "capitalize" as const }}>{c.priority}</td>
                    <td style={{ padding: "12px 16px", color: "#6b7280" }}>{new Date(c.created_at).toLocaleDateString("en-IN")}</td>
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
