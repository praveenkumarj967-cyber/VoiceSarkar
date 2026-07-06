"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const doLogin = async (em: string, pw: string) => {
    setError("");
    setLoading(true);
    try {
      // Call the Next.js API route (server-side proxy) — no CORS issue
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, password: pw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.detail || "Incorrect email or password.");
        return;
      }
      localStorage.setItem("vs_token", data.access_token);
      localStorage.setItem("vs_user", JSON.stringify(data.user));
      if (data.user.role === "admin") router.push("/admin");
      else router.push("/officer");
    } catch {
      setError("Cannot connect to server. Please make sure both servers are running.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin(email, password);
  };

  const S = {
    page: {
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 20% 50%, rgba(255,153,51,0.1) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(19,136,8,0.07) 0%, transparent 40%), #0a0a0f",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#f0f0f0", padding: "1rem",
    } as React.CSSProperties,
    card: {
      width: "100%", maxWidth: 430,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: 22, padding: "2.2rem",
      backdropFilter: "blur(20px)",
      boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
    } as React.CSSProperties,
    input: {
      width: "100%", background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.13)", borderRadius: 11,
      padding: "12px 15px", color: "#f0f0f0", fontSize: 15,
      outline: "none", boxSizing: "border-box" as const, marginBottom: 16,
      transition: "border-color 0.2s",
    } as React.CSSProperties,
    label: { display: "block", fontSize: 13, color: "#9ca3af", marginBottom: 7 } as React.CSSProperties,
    btn: (disabled: boolean) => ({
      width: "100%", padding: "13px",
      background: disabled ? "#374151" : "linear-gradient(135deg,#FF9933,#e8831c)",
      color: "white", border: "none", borderRadius: 11, fontSize: 15,
      fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
      boxShadow: disabled ? "none" : "0 4px 20px rgba(255,153,51,0.35)",
      transition: "all 0.2s",
    }) as React.CSSProperties,
    demoBtn: (color: string, bg: string, border: string) => ({
      flex: 1, padding: "10px 14px", borderRadius: 10,
      border: `1px solid ${border}`, background: bg,
      color, fontSize: 13, cursor: "pointer", fontWeight: 600,
      transition: "opacity 0.2s",
    }) as React.CSSProperties,
    error: {
      background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)",
      borderRadius: 10, padding: "11px 14px", marginBottom: 18,
      color: "#fca5a5", fontSize: 14, lineHeight: 1.5,
    } as React.CSSProperties,
  };

  return (
    <div style={S.page}>
      <div style={{ width: "100%", maxWidth: 430 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 68, height: 68, borderRadius: 18, fontSize: 32, marginBottom: 14,
            background: "linear-gradient(135deg,#FF9933,#138808)",
            boxShadow: "0 0 50px rgba(255,153,51,0.45)",
          }}>🎙️</div>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>Voice Sarkar</h1>
          <p style={{ color: "#6b7280", fontSize: 14, marginTop: 6 }}>Governance by Voice · Officer Portal</p>
        </div>

        {/* Card */}
        <div style={S.card}>
          <h2 style={{ textAlign: "center", fontSize: 19, fontWeight: 700, marginBottom: "1.6rem", color: "#f0f0f0" }}>
            Sign in to Dashboard
          </h2>

          {/* Error */}
          {error && <div style={S.error}>⚠️ {error}</div>}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div>
              <label style={S.label}>Email address</label>
              <input
                id="email" type="email" required autoComplete="email"
                placeholder="admin@voicesarkar.gov.in"
                value={email} onChange={e => setEmail(e.target.value)}
                style={S.input}
              />
            </div>
            <div>
              <label style={S.label}>Password</label>
              <input
                id="password" type="password" required autoComplete="current-password"
                placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                style={S.input}
              />
            </div>
            <button type="submit" disabled={loading} style={S.btn(loading)}>
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>

          {/* One-click demo buttons */}
          <div style={{ marginTop: 22, padding: "16px", borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>
              One-Click Demo Login
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" style={S.demoBtn("#FF9933","rgba(255,153,51,0.1)","rgba(255,153,51,0.3)")}
                      onClick={() => doLogin("admin@voicesarkar.gov.in","Admin@123")}>
                👤 Admin
              </button>
              <button type="button" style={S.demoBtn("#60a5fa","rgba(96,165,250,0.1)","rgba(96,165,250,0.3)")}
                      onClick={() => doLogin("officer@voicesarkar.gov.in","Officer@123")}>
                👮 Officer
              </button>
            </div>
            <p style={{ fontSize: 11, color: "#4b5563", marginTop: 10, textAlign: "center" }}>
              Passwords: Admin@123 · Officer@123
            </p>
          </div>
        </div>

        {/* Links */}
        <div style={{ textAlign: "center", marginTop: 20, display: "flex", justifyContent: "center", gap: 24, fontSize: 13, color: "#4b5563" }}>
          <a href="/" style={{ color: "#6b7280", textDecoration: "none" }}>← Home</a>
          <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" style={{ color: "#10b981", textDecoration: "none" }}>API Docs ↗</a>
        </div>
      </div>
    </div>
  );
}
