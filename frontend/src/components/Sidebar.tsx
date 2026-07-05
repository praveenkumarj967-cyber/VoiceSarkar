"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, FileText, Users, BarChart2,
  Shield, LogOut, Phone, Activity,
} from "lucide-react";

const NAV_ADMIN = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/complaints", icon: FileText, label: "Complaints" },
  { href: "/admin/simulator", icon: Phone, label: "Voice Simulator" },
  { href: "/admin/citizens", icon: Users, label: "Citizens" },
  { href: "/admin/users", icon: Shield, label: "Users" },
  { href: "/analytics", icon: BarChart2, label: "Analytics" },
];

const NAV_OFFICER = [
  { href: "/officer", icon: LayoutDashboard, label: "My Complaints" },
  { href: "/analytics", icon: BarChart2, label: "Analytics" },
];

export default function Sidebar({ role = "admin" }: { role?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const nav = role === "admin" ? NAV_ADMIN : NAV_OFFICER;

  return (
    <aside className="w-64 shrink-0 flex flex-col h-screen sticky top-0"
           style={{ background: "rgba(10,10,15,0.95)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
             style={{ background: "linear-gradient(135deg,#FF9933,#138808)" }}>🎙</div>
        <div>
          <div className="font-bold text-sm">Voice Sarkar</div>
          <div className="text-xs text-gray-500 capitalize">{role} Portal</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/admin" && href !== "/officer" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className={`nav-item ${active ? "active" : ""}`}>
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-4 border-t space-y-1" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <Link href="/" className="nav-item">
          <Phone size={18} /> Public Site
        </Link>
        <button onClick={logout} className="nav-item w-full text-left hover:text-red-400">
          <LogOut size={18} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
