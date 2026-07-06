"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Direct axios call to backend — bypass any proxy issues
      const { data } = await axios.post(
        "http://localhost:8000/api/v1/auth/login/json",
        { email, password },
        { headers: { "Content-Type": "application/json" } }
      );
      localStorage.setItem("vs_token", data.access_token);
      localStorage.setItem("vs_user", JSON.stringify(data.user));
      if (data.user.role === "admin") router.push("/admin");
      else router.push("/officer");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(
        e?.response?.data?.detail ||
        e?.message ||
        "Login failed. Check credentials and make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const fillAdmin = () => {
    setEmail("admin@voicesarkar.gov.in");
    setPassword("Admin@123");
  };

  const fillOfficer = () => {
    setEmail("officer@voicesarkar.gov.in");
    setPassword("Officer@123");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 20% 50%, rgba(255,153,51,0.08) 0%, transparent 50%), #0a0a0f",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "system-ui, -apple-system, sans-serif", color: "#f0f0f0",
      padding: "1rem",
    }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 64, height: 64, borderRadius: 16, fontSize: 30, marginBottom: 16,
            background: "linear-gradient(135deg,#FF9933,#138808)",
            boxShadow: "0 0 40px rgba(255,153,51,0.4)",
          }}>🎙️</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Voice Sarkar</h1>
          <p style={{ color: "#6b7280", fontSize: 14, marginTop: 6 }}>Officer &amp; Admin Portal</p>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20, padding: "2rem", backdropFilter: "blur(16px)",
        }}>
          <h2 style={{ textAlign: "center", fontSize: 18, fontWeight: 700, marginBottom: "1.5rem" }}>
            Sign in to Dashboard
          </h2>

          {error && (
            <div style={{
              background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)",
              borderRadius: 10, padding: "10px 14px", marginBottom: 16,
              color: "#f87171", fontSize: 14,
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, color: "#9ca3af", marginBottom: 6 }}>
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@voicesarkar.gov.in"
                style={{
                  width: "100%", background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10,
                  padding: "11px 14px", color: "#f0f0f0", fontSize: 15,
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, color: "#9ca3af", marginBottom: 6 }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%", background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10,
                  padding: "11px 14px", color: "#f0f0f0", fontSize: 15,
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "13px",
                background: loading ? "#6b7280" : "linear-gradient(135deg,#FF9933,#e8831c)",
                color: "white", border: "none", borderRadius: 10,
                fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 20px rgba(255,153,51,0.3)",
              }}
            >
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>

          {/* Demo credentials - clickable to fill */}
          <div style={{
            marginTop: 20, padding: "14px", borderRadius: 12,
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
              Demo Credentials — click to fill
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={fillAdmin} type="button" style={{
                flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,153,51,0.3)",
                background: "rgba(255,153,51,0.08)", color: "#FF9933", fontSize: 12, cursor: "pointer", fontWeight: 600,
              }}>
                👤 Admin Login
              </button>
              <button onClick={fillOfficer} type="button" style={{
                flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(96,165,250,0.3)",
                background: "rgba(96,165,250,0.08)", color: "#60a5fa", fontSize: 12, cursor: "pointer", fontWeight: 600,
              }}>
                👮 Officer Login
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#4b5563", marginTop: 8, textAlign: "center" }}>
              Admin@123 / Officer@123
            </div>
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#4b5563" }}>
          ← <a href="/" style={{ color: "#6b7280" }}>Back to home</a>
        </p>

        {/* Backend status indicator */}
        <p style={{ textAlign: "center", fontSize: 11, color: "#374151", marginTop: 12 }}>
          Backend API: <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer"
            style={{ color: "#10b981" }}>localhost:8000/docs</a>
        </p>
      </div>
    </div>
  );
}
