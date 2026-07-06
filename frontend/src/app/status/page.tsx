"use client";
import { useState } from "react";

type PublicStatus = {
  complaint_ref: string; intent: string; status: string; created_at: string; updated_at: string; target_portal: string; portal_reference_id?: string;
  status_history?: Array<{ status: string; changed_at: string }>;
};

const S = {
  page: { minHeight: "100vh", background: "#0a0a0f", display: "flex", flexDirection: "column" as const, fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#f0f0f0" } as React.CSSProperties,
  header: { padding: "20px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)" } as React.CSSProperties,
  main: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  card: { width: "100%", maxWidth: 600, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "32px", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" } as React.CSSProperties,
  input: { flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "14px 18px", color: "#f0f0f0", fontSize: 16, outline: "none" } as React.CSSProperties,
  btn: (disabled: boolean) => ({ padding: "14px 24px", background: disabled ? "#374151" : "linear-gradient(135deg,#FF9933,#e8831c)", color: "white", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", flexShrink: 0 }) as React.CSSProperties,
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, [string, string]> = { open: ["#60a5fa", "rgba(59,130,246,0.15)"], in_progress: ["#facc15", "rgba(234,179,8,0.15)"], resolved: ["#4ade80", "rgba(34,197,94,0.15)"], escalated: ["#f87171", "rgba(239,68,68,0.15)"], failed: ["#9ca3af", "rgba(107,114,128,0.15)"] };
  const [color, bg] = colors[status] || colors.open;
  return <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700, textTransform: "uppercase" as const, background: bg, color, border: `1px solid ${color}33` }}>{status.replace("_", " ")}</span>;
}

export default function StatusCheckPage() {
  const [ref, setRef] = useState("");
  const [result, setResult] = useState<PublicStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const checkStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ref.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/complaints/public/${ref.trim()}`);
      if (!res.ok) { setError("Complaint not found or invalid reference number."); return; }
      const data = await res.json();
      setResult(data);
    } catch { setError("Failed to connect to the server."); } finally { setLoading(false); }
  };

  return (
    <div style={S.page}>
      <header style={S.header}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "white" }}>
          <span style={{ fontSize: 24 }}>🎙️</span><span style={{ fontWeight: 800, fontSize: 18 }}>Voice Sarkar</span>
        </a>
        <a href="/login" style={{ color: "#9ca3af", textDecoration: "none", fontSize: 14 }}>Officer Login →</a>
      </header>

      <main style={S.main}>
        <div style={S.card}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px" }}>Check Complaint Status</h1>
            <p style={{ color: "#9ca3af", margin: 0 }}>Enter your Voice Sarkar reference number (e.g. VS-1234567890)</p>
          </div>

          <form onSubmit={checkStatus} style={{ display: "flex", gap: 12, marginBottom: 32 }}>
            <input placeholder="VS-..." value={ref} onChange={e => setRef(e.target.value)} style={S.input} />
            <button type="submit" disabled={loading} style={S.btn(loading)}>{loading ? "Checking…" : "Check Status"}</button>
          </form>

          {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "16px", color: "#f87171", textAlign: "center" }}>⚠️ {error}</div>}

          {result && (
            <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 24 }}>
                <div>
                  <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 4 }}>Reference Number</div>
                  <div style={{ fontFamily: "monospace", color: "#FF9933", fontSize: 18, fontWeight: 700 }}>{result.complaint_ref}</div>
                </div>
                <StatusBadge status={result.status} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
                <div><div style={{ color: "#6b7280", fontSize: 13, marginBottom: 4 }}>Service Type</div><div style={{ textTransform: "capitalize", fontWeight: 600 }}>{result.intent.replace("_", " ")}</div></div>
                <div><div style={{ color: "#6b7280", fontSize: 13, marginBottom: 4 }}>Date Filed</div><div style={{ fontWeight: 600 }}>{new Date(result.created_at).toLocaleDateString("en-IN")}</div></div>
                <div><div style={{ color: "#6b7280", fontSize: 13, marginBottom: 4 }}>Gov Portal</div><div style={{ fontWeight: 600 }}>{result.target_portal}</div></div>
                <div><div style={{ color: "#6b7280", fontSize: 13, marginBottom: 4 }}>Last Update</div><div style={{ fontWeight: 600 }}>{new Date(result.updated_at).toLocaleDateString("en-IN")}</div></div>
              </div>

              {result.status_history && result.status_history.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "#9ca3af", marginBottom: 12 }}>Tracking History</h3>
                  <div style={{ paddingLeft: 12, borderLeft: "2px solid rgba(255,255,255,0.1)" }}>
                    {result.status_history.map((h, i) => (
                      <div key={i} style={{ marginBottom: i === result.status_history!.length - 1 ? 0 : 16, position: "relative" }}>
                        <div style={{ position: "absolute", left: -17, top: 4, width: 8, height: 8, borderRadius: "50%", background: "#0a0a0f", border: "2px solid #6b7280" }} />
                        <div style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize", marginBottom: 2 }}>{h.status.replace("_", " ")}</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{new Date(h.changed_at).toLocaleString("en-IN")}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
