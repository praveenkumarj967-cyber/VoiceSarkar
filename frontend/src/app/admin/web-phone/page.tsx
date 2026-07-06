"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

type User = { full_name: string; role: string; email: string };
type Turn = { speaker: "citizen" | "ai"; text: string };

let currentUtterance: SpeechSynthesisUtterance | null = null;

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const S = {
  page: { minHeight: "100vh", background: "#0a0a0f", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#f0f0f0", display: "flex" } as React.CSSProperties,
  sidebar: { width: 240, flexShrink: 0, background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "20px 12px", display: "flex", flexDirection: "column" as const, minHeight: "100vh" },
  logo: { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 24 },
  navItem: (active: boolean) => ({ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, marginBottom: 4, cursor: "pointer", fontSize: 14, fontWeight: 500, textDecoration: "none", color: active ? "#FF9933" : "#9ca3af", background: active ? "rgba(255,153,51,0.1)" : "transparent", border: active ? "1px solid rgba(255,153,51,0.2)" : "1px solid transparent", transition: "all 0.2s" } as React.CSSProperties),
  main: { flex: 1, padding: "32px", overflowY: "auto" as const, display: "flex", flexDirection: "column" as const },
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px" } as React.CSSProperties,
  btn: (disabled: boolean) => ({ padding: "14px 24px", background: disabled ? "#374151" : "linear-gradient(135deg,#FF9933,#e8831c)", color: "white", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", boxShadow: disabled ? "none" : "0 10px 30px rgba(255,153,51,0.3)" }) as React.CSSProperties,
};

const NAV = [
  { href: "/admin", icon: "📊", label: "Dashboard" },
  { href: "/admin/complaints", icon: "📋", label: "Complaints" },
  { href: "/admin/simulator", icon: "🎙️", label: "Voice Simulator" },
  { href: "/admin/web-phone", icon: "📱", label: "Web Phone" },
  { href: "/analytics", icon: "📈", label: "Analytics" },
];

export default function WebPhonePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState("");
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [status, setStatus] = useState("Click Start Call to begin");
  const [currentLanguage, setCurrentLanguage] = useState("en-IN");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const recogRef = useRef<any>(null);
  const sessionRef = useRef("");

  useEffect(() => {
    const stored = localStorage.getItem("vs_user");
    const token  = localStorage.getItem("vs_token");
    if (!stored || !token) { router.push("/login"); return; }
    setUser(JSON.parse(stored));

    if (typeof window !== "undefined" && window.speechSynthesis) {
      const loadVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      recogRef.current = new SpeechRec();
      recogRef.current.continuous = false;
      recogRef.current.interimResults = false;
      recogRef.current.lang = 'en-IN';
      
      recogRef.current.onstart = () => { setListening(true); setStatus("Listening..."); };
      recogRef.current.onend = () => { setListening(false); };
      
      recogRef.current.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        if (!text.trim()) return;
        setTranscript(p => [...p, { speaker: "citizen", text }]);
        await sendTurn(text);
      };
    } else {
      setStatus("Web Speech API not supported in this browser. Use Chrome/Edge.");
    }
  }, [router]);

  const speak = (text: string, textEn: string, lang: string, callback?: () => void) => {
    if (!window.speechSynthesis) { if(callback) callback(); return; }
    
    // Chrome bug: Resume synthesis first before cancelling to prevent speech queue lockups
    window.speechSynthesis.resume();
    window.speechSynthesis.cancel();
    setSpeaking(true);
    setStatus("AI is speaking...");
    
    // Query voices list directly to avoid stale React state closures
    const browserVoices = window.speechSynthesis.getVoices();
    
    // Find a working English voice (guaranteed to exist on Windows/macOS/Linux)
    const englishVoice = browserVoices.find(v => v.lang.toLowerCase().includes("en-us")) ||
                         browserVoices.find(v => v.lang.toLowerCase().startsWith("en")) ||
                         browserVoices[0];
                         
    let textToSpeak = text;
    let voiceToUse = englishVoice;
    
    if (lang !== "en-IN" && lang !== "en-US") {
      // Force English fallback text so English TTS voice doesn't fail silently on local scripts
      textToSpeak = textEn;
    }
    
    currentUtterance = new SpeechSynthesisUtterance(textToSpeak);
    if (voiceToUse) {
      currentUtterance.voice = voiceToUse;
      currentUtterance.lang = voiceToUse.lang;
    }
    
    currentUtterance.rate = 1.0;
    currentUtterance.volume = 1.0; // Force maximum volume
    
    currentUtterance.onend = () => {
      setSpeaking(false);
      setStatus("Your turn. Click mic to speak.");
      if (callback) callback();
    };
    
    currentUtterance.onerror = (e: any) => {
      console.error("SpeechSynthesis Error:", e);
      setSpeaking(false);
      setStatus(`Speaker error: ${e.error || "unknown"}. Click mic to speak.`);
      if (callback) callback();
    };
    
    window.speechSynthesis.speak(currentUtterance);
  };

  const sendTurn = async (text: string, sid?: string) => {
    setStatus("Thinking...");
    const activeSession = sid || sessionRef.current;
    const token = localStorage.getItem("vs_token");
    
    try {
      const res = await fetch("http://localhost:8000/api/v1/voice/web-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          session_id: activeSession,
          mobile: "+919876543210",
          utterance: text,
          language: currentLanguage
        })
      });
      const data = await res.json();
      setTranscript(p => [...p, { speaker: "ai", text: data.say }]);
      
      const newLang = data.language || currentLanguage;
      setCurrentLanguage(newLang);
      if (recogRef.current) {
        recogRef.current.lang = newLang;
      }
      
      if (data.action === "done") {
        setStatus(`Call Ended. Complaint Ref: ${data.complaint_ref}`);
        speak(data.say, data.say_en || data.say, newLang);
      } else {
        speak(data.say, data.say_en || data.say, newLang, () => {
          // Auto listen after AI finishes speaking
          if (recogRef.current) recogRef.current.start();
        });
      }
    } catch (e) {
      setStatus("Network error");
    }
  };

  const startCall = () => {
    if (!recogRef.current) return;
    const newSession = `web_${Math.random().toString(36).substring(7)}`;
    setSession(newSession);
    sessionRef.current = newSession;
    setCurrentLanguage("en-IN");
    recogRef.current.lang = "en-IN";
    setTranscript([{ speaker: "ai", text: "Namaste! Welcome to Voice Sarkar. What language do you prefer?" }]);
    
    speak(
      "Namaste! Welcome to Voice Sarkar. What language do you prefer?",
      "Namaste! Welcome to Voice Sarkar. What language do you prefer?",
      "en-IN",
      () => {
        recogRef.current.start();
      }
    );
  };

  const stopCall = () => {
    if (recogRef.current) recogRef.current.stop();
    window.speechSynthesis.cancel();
    sessionRef.current = "";
    setSession("");
    setListening(false);
    setSpeaking(false);
    setStatus("Call ended.");
  };

  const path = typeof window !== "undefined" ? window.location.pathname : "";

  if (!user) return null;

  return (
    <div style={S.page}>
      <div style={S.sidebar}>
        <div style={S.logo}><span style={{ fontSize: 24 }}>🎙️</span><div><div style={{ fontWeight: 700, fontSize: 14 }}>Voice Sarkar</div><div style={{ fontSize: 11, color: "#6b7280" }}>{user.role} Portal</div></div></div>
        {NAV.map(n => <a key={n.href} href={n.href} style={S.navItem(path === n.href)}><span>{n.icon}</span>{n.label}</a>)}
      </div>

      <main style={S.main}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Web Phone Dialler 📱</h1>
          <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>Simulate a real voice call using your laptop microphone.</p>
        </div>

        <div style={{ display: "flex", gap: 24, flex: 1, minHeight: 0 }}>
          
          <div style={{ ...S.card, flex: "0 0 320px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
            
            {/* Status Indicator */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Status</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: listening ? "#4ade80" : speaking ? "#60a5fa" : "#facc15" }}>
                {status}
              </div>
            </div>

            {/* Mic Animation */}
            <div style={{ 
              width: 120, height: 120, borderRadius: "50%", 
              background: listening ? "rgba(74,222,128,0.1)" : speaking ? "rgba(96,165,250,0.1)" : "rgba(255,255,255,0.05)",
              border: `2px solid ${listening ? "#4ade80" : speaking ? "#60a5fa" : "rgba(255,255,255,0.1)"}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48,
              boxShadow: listening ? "0 0 40px rgba(74,222,128,0.2)" : speaking ? "0 0 40px rgba(96,165,250,0.2)" : "none",
              transition: "all 0.3s"
            }}>
              {listening ? "👂" : speaking ? "🤖" : "🎙️"}
            </div>

            {/* Controls */}
            {!session ? (
              <button onClick={startCall} style={S.btn(false)}>📞 Start Call Simulation</button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
                {!listening && !speaking && (
                   <button onClick={() => { if(recogRef.current) recogRef.current.start(); }} style={{ padding: "12px", background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
                     🎙️ Speak Now
                   </button>
                )}
                <button onClick={stopCall} style={{ padding: "12px", background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
                  🛑 End Call
                </button>
              </div>
            )}
          </div>

          <div style={{ ...S.card, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Live Transcript</h2>
            
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, paddingRight: 8 }}>
              {transcript.length === 0 && (
                <div style={{ margin: "auto", color: "#6b7280", textAlign: "center" }}>Transcript will appear here...</div>
              )}
              {transcript.map((t, i) => (
                <div key={i} style={{ display: "flex", justifyContent: t.speaker === "citizen" ? "flex-end" : "flex-start" }}>
                  <div style={{ 
                    maxWidth: "80%", padding: "12px 16px", borderRadius: 16, 
                    borderBottomRightRadius: t.speaker === "citizen" ? 4 : 16, 
                    borderBottomLeftRadius: t.speaker === "citizen" ? 16 : 4, 
                    background: t.speaker === "citizen" ? "rgba(255,153,51,0.15)" : "rgba(96,165,250,0.1)", 
                    border: `1px solid ${t.speaker === "citizen" ? "rgba(255,153,51,0.3)" : "rgba(96,165,250,0.2)"}`, 
                    fontSize: 15, lineHeight: 1.5 
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: t.speaker === "citizen" ? "#FF9933" : "#60a5fa", marginBottom: 4 }}>
                      {t.speaker === "citizen" ? "You (Citizen)" : "Voice Sarkar"}
                    </div>
                    {t.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
