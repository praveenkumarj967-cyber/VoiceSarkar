"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === "admin") router.push("/admin");
      else router.push("/officer");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e?.response?.data?.detail || "Login failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen hero-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-3xl mb-4"
               style={{ background: "linear-gradient(135deg,#FF9933,#138808)", boxShadow: "0 0 40px rgba(255,153,51,0.3)" }}>
            🎙️
          </div>
          <h1 className="text-3xl font-bold">Voice Sarkar</h1>
          <p className="text-gray-400 text-sm mt-2">Officer & Admin Portal</p>
        </div>

        {/* Card */}
        <div className="glass p-8">
          <h2 className="text-xl font-bold mb-6 text-center">Sign in to Dashboard</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Email address</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="input-field"
                placeholder="admin@voicesarkar.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Password</label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-4 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-gray-500 mb-2 font-semibold uppercase tracking-wider">Demo Credentials</div>
            <div className="text-gray-400 space-y-1">
              <div>Admin: <span className="text-orange-400">admin@voicesarkar.gov.in</span> / Admin@123</div>
              <div>Officer: <span className="text-blue-400">officer@voicesarkar.gov.in</span> / Officer@123</div>
            </div>
          </div>
        </div>

        <p className="text-center mt-6 text-sm text-gray-600">
          ← <a href="/" className="hover:text-white transition-colors">Back to home</a>
        </p>
      </div>
    </div>
  );
}
