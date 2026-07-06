"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

type DetailComplaint = {
  complaint_ref: string; intent: string; status: string; priority: string;
  target_portal: string; portal_reference_id?: string; submission_mode: string;
  slots: Record<string, string>; created_at: string; updated_at: string;
  resolved_at?: string; officer_notes?: string;
  status_history: Array<{ status: string; changed_by: string; note?: string; changed_at: string }>;
  notifications: Array<{ channel: string; to_address: string; body: string; delivery_status?: string; sent_at: string }>;
};
type User = { full_name: string; role: string; email: string };

const STATUS_OPTIONS = ["open", "in_progress", "resolved", "escalated", "failed"];

const S = {
  page: { minHeight: "100vh", background: "#0a0a0f", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#f0f0f0", display: "flex" } as React.CSSProperties,
  sidebar: { width: 240, flexShrink: 0, background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "20px 12px", display: "flex", flexDirection: "column" as const, minHeight: "100vh" },
  logo: { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 24 },
  navItem: (active: boolean) => ({ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, marginBottom: 4, cursor: "pointer", fontSize: 14, fontWeight: 500, textDecoration: "none", color: active ? "#FF9933" : "#9ca3af", background: active ? "rgba(255,153,51,0.1)" : "transparent", border: active ? "1px solid rgba(255,153,51,0.2)" : "1px solid transparent", transition: "all 0.2s" } as React.CSSProperties),
  main: { flex: 1, padding: "32px", overflowY: "auto" as const },
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px" } as React.CSSProperties,
  input: { width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "11px 14px", color: "#f0f0f0", fontSize: 14, outline: "none", boxSizing: "border-box" as const, marginBottom: 12 } as React.CSSProperties,
  btn: (disabled: boolean) => ({ width: "100%", padding: "11px", background: disabled ? "#374151" : "linear-gradient(135deg,#FF9933,#e8831c)", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer" }) as React.CSSProperties,
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, [string, string]> = { open: ["#60a5fa", "rgba(59,130,246,0.15)"], in_progress: ["#facc15", "rgba(234,179,8,0.15)"], resolved: ["#4ade80", "rgba(34,197,94,0.15)"], escalated: ["#f87171", "rgba(239,68,68,0.15)"], failed: ["#9ca3af", "rgba(107,114,128,0.15)"] };
  const [color, bg] = colors[status] || colors.open;
  return (
    <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, background: bg, color, border: `1px solid ${color}33` }}>{status.replace("_", " ")}</span>
  );
}

export default function ComplaintDetail() {
  const router = useRouter();
  const { ref } = useParams<{ ref: string }>();
  const [user, setUser]         = useState<User | null>(null);
  const [c, setC]               = useState<DetailComplaint | null>(null);
  const [loading, setLoading]   = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [note, setNote]         = useState("");

  const NAV = user?.role === "officer" ? 
    [{ href: "/officer", icon: "📊", label: "My Complaints" }, { href: "/analytics", icon: "📈", label: "Analytics" }] : 
    [{ href: "/admin", icon: "📊", label: "Dashboard" }, { href: "/admin/complaints", icon: "📋", label: "Complaints" }, { href: "/admin/simulator", icon: "🎙️", label: "Voice Simulator" }, { href: "/admin/web-phone", icon: "📱", label: "Web Phone" }, { href: "/analytics", icon: "📈", label: "Analytics" }];

  useEffect(() => {
    const stored = localStorage.getItem("vs_user");
    const token  = localStorage.getItem("vs_token");
    if (!stored || !token) { router.push("/login"); return; }
    setUser(JSON.parse(stored));

    fetch(`http://localhost:8000/api/v1/complaints/${ref}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setC(data); setNewStatus(data.status); })
      .catch(() => router.push("/admin/complaints"))
      .finally(() => setLoading(false));
  }, [ref, router]);

  const handleUpdate = async () => {
    if (!newStatus || !c) return;
    setUpdating(true);
    const token = localStorage.getItem("vs_token");
    try {
      await fetch(`http://localhost:8000/api/v1/complaints/${c.complaint_ref}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus, officer_notes: note }),
      });
      const r = await fetch(`http://localhost:8000/api/v1/complaints/${c.complaint_ref}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      setC(data);
      setNote("");
    } finally { setUpdating(false); }
  };

  const handleEscalate = async () => {
    if (!c) return;
    const token = localStorage.getItem("vs_token");
    await fetch(`http://localhost:8000/api/v1/complaints/${c.complaint_ref}/escalate`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    window.location.reload();
  };

  if (!user || loading || !c) return <div style={{ ...S.page, alignItems: "center", justifyContent: "center" }}><div style={{ color: "#6b7280" }}>Loading…</div></div>;
  const path = typeof window !== "undefined" ? window.location.pathname : "";

  return (
    <div style={S.page}>
      <div style={S.sidebar}>
        <div style={S.logo}><span style={{ fontSize: 24 }}>🎙️</span><div><div style={{ fontWeight: 700, fontSize: 14 }}>Voice Sarkar</div><div style={{ fontSize: 11, color: "#6b7280", textTransform: "capitalize" }}>{user.role} Portal</div></div></div>
        {NAV.map(n => <a key={n.href} href={n.href} style={S.navItem(path.startsWith(n.href) && n.href !== "/admin")}><span>{n.icon}</span>{n.label}</a>)}
        <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
          <div style={{ fontSize: 12, color: "#6b7280", padding: "0 14px 12px" }}><div style={{ fontWeight: 600, color: "#9ca3af" }}>{user.full_name}</div></div>
          <button onClick={() => { localStorage.removeItem("vs_token"); localStorage.removeItem("vs_user"); router.push("/login"); }} style={{ ...S.navItem(false), width: "100%", border: "none", background: "rgba(239,68,68,0.06)", color: "#f87171", cursor: "pointer" } as React.CSSProperties}>🚪 Sign Out</button>
        </div>
      </div>
      <main style={S.main}>
        <button onClick={() => router.back()} style={{ background: "transparent", border: "none", color: "#6b7280", cursor: "pointer", marginBottom: 24, fontSize: 14 }}>← Back</button>
        <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
          <div>
            <div style={{ fontFamily: "monospace", color: "#FF9933", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{c.complaint_ref}</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, textTransform: "capitalize", margin: "0 0 8px" }}>{c.intent.replace("_", " ")} Complaint</h1>
            <div style={{ display: "flex", gap: 10 }}><StatusBadge status={c.status} /> <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, background: "rgba(255,255,255,0.1)", color: "#d1d5db" }}>PRIORITY: {c.priority}</span></div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flex: "2 1 500px", display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={S.card}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Complaint Details</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: 14 }}>
                <div><div style={{ color: "#6b7280", marginBottom: 4 }}>Portal</div><div>{c.target_portal}</div></div>
                <div><div style={{ color: "#6b7280", marginBottom: 4 }}>Portal Ref</div><div style={{ fontFamily: "monospace", color: "#FF9933" }}>{c.portal_reference_id || "—"}</div></div>
                <div><div style={{ color: "#6b7280", marginBottom: 4 }}>Mode</div><div style={{ textTransform: "capitalize" }}>{c.submission_mode}</div></div>
                <div><div style={{ color: "#6b7280", marginBottom: 4 }}>Filed</div><div>{new Date(c.created_at).toLocaleString("en-IN")}</div></div>
              </div>
            </div>

            <div style={S.card}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Citizen Provided Details</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14 }}>
                {Object.entries(c.slots || {}).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", gap: 16 }}><div style={{ color: "#6b7280", width: 140, textTransform: "capitalize", flexShrink: 0 }}>{k.replace("_", " ")}</div><div>{v || "—"}</div></div>
                ))}
              </div>
            </div>

            <div style={S.card}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Status History</h2>
              <div style={{ paddingLeft: 16, borderLeft: "2px solid rgba(255,153,51,0.2)" }}>
                {c.status_history.map((h, i) => (
                  <div key={i} style={{ marginBottom: 20, position: "relative" }}>
                    <div style={{ position: "absolute", left: -21, top: 4, width: 10, height: 10, borderRadius: "50%", background: "#0a0a0f", border: "2px solid #FF9933" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                      <StatusBadge status={h.status} /> <span style={{ fontSize: 12, color: "#6b7280" }}>{new Date(h.changed_at).toLocaleString("en-IN")}</span>
                    </div>
                    {h.note && <div style={{ fontSize: 14, color: "#9ca3af", marginTop: 6 }}>{h.note}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={S.card}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Update Status</h2>
              <select style={S.input} value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s} style={{ background: "#1a1a2e" }}>{s.replace("_", " ")}</option>)}
              </select>
              <textarea style={{ ...S.input, minHeight: 80, resize: "vertical" }} placeholder="Officer note (optional)" value={note} onChange={e => setNote(e.target.value)} />
              <button onClick={handleUpdate} disabled={updating} style={S.btn(updating)}>{updating ? "Updating…" : "Save Update"}</button>
            </div>

            {user.role === "admin" && (
              <div style={S.card}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#f87171" }}>Escalate</h2>
                <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>Mark as high priority and escalate to senior officer.</p>
                <button onClick={handleEscalate} style={{ width: "100%", padding: "11px", background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Escalate Complaint</button>
              </div>
            )}

            {c.notifications.length > 0 && (
              <div style={S.card}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Notifications</h2>
                {c.notifications.map((n, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12, marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                      <span style={{ color: "#9ca3af", textTransform: "capitalize" }}>{n.channel}</span>
                      <span style={{ color: "#6b7280" }}>{new Date(n.sent_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#d1d5db", marginBottom: 6 }}>{n.body}</div>
                    <div style={{ fontSize: 12, color: n.delivery_status === "sent" ? "#4ade80" : "#facc15" }}>{n.delivery_status}</div>
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
