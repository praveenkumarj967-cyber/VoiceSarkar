"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { LoadingSpinner, SectionHeader } from "@/components/ui";
import { voiceApi } from "@/lib/api";

const LANGUAGES = [
  { code:"en-IN", label:"English" },
  { code:"hi-IN", label:"Hindi" },
  { code:"te-IN", label:"Telugu" },
  { code:"ta-IN", label:"Tamil" },
  { code:"mr-IN", label:"Marathi" },
  { code:"bn-IN", label:"Bengali" },
];

const QUICK_SCRIPTS = [
  { label:"Pension complaint", utterances:["Hindi","My pension has not come for 3 months","Ramesh Kumar","old age pension","two months","Hyderabad Telangana","yes"] },
  { label:"RTI request", utterances:["English","I want to file an RTI","Priya Sharma","Education Department","How many schools were built in 2025","123 MG Road Chennai","yes"] },
  { label:"Status check", utterances:["English","check status of my complaint"] },
  { label:"Electricity complaint", utterances:["English","I have electricity problem","my meter is faulty","consumer 12345678","billing issue","Mumbai","yes"] },
];

type Turn = { speaker: string; text: string };

export default function SimulatorPage() {
  const router = useRouter();
  const [mobile, setMobile]           = useState("+919876543210");
  const [language, setLanguage]       = useState("en-IN");
  const [utterances, setUtterances]   = useState<string[]>([""]);
  const [result, setResult]           = useState<{ transcript: Turn[]; complaint_ref?: string; final_status: string } | null>(null);
  const [loading, setLoading]         = useState(false);
  const [role, setRole]               = useState("admin");

  useEffect(() => {
    const u = localStorage.getItem("vs_user");
    if (!u) { router.push("/login"); return; }
    setRole(JSON.parse(u).role);
  }, [router]);

  const addUtterance = () => setUtterances((p) => [...p, ""]);
  const updateUtterance = (i: number, v: string) => setUtterances((p) => p.map((u, idx) => idx === i ? v : u));
  const removeUtterance = (i: number) => setUtterances((p) => p.filter((_, idx) => idx !== i));

  const loadScript = (script: typeof QUICK_SCRIPTS[0]) => {
    setUtterances(script.utterances);
  };

  const simulate = async () => {
    const filled = utterances.filter(Boolean);
    if (!filled.length) return;
    setLoading(true); setResult(null);
    try {
      const { data } = await voiceApi.simulate({ mobile, language, utterances: filled });
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background:"#0a0a0f" }}>
      <Sidebar role={role} />
      <main className="flex-1 overflow-y-auto p-8">
        <SectionHeader
          title="Voice Call Simulator"
          subtitle="Test the voice dialogue engine without a real phone"
        />

        <div className="grid md:grid-cols-2 gap-6">
          {/* Input panel */}
          <div className="space-y-4">
            <div className="glass p-6">
              <h2 className="font-bold mb-4">Call Setup</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Mobile Number</label>
                  <input className="input-field" value={mobile} onChange={(e)=>setMobile(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Language</label>
                  <select className="input-field" value={language} onChange={(e)=>setLanguage(e.target.value)}
                          style={{ background:"rgba(255,255,255,0.05)" }}>
                    {LANGUAGES.map(l => <option key={l.code} value={l.code} style={{ background:"#1a1a2e" }}>{l.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="glass p-6">
              <h2 className="font-bold mb-3">Quick Scripts</h2>
              <div className="flex flex-wrap gap-2">
                {QUICK_SCRIPTS.map((s) => (
                  <button key={s.label} onClick={() => loadScript(s)}
                          className="text-xs px-3 py-2 rounded-lg"
                          style={{ background:"rgba(255,153,51,0.1)", color:"#FF9933", border:"1px solid rgba(255,153,51,0.2)" }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass p-6">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-bold">Citizen Utterances</h2>
                <button onClick={addUtterance} className="text-xs btn-ghost py-1 px-3">+ Add</button>
              </div>
              <div className="space-y-2">
                {utterances.map((u, i) => (
                  <div key={i} className="flex gap-2">
                    <input className="input-field flex-1" placeholder={`Turn ${i+1}...`}
                           value={u} onChange={(e) => updateUtterance(i, e.target.value)} />
                    {utterances.length > 1 && (
                      <button onClick={() => removeUtterance(i)}
                              className="text-red-400 text-xs px-2 hover:text-red-300">✕</button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={simulate} disabled={loading} className="btn-primary w-full mt-4">
                {loading ? "Simulating..." : "▶ Run Simulation"}
              </button>
            </div>
          </div>

          {/* Result panel */}
          <div className="glass p-6">
            <h2 className="font-bold mb-4">Conversation Transcript</h2>
            {loading && <LoadingSpinner />}
            {!loading && !result && (
              <div className="text-center py-16 text-gray-600">
                <div className="text-4xl mb-3">🎙️</div>
                <p>Configure a call and click Run to see the transcript</p>
              </div>
            )}
            {result && (
              <div className="space-y-3">
                {/* Status banner */}
                <div className="p-3 rounded-xl text-sm flex items-center justify-between mb-4"
                     style={{
                       background: result.complaint_ref ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.1)",
                       border: `1px solid ${result.complaint_ref ? "rgba(34,197,94,0.3)" : "rgba(234,179,8,0.3)"}`,
                       color: result.complaint_ref ? "#4ade80" : "#facc15",
                     }}>
                  <span>Status: <strong>{result.final_status}</strong></span>
                  {result.complaint_ref && (
                    <span className="font-mono text-xs">{result.complaint_ref}</span>
                  )}
                </div>

                {/* Transcript bubbles */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {result.transcript.map((turn, i) => (
                    <div key={i} className={`flex ${turn.speaker === "citizen" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        turn.speaker === "citizen"
                          ? "rounded-br-sm"
                          : "rounded-bl-sm"
                      }`} style={{
                        background: turn.speaker === "citizen"
                          ? "rgba(255,153,51,0.15)"
                          : "rgba(96,165,250,0.1)",
                        border: `1px solid ${turn.speaker === "citizen" ? "rgba(255,153,51,0.3)" : "rgba(96,165,250,0.2)"}`,
                      }}>
                        <div className={`text-xs mb-1 font-semibold ${turn.speaker === "citizen" ? "text-orange-400" : "text-blue-400"}`}>
                          {turn.speaker === "citizen" ? "👤 Citizen" : "🤖 Voice Sarkar AI"}
                        </div>
                        {turn.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
