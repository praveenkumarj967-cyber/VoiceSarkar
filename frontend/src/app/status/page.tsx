"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { complaintsApi } from "@/lib/api";
import { Badge, PriorityBadge } from "@/components/ui";
import { format } from "date-fns";
import Link from "next/link";

type StatusResult = {
  complaint_ref: string; intent: string; status: string;
  target_portal: string; created_at: string; updated_at: string;
};

function StatusChecker() {
  const searchParams = useSearchParams();
  const [ref, setRef]         = useState(searchParams.get("ref") || "");
  const [result, setResult]   = useState<StatusResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const check = async () => {
    if (!ref.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const { data } = await complaintsApi.getPublic(ref.trim());
      setResult(data);
    } catch {
      setError("Complaint not found. Please check the reference number and try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen hero-bg flex flex-col items-center justify-center px-4 py-16">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl mb-4"
             style={{ background:"linear-gradient(135deg,#FF9933,#138808)", boxShadow:"0 0 30px rgba(255,153,51,0.3)" }}>
          🎙️
        </div>
        <h1 className="text-3xl font-bold mb-2">Check Complaint Status</h1>
        <p className="text-gray-400">Enter the reference number from your SMS to track your complaint.</p>
      </div>

      {/* Search */}
      <div className="glass p-8 w-full max-w-lg">
        <label className="block text-sm text-gray-400 mb-2">Complaint Reference Number</label>
        <input
          id="ref-input"
          className="input-field mb-4"
          placeholder="e.g. VS-PEN-2026-AB12CD"
          value={ref}
          onChange={(e) => setRef(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && check()}
        />
        <button onClick={check} disabled={loading || !ref.trim()} className="btn-primary w-full">
          {loading ? "Checking..." : "Track Complaint →"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 p-4 rounded-xl text-sm max-w-lg w-full"
             style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", color:"#f87171" }}>
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="glass p-8 w-full max-w-lg mt-4">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="font-mono text-orange-400 text-sm mb-1">{result.complaint_ref}</div>
              <h2 className="text-xl font-bold capitalize">{result.intent.replace("_"," ")} Complaint</h2>
            </div>
            <Badge status={result.status} />
          </div>

          {/* Status progress */}
          <div className="mb-6">
            {["open","in_progress","resolved"].map((s, i) => {
              const steps = ["open","in_progress","resolved"];
              const current = steps.indexOf(result.status);
              const isActive = i <= current;
              const isDone = i < current;
              return (
                <div key={s} className="flex items-center gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                    isDone ? "bg-orange-500 border-orange-500" :
                    isActive ? "border-orange-500 text-orange-500" : "border-gray-700 text-gray-700"
                  }`}>
                    {isDone ? "✓" : i + 1}
                  </div>
                  <div className={`text-sm capitalize ${isActive ? "text-white font-medium" : "text-gray-600"}`}>
                    {s.replace("_"," ")}
                  </div>
                </div>
              );
            })}
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Portal</dt>
              <dd className="text-right max-w-[60%]">{result.target_portal}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Filed on</dt>
              <dd>{format(new Date(result.created_at), "dd MMM yyyy, HH:mm")}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Last updated</dt>
              <dd>{format(new Date(result.updated_at), "dd MMM yyyy, HH:mm")}</dd>
            </div>
          </dl>

          <div className="mt-6 p-3 rounded-lg text-xs text-center"
               style={{ background:"rgba(255,153,51,0.08)", border:"1px solid rgba(255,153,51,0.15)", color:"#FF9933" }}>
            Call <strong>1800-XXX-XXXX</strong> anytime for live status updates
          </div>
        </div>
      )}

      <Link href="/" className="mt-8 text-sm text-gray-600 hover:text-white transition-colors">
        ← Back to Voice Sarkar home
      </Link>
    </div>
  );
}

export default function StatusPage() {
  return <Suspense><StatusChecker /></Suspense>;
}
