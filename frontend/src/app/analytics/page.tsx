"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#FF9933","#60a5fa","#4ade80","#f87171","#a78bfa","#facc15","#fb923c","#34d399"];

type User = { full_name: string; role: string; email: string };

const S = {
  page: { minHeight: "100vh", background: "#0a0a0f", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#f0f0f0", display: "flex" } as React.CSSProperties,
  sidebar: { width: 240, flexShrink: 0, background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "20px 12px", display: "flex", flexDirection: "column" as const, minHeight: "100vh" },
  logo: { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 24 },
  navItem: (active: boolean) => ({ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, marginBottom: 4, cursor: "pointer", fontSize: 14, fontWeight: 500, textDecoration: "none", color: active ? "#FF9933" : "#9ca3af", background: active ? "rgba(255,153,51,0.1)" : "transparent", border: active ? "1px solid rgba(255,153,51,0.2)" : "1px solid transparent", transition: "all 0.2s" } as React.CSSProperties),
  main: { flex: 1, padding: "32px", overflowY: "auto" as const },
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px" } as React.CSSProperties,
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, setUser]               = useState<User | null>(null);
  const [timeseries, setTimeseries]   = useState<{date:string;count:number}[]>([]);
  const [langBreak, setLangBreak]     = useState<{language:string;count:number}[]>([]);
  const [resTime, setResTime]         = useState<{intent:string;avg_hours:number;count:number}[]>([]);
  const [officers, setOfficers]       = useState<{officer_name:string;total_assigned:number;resolved:number}[]>([]);
  const [loading, setLoading]         = useState(true);

  const NAV = user?.role === "officer" ? 
    [{ href: "/officer", icon: "📊", label: "My Complaints" }, { href: "/analytics", icon: "📈", label: "Analytics" }] : 
    [{ href: "/admin", icon: "📊", label: "Dashboard" }, { href: "/admin/complaints", icon: "📋", label: "Complaints" }, { href: "/admin/simulator", icon: "🎙️", label: "Voice Simulator" }, { href: "/admin/web-phone", icon: "📱", label: "Web Phone" }, { href: "/analytics", icon: "📈", label: "Analytics" }];

  useEffect(() => {
    const stored = localStorage.getItem("vs_user");
    const token  = localStorage.getItem("vs_token");
    if (!stored || !token) { router.push("/login"); return; }
    setUser(JSON.parse(stored));

    const headers = { Authorization: `Bearer ${token}` };
    const BASE = "http://localhost:8000/api/v1/analytics";
    Promise.all([
      fetch(`${BASE}/timeseries?days=30`, { headers }).then(r=>r.json()),
      fetch(`${BASE}/language-breakdown`, { headers }).then(r=>r.json()),
      fetch(`${BASE}/resolution-time`, { headers }).then(r=>r.json()),
      fetch(`${BASE}/officer-performance`, { headers }).then(r=>r.json()),
    ]).then(([t, l, r, o]) => {
      setTimeseries(Array.isArray(t) ? t : []);
      setLangBreak(Array.isArray(l) ? l : []);
      setResTime(Array.isArray(r) ? r : []);
      setOfficers(Array.isArray(o) ? o : []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [router]);

  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const tooltip = { contentStyle: { background:"#12121a", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, color:"#f0f0f0", fontSize:13 } };

  if (!user) return <div style={{ ...S.page, alignItems: "center", justifyContent: "center" }}><div style={{ color: "#6b7280" }}>Loading…</div></div>;

  return (
    <div style={S.page}>
      <div style={S.sidebar}>
        <div style={S.logo}><span style={{ fontSize: 24 }}>🎙️</span><div><div style={{ fontWeight: 700, fontSize: 14 }}>Voice Sarkar</div><div style={{ fontSize: 11, color: "#6b7280", textTransform: "capitalize" }}>{user.role} Portal</div></div></div>
        {NAV.map(n => <a key={n.href} href={n.href} style={S.navItem(path === n.href)}><span>{n.icon}</span>{n.label}</a>)}
        <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
          <div style={{ fontSize: 12, color: "#6b7280", padding: "0 14px 12px" }}><div style={{ fontWeight: 600, color: "#9ca3af" }}>{user.full_name}</div></div>
          <button onClick={() => { localStorage.removeItem("vs_token"); localStorage.removeItem("vs_user"); router.push("/login"); }} style={{ ...S.navItem(false), width: "100%", border: "none", background: "rgba(239,68,68,0.06)", color: "#f87171", cursor: "pointer" } as React.CSSProperties}>🚪 Sign Out</button>
        </div>
      </div>
      <main style={S.main}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 4 }}>Analytics</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>System Insights 📈</h1>
        </div>

        {loading ? <div style={{ textAlign: "center", padding: 60, color: "#6b7280" }}>Loading analytics data…</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={S.card}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Complaints Filed (Last 30 Days)</h2>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={timeseries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill:"#6b7280", fontSize:11 }} tickFormatter={v=>v.slice(5)} />
                  <YAxis tick={{ fill:"#6b7280", fontSize:11 }} />
                  <Tooltip {...tooltip} />
                  <Line type="monotone" dataKey="count" stroke="#FF9933" strokeWidth={3} dot={false} name="Complaints" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div style={{ ...S.card, flex: "1 1 400px" }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Calls by Language</h2>
                {langBreak.length === 0 ? <p style={{ color: "#6b7280", textAlign: "center", padding: 40 }}>No data</p> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={langBreak} dataKey="count" nameKey="language" cx="50%" cy="50%" outerRadius={90} label={({ language, percent }) => `${language} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                        {langBreak.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip {...tooltip} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div style={{ ...S.card, flex: "1 1 400px" }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Avg Resolution Time (Hours)</h2>
                {resTime.length === 0 ? <p style={{ color: "#6b7280", textAlign: "center", padding: 40 }}>No resolved complaints</p> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={resTime} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" tick={{ fill:"#6b7280", fontSize:11 }} />
                      <YAxis type="category" dataKey="intent" tick={{ fill:"#6b7280", fontSize:11 }} width={90} />
                      <Tooltip {...tooltip} />
                      <Bar dataKey="avg_hours" fill="#60a5fa" radius={[0, 4, 4, 0]} name="Avg Hours" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div style={S.card}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Officer Performance</h2>
              {officers.length === 0 ? <p style={{ color: "#6b7280", textAlign: "center", padding: 40 }}>No officer data</p> : (
                <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: "#6b7280", borderBottom: "1px solid rgba(255,255,255,0.06)", textAlign: "left" }}>
                      <th style={{ padding: "10px 12px", fontWeight: 600 }}>Officer</th>
                      <th style={{ padding: "10px 12px", fontWeight: 600 }}>Assigned</th>
                      <th style={{ padding: "10px 12px", fontWeight: 600 }}>Resolved</th>
                      <th style={{ padding: "10px 12px", fontWeight: 600 }}>Resolution Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {officers.map(o => (
                      <tr key={o.officer_name} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "12px", fontWeight: 500 }}>{o.officer_name}</td>
                        <td style={{ padding: "12px" }}>{o.total_assigned}</td>
                        <td style={{ padding: "12px", color: "#4ade80" }}>{o.resolved}</td>
                        <td style={{ padding: "12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 120, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                              <div style={{ height: "100%", background: "#4ade80", borderRadius: 3, width: o.total_assigned > 0 ? `${(o.resolved/o.total_assigned)*100}%` : "0%" }} />
                            </div>
                            <span style={{ fontSize: 12, color: "#9ca3af" }}>{o.total_assigned > 0 ? `${Math.round((o.resolved/o.total_assigned)*100)}%` : "—"}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
