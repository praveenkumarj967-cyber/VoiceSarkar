"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Complaint = { complaint_ref: string; intent: string; status: string; priority: string; created_at: string };
type User = { full_name: string; role: string; email: string };

const NAV = [
  { href: "/officer", icon: "📊", label: "My Complaints" },
  { href: "/analytics", icon: "📈", label: "Analytics" },
];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, [string, string]> = {
    open: ["#60a5fa", "rgba(59,130,246,0.15)"],
    in_progress: ["#facc15", "rgba(234,179,8,0.15)"],
    resolved: ["#4ade80", "rgba(34,197,94,0.15)"],
    escalated: ["#f87171", "rgba(239,68,68,0.15)"],
  };
  const [color, bg] = colors[status] || colors.open;
  return (
    <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, background: bg, color, border: `1px solid ${color}33` }}>
      {status.replace("_", " ")}
    </span>
  );
}

export default function OfficerDashboard() {
  const router = useRouter();
  const [user, setUser]             = useState<User | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filter, setFilter]         = useState("");
  const [loading, setLoading]       = useState(true);

  const logout = () => {
    localStorage.removeItem("vs_token");
    localStorage.removeItem("vs_user");
    router.push("/login");
  };

  const quickUpdate = async (ref: string, status: string) => {
    const token = localStorage.getItem("vs_token");
    await fetch(`http://localhost:8000/api/v1/complaints/${ref}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    setComplaints(p => p.map(c => c.complaint_ref === ref ? { ...c, status } : c));
  };

  useEffect(() => {
    const stored = localStorage.getItem("vs_user");
    const token  = localStorage.getItem("vs_token");
    if (!stored || !token) { router.push("/login"); return; }
    const u: User = JSON.parse(stored);
    setUser(u);

    fetch(`http://localhost:8000/api/v1/complaints?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json())
      .then(d => setComplaints(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = filter ? complaints.filter(c => c.status === filter) : complaints;

  const S = {
    page: { minHeight: "100vh", background: "#0a0a0f", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#f0f0f0", display: "flex" } as React.CSSProperties,
    sidebar: { width: 240, flexShrink: 0, background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "20px 12px", display: "flex", flexDirection: "column" as const, minHeight: "100vh" },
    main: { flex: 1, padding: "32px" } as React.CSSProperties,
    card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" } as React.CSSProperties,
    navItem: (active: boolean) => ({ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, marginBottom: 4, cursor: "pointer", fontSize: 14, fontWeight: 500, textDecoration: "none", color: active ? "#FF9933" : "#9ca3af", background: active ? "rgba(255,153,51,0.1)" : "transparent", border: active ? "1px solid rgba(255,153,51,0.2)" : "1px solid transparent" } as React.CSSProperties),
  };

  const path = typeof window !== "undefined" ? window.location.pathname : "";

  if (!user) return <div style={{ ...S.page, alignItems: "center", justifyContent: "center" }}><p style={{ color: "#6b7280" }}>Loading…</p></div>;

  return (
    <div style={S.page}>
      {/* Sidebar */}
      <div style={S.sidebar}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 24 }}>
          <span style={{ fontSize: 24 }}>🎙️</span>
          <div><div style={{ fontWeight: 700, fontSize: 14 }}>Voice Sarkar</div><div style={{ fontSize: 11, color: "#6b7280" }}>Officer Portal</div></div>
        </div>
        {NAV.map(n => <a key={n.href} href={n.href} style={S.navItem(path === n.href)}><span>{n.icon}</span>{n.label}</a>)}
        <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
          <div style={{ fontSize: 12, color: "#6b7280", padding: "0 14px 12px" }}>
            <div style={{ fontWeight: 600, color: "#9ca3af" }}>{user.full_name}</div>
          </div>
          <button onClick={logout} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, width: "100%", border: "none", background: "rgba(239,68,68,0.06)", color: "#f87171", cursor: "pointer", fontSize: 14 }}>
            🚪 Sign Out
          </button>
        </div>
      </div>

      {/* Main */}
      <main style={S.main}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 4 }}>Officer Dashboard</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>{user.full_name} 👮</h1>
        </div>

        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Total Assigned", val: complaints.length, color: "#FF9933" },
            { label: "Open", val: complaints.filter(c => c.status === "open").length, color: "#60a5fa" },
            { label: "Resolved", val: complaints.filter(c => c.status === "resolved").length, color: "#4ade80" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "18px", textAlign: "center" }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Complaints ({filtered.length})</h2>
          <select value={filter} onChange={e => setFilter(e.target.value)}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "7px 12px", color: "#f0f0f0", fontSize: 13 }}>
            {["","open","in_progress","resolved","escalated"].map(s =>
              <option key={s} value={s} style={{ background: "#1a1a2e" }}>{s || "All Status"}</option>
            )}
          </select>
        </div>

        {/* Table */}
        <div style={S.card}>
          {loading ? (
            <p style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Loading complaints…</p>
          ) : filtered.length === 0 ? (
            <p style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>No complaints found.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 13 }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.2)", color: "#6b7280", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Reference","Intent","Status","Priority","Filed","Actions"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontWeight: 600, fontSize: 11, textTransform: "uppercase" as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.complaint_ref} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "11px 14px", fontFamily: "monospace", color: "#FF9933", fontWeight: 700 }}>{c.complaint_ref}</td>
                    <td style={{ padding: "11px 14px", textTransform: "capitalize" as const }}>{c.intent?.replace("_"," ")}</td>
                    <td style={{ padding: "11px 14px" }}><StatusBadge status={c.status} /></td>
                    <td style={{ padding: "11px 14px", color: "#9ca3af", textTransform: "capitalize" as const }}>{c.priority}</td>
                    <td style={{ padding: "11px 14px", color: "#6b7280" }}>{new Date(c.created_at).toLocaleDateString("en-IN")}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {c.status !== "resolved" && (
                          <button onClick={() => quickUpdate(c.complaint_ref, "resolved")}
                                  style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.1)", color: "#4ade80", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                            Resolve
                          </button>
                        )}
                        {c.status === "open" && (
                          <button onClick={() => quickUpdate(c.complaint_ref, "in_progress")}
                                  style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(234,179,8,0.3)", background: "rgba(234,179,8,0.1)", color: "#facc15", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                            Start
                          </button>
                        )}
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
