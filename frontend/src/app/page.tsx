"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

const LANGUAGES = [
  "हिंदी", "English", "தமிழ்", "తెలుగు", "বাংলা",
  "मराठी", "ಕನ್ನಡ", "ગુજરાતી", "ਪੰਜਾਬੀ", "മലയാളം", "ଓଡ଼ିଆ",
];

const STEPS = [
  { num: "01", title: "Dial the number", desc: "Call 1800-XXX-XXXX from any mobile — even a basic feature phone with no internet." },
  { num: "02", title: "Choose your language", desc: "Say your preferred language. Voice Sarkar supports 11 Indian languages." },
  { num: "03", title: "Describe your issue", desc: "Speak naturally. Our AI understands dialects, accents, and regional expressions." },
  { num: "04", title: "We submit for you", desc: "Your complaint is automatically filed on the right government portal — CPGRAMS, RTI, UMANG, and more." },
  { num: "05", title: "Get SMS updates", desc: "Receive your complaint reference number and status updates via SMS on your phone." },
];

const FEATURES = [
  { icon: "🎙️", title: "Pure Voice", desc: "No screen, no typing, no internet. Works on any phone manufactured in the last 20 years." },
  { icon: "🌐", title: "11 Languages", desc: "Hindi, Telugu, Tamil, Bengali, Marathi, Kannada, Gujarati, Odia, Punjabi, Malayalam, English." },
  { icon: "📋", title: "RTI Filing", desc: "File Right to Information requests over the phone. AI fills in the form for you." },
  { icon: "📊", title: "Status Tracking", desc: "Call anytime to check the status of your complaint using just your phone number." },
  { icon: "🔒", title: "Secure & Private", desc: "No Aadhaar required. Only your mobile number and consent are stored." },
  { icon: "⚡", title: "Instant Routing", desc: "AI detects your issue and routes it to the correct government department automatically." },
];

const SERVICES = [
  "Pension & Social Security", "Electricity Complaints", "Water Supply",
  "Ration Card & PDS", "RTI Filing", "Road & Infrastructure",
  "Municipal Services", "Health & Ayushman", "Scholarships", "Identity Documents",
];

