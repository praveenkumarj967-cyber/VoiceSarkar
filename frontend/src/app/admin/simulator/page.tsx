"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = { full_name: string; role: string; email: string };
type Turn = { speaker: string; text: string };

const S = {
  page: { minHeight: "100vh", background: "#0a0a0f", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#f0f0f0", display: "flex" } as React.CSSProperties,
  sidebar: { width: 240, flexShrink: 0, background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "20px 12px", display: "flex", flexDirection: "column" as const, minHeight: "100vh" },
  logo: { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 24 },
  navItem: (active: boolean) => ({ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, marginBottom: 4, cursor: "pointer", fontSize: 14, fontWeight: 500, textDecoration: "none", color: active ? "#FF9933" : "#9ca3af", background: active ? "rgba(255,153,51,0.1)" : "transparent", border: active ? "1px solid rgba(255,153,51,0.2)" : "1px solid transparent", transition: "all 0.2s" } as React.CSSProperties),
  main: { flex: 1, padding: "32px", overflowY: "auto" as const },
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px" } as React.CSSProperties,
  input: { width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "11px 14px", color: "#f0f0f0", fontSize: 14, outline: "none", boxSizing: "border-box" as const } as React.CSSProperties,
  btn: (disabled: boolean) => ({ width: "100%", padding: "11px", background: disabled ? "#374151" : "linear-gradient(135deg,#FF9933,#e8831c)", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer" }) as React.CSSProperties,
};

const NAV = [
  { href: "/admin", icon: "📊", label: "Dashboard" },
  { href: "/admin/complaints", icon: "📋", label: "Complaints" },
  { href: "/admin/simulator", icon: "🎙️", label: "Voice Simulator" },
  { href: "/analytics", icon: "📈", label: "Analytics" },
];

const LANGUAGES = [
  { code:"en-IN", label:"English" }, { code:"hi-IN", label:"Hindi" }, { code:"te-IN", label:"Telugu" },
  { code:"ta-IN", label:"Tamil" }, { code:"mr-IN", label:"Marathi" }, { code:"bn-IN", label:"Bengali" },
];

const QUICK_SCRIPTS = [
  { label:"Pension", utterances:["Hindi","My pension has not come for 3 months","Ramesh Kumar","old age pension","two months","Hyderabad Telangana","yes"] },
  { label:"RTI request", utterances:["English","I want to file an RTI","Priya Sharma","Education Department","How many schools were built in 2025","123 MG Road Chennai","yes"] },
  { label:"Electricity", utterances:["English","I have electricity problem","my meter is faulty","consumer 12345678","billing issue","Mumbai","yes"] },
];

export default function SimulatorPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mobile, setMobile] = useState("+919876543210");
  const [language, setLanguage] = useState("en-IN");
  const [utterances, setUtterances] = useState<string[]>([""]);
  const [result, setResult] = useState<{ transcript: Turn[]; complaint_ref?: string; final_status: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const logout = () => { localStorage.removeItem("vs_token"); localStorage.removeItem("vs_user"); router.push("/login"); };

  useEffect(() => {
    const stored = localStorage.getItem("vs_user");
    const token  = localStorage.getItem("vs_token");
    if (!stored || !token) { router.push("/login"); return; }
    const u: User = JSON.parse(stored);
    if (u.role !== "admin") { router.push("/officer"); return; }
    setUser(u);
  }, [router]);

  const simulate = async () => {
    const filled = utterances.filter(Boolean);
    if (!filled.length) return;
    setLoading(true); setResult(null);
    const token = localStorage.getItem("vs_token");
    try {
      const res = await fetch("http://localhost:8000/api/v1/voice/simulate", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mobile, language, utterances: filled }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const path = typeof window !== "undefined" ? window.location.pathname : "";
  if (!user) return <div style={{ ...S.page, alignItems: "center", justifyContent: "center" }}><div style={{ color: "#6b7280" }}>Loading…</div></div>;

  return (
    <div style={S.page}>
      <div style={S.sidebar}>
        <div style={S.logo}><span style={{ fontSize: 24 }}>🎙️</span><div><div style={{ fontWeight: 700, fontSize: 14 }}>Voice Sarkar</div><div style={{ fontSize: 11, color: "#6b7280", textTransform: "capitalize" }}>{user.role} Portal</div></div></div>
        {NAV.map(n => <a key={n.href} href={n.href} style={S.navItem(path === n.href)}><span>{n.icon}</span>{n.label}</a>)}
        <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
          <div style={{ fontSize: 12, color: "#6b7280", padding: "0 14px 12px" }}><div style={{ fontWeight: 600, color: "#9ca3af" }}>{user.full_name}</div></div>
          <button onClick={logout} style={{ ...S.navItem(false), width: "100%", border: "none", background: "rgba(239,68,68,0.06)", color: "#f87171", cursor: "pointer" } as React.CSSProperties}>🚪 Sign Out</button>
        </div>
      </div>

      <main style={S.main}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 4 }}>Dev Tools</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Voice Call Simulator 🎙️</h1>
        </div>

        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 400px", display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={S.card}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Call Setup</h2>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, color: "#9ca3af", marginBottom: 6 }}>Mobile Number</label>
                <input style={S.input} value={mobile} onChange={e => setMobile(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, color: "#9ca3af", marginBottom: 6 }}>Language</label>
                <select style={S.input} value={language} onChange={e => setLanguage(e.target.value)}>
                  {LANGUAGES.map(l => <option key={l.code} value={l.code} style={{ background: "#1a1a2e" }}>{l.label}</option>)}
                </select>
              </div>
            </div>

            <div style={S.card}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Quick Scripts</h2>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {QUICK_SCRIPTS.map(s => (
                  <button key={s.label} onClick={() => setUtterances(s.utterances)}
                          style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(255,153,51,0.1)", border: "1px solid rgba(255,153,51,0.2)", color: "#FF9933", fontSize: 12, cursor: "pointer" }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Citizen Utterances</h2>
                <button onClick={() => setUtterances(p => [...p, ""])} style={{ background: "transparent", border: "none", color: "#FF9933", fontSize: 13, cursor: "pointer" }}>+ Add</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                {utterances.map((u, i) => (
                  <div key={i} style={{ display: "flex", gap: 8 }}>
                    <input style={{ ...S.input, marginBottom: 0 }} placeholder={`Turn ${i+1}…`} value={u} onChange={e => setUtterances(p => p.map((uv, idx) => idx === i ? e.target.value : uv))} />
                    {utterances.length > 1 && (
                      <button onClick={() => setUtterances(p => p.filter((_, idx) => idx !== i))} style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: 16 }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={simulate} disabled={loading} style={S.btn(loading)}>{loading ? "Simulating…" : "▶ Run Simulation"}</button>
            </div>
          </div>

          <div style={{ flex: "1 1 400px" }}>
            <div style={S.card}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Conversation Transcript</h2>
              {loading && <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Simulating call…</div>}
              {!loading && !result && <div style={{ textAlign: "center", padding: 60, color: "#6b7280" }}><div style={{ fontSize: 40, marginBottom: 16 }}>🎙️</div>Configure call and click Run.</div>}
              {result && (
                <div>
                  <div style={{ padding: "12px 16px", borderRadius: 12, background: result.complaint_ref ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.1)", border: `1px solid ${result.complaint_ref ? "rgba(34,197,94,0.3)" : "rgba(234,179,8,0.3)"}`, color: result.complaint_ref ? "#4ade80" : "#facc15", display: "flex", justifyContent: "space-between", marginBottom: 20, fontSize: 13 }}>
                    <span>Status: <strong>{result.final_status}</strong></span>
                    {result.complaint_ref && <span style={{ fontFamily: "monospace" }}>{result.complaint_ref}</span>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, maxHeight: 500, overflowY: "auto", paddingRight: 8 }}>
                    {result.transcript.map((t, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: t.speaker === "citizen" ? "flex-end" : "flex-start" }}>
                        <div style={{ maxWidth: "80%", padding: "12px 16px", borderRadius: 16, borderBottomRightRadius: t.speaker === "citizen" ? 4 : 16, borderBottomLeftRadius: t.speaker === "citizen" ? 16 : 4, background: t.speaker === "citizen" ? "rgba(255,153,51,0.15)" : "rgba(96,165,250,0.1)", border: `1px solid ${t.speaker === "citizen" ? "rgba(255,153,51,0.3)" : "rgba(96,165,250,0.2)"}`, fontSize: 14, lineHeight: 1.5 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: t.speaker === "citizen" ? "#FF9933" : "#60a5fa", marginBottom: 4 }}>{t.speaker === "citizen" ? "👤 Citizen" : "🤖 Voice Sarkar"}</div>
                          {t.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