export default function LandingPage() {
  const [langIdx, setLangIdx] = useState(0);
  const [refInput, setRefInput] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setLangIdx((i) => (i + 1) % LANGUAGES.length), 1800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen hero-bg">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
           style={{ background: "rgba(10,10,15,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: "linear-gradient(135deg,#FF9933,#138808)" }}>🎙</div>
          <span className="font-bold text-lg">Voice Sarkar</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
          <a href="#how" className="hover:text-white transition-colors">How it works</a>
          <a href="#services" className="hover:text-white transition-colors">Services</a>
          <a href="#status" className="hover:text-white transition-colors">Check Status</a>
        </div>
        <Link href="/login">
          <button className="btn-primary text-sm py-2 px-5">Officer Login</button>
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section className="flex flex-col items-center justify-center text-center px-4 pt-32 pb-20">
        {/* Animated voice waves */}
        <div className="relative flex items-center justify-center mb-10">
          <div className="wave-ring absolute w-40 h-40 rounded-full border-2" style={{ borderColor: "rgba(255,153,51,0.15)" }} />
          <div className="wave-ring absolute w-28 h-28 rounded-full border-2" style={{ borderColor: "rgba(255,153,51,0.25)" }} />
          <div className="wave-ring absolute w-20 h-20 rounded-full border-2" style={{ borderColor: "rgba(255,153,51,0.4)" }} />
          <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-3xl z-10"
               style={{ background: "linear-gradient(135deg,#FF9933,#e8831c)", boxShadow: "0 0 40px rgba(255,153,51,0.4)" }}>
            🎙️
          </div>
        </div>

        {/* Language ticker */}
        <div className="mb-6 h-8 overflow-hidden">
          <div className="transition-all duration-500 text-sm font-medium px-4 py-1 rounded-full"
               style={{ background: "rgba(255,153,51,0.12)", color: "#FF9933", border: "1px solid rgba(255,153,51,0.2)" }}>
            Now speaking: <span className="font-bold">{LANGUAGES[langIdx]}</span>
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight fade-in-up max-w-4xl">
          Governance by{" "}
          <span className="gradient-text">Voice</span>,{" "}
          <br className="hidden md:block" />
          Not by Screen
        </h1>
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10 fade-in-up-delay-1">
          Any Indian citizen. Any phone. Any language. No internet needed.
          <br />
          File grievances, RTI requests, and track complaints — just by calling.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 items-center fade-in-up-delay-2">
          <div className="glass px-8 py-4 rounded-2xl text-center">
            <div className="text-xs text-gray-500 mb-1 uppercase tracking-widest">Toll-Free Helpline</div>
            <div className="text-3xl font-black text-white tracking-wider">1800-XXX-XXXX</div>
            <div className="text-xs text-green-400 mt-1">Available 24×7 in all languages</div>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/status">
              <button className="btn-ghost w-full">Check Complaint Status</button>
            </Link>
            <Link href="/login">
              <button className="btn-primary w-full">Officer Dashboard →</button>
            </Link>
          </div>
        </div>

        {/* Language pills */}
        <div className="mt-14 w-full max-w-3xl overflow-hidden fade-in-up-delay-3">
          <div className="text-xs uppercase tracking-widest text-gray-600 mb-4">Supported languages</div>
          <div className="flex gap-2 flex-wrap justify-center">
            {LANGUAGES.map((l) => (
              <span key={l} className="px-3 py-1 rounded-full text-sm"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8a8a9a" }}>
                {l}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-4 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-3">Why Voice Sarkar?</h2>
        <p className="text-center text-gray-500 mb-12">Designed for India's 1.4 billion citizens — not just the digitally literate.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass p-6 hover:border-orange-500/20 transition-all duration-300 group">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-lg mb-2 group-hover:text-orange-400 transition-colors">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="px-4 py-20 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-3">How It Works</h2>
        <p className="text-center text-gray-500 mb-14">Five simple steps from phone call to complaint filed.</p>
        <div className="space-y-6">
          {STEPS.map((s, i) => (
            <div key={s.num} className="glass p-6 flex gap-6 items-start">
              <div className="text-4xl font-black gradient-text shrink-0">{s.num}</div>
              <div>
                <h3 className="font-bold text-lg mb-1">{s.title}</h3>
                <p className="text-gray-400 text-sm">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Services ── */}
      <section id="services" className="px-4 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-3">Government Services</h2>
        <p className="text-center text-gray-500 mb-12">Integrated with India's major government portals.</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {SERVICES.map((s) => (
            <div key={s} className="glass p-4 text-center text-sm font-medium hover:border-orange-500/30 transition-all cursor-default">
              {s}
            </div>
          ))}
        </div>
      </section>

      {/* ── Status Check ── */}
      <section id="status" className="px-4 py-20 max-w-xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-3">Check Complaint Status</h2>
        <p className="text-gray-500 mb-8">Enter your complaint reference number to see the current status.</p>
        <div className="glass p-8 rounded-2xl">
          <input
            className="input-field mb-4"
            placeholder="e.g. VS-PEN-2026-AB12CD"
            value={refInput}
            onChange={(e) => setRefInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && refInput) window.location.href = `/status?ref=${refInput}`; }}
          />
          <button className="btn-primary w-full"
                  onClick={() => refInput && (window.location.href = `/status?ref=${refInput}`)}>
            Check Status →
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t text-center py-10 px-4 text-sm text-gray-600"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="mb-3 font-bold text-gray-400">🎙 Voice Sarkar</div>
        <p className="mb-4">An initiative to bring Governance by Voice to every Indian citizen.</p>
        <div className="flex justify-center gap-6 text-xs">
          <Link href="/login" className="hover:text-white transition-colors">Officer Login</Link>
          <Link href="/status" className="hover:text-white transition-colors">Check Status</Link>
          <a href="https://github.com/praveenkumarj967-cyber/VoiceSarkar" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>
        </div>
        <p className="mt-6 text-xs text-gray-700">© 2026 Voice Sarkar | Built with FastAPI + Next.js | India 🇮🇳</p>
      </footer>
    </div>
  );
}
