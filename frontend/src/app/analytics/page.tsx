"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { LoadingSpinner, SectionHeader } from "@/components/ui";
import { analyticsApi } from "@/lib/api";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["#FF9933","#60a5fa","#4ade80","#f87171","#a78bfa","#facc15","#fb923c","#34d399"];

export default function AnalyticsPage() {
  const router = useRouter();
  const [timeseries, setTimeseries]   = useState<{date:string;count:number}[]>([]);
  const [langBreak, setLangBreak]     = useState<{language:string;count:number}[]>([]);
  const [resTime, setResTime]         = useState<{intent:string;avg_hours:number;count:number}[]>([]);
  const [officers, setOfficers]       = useState<{officer_name:string;total_assigned:number;resolved:number}[]>([]);
  const [loading, setLoading]         = useState(true);
  const [role, setRole]               = useState("admin");

  useEffect(() => {
    const u = localStorage.getItem("vs_user");
    if (!u) { router.push("/login"); return; }
    setRole(JSON.parse(u).role);
    Promise.all([
      analyticsApi.timeseries(30),
      analyticsApi.languageBreakdown(),
      analyticsApi.resolutionTime(),
      analyticsApi.officerPerformance(),
    ]).then(([t, l, r, o]) => {
      setTimeseries(t.data);
      setLangBreak(l.data);
      setResTime(r.data);
      setOfficers(o.data);
    }).catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const tooltip = { contentStyle: { background:"#12121a", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, color:"#f0f0f0" } };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background:"#0a0a0f" }}>
      <Sidebar role={role} />
      <main className="flex-1 overflow-y-auto p-8">
        <SectionHeader title="Analytics" subtitle="Real-time insights across all Voice Sarkar activity" />

        {loading ? <LoadingSpinner /> : (
          <div className="space-y-6">
            {/* Line chart — complaints over 30 days */}
            <div className="glass p-6">
              <h2 className="font-bold mb-4">Complaints Filed (Last 30 Days)</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={timeseries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill:"#6b7280", fontSize:11 }} tickFormatter={(v)=>v.slice(5)} />
                  <YAxis tick={{ fill:"#6b7280", fontSize:11 }} />
                  <Tooltip {...tooltip} />
                  <Line type="monotone" dataKey="count" stroke="#FF9933" strokeWidth={2} dot={false} name="Complaints" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Language pie */}
              <div className="glass p-6">
                <h2 className="font-bold mb-4">Calls by Language</h2>
                {langBreak.length === 0
                  ? <p className="text-gray-500 text-sm text-center py-8">No call data yet</p>
                  : <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={langBreak} dataKey="count" nameKey="language" cx="50%" cy="50%"
                             outerRadius={80} label={({ language, percent }) => `${language} ${(percent*100).toFixed(0)}%`}
                             labelLine={false}>
                          {langBreak.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip {...tooltip} />
                      </PieChart>
                    </ResponsiveContainer>
                }
              </div>

              {/* Resolution time */}
              <div className="glass p-6">
                <h2 className="font-bold mb-4">Avg Resolution Time (hours)</h2>
                {resTime.length === 0
                  ? <p className="text-gray-500 text-sm text-center py-8">No resolved complaints yet</p>
                  : <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={resTime} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" tick={{ fill:"#6b7280", fontSize:11 }} />
                        <YAxis type="category" dataKey="intent" tick={{ fill:"#6b7280", fontSize:11 }} width={80} />
                        <Tooltip {...tooltip} />
                        <Bar dataKey="avg_hours" fill="#60a5fa" radius={4} name="Avg Hours" />
                      </BarChart>
                    </ResponsiveContainer>
                }
              </div>
            </div>

            {/* Officer performance */}
            <div className="glass p-6">
              <h2 className="font-bold mb-4">Officer Performance</h2>
              {officers.length === 0
                ? <p className="text-gray-500 text-sm text-center py-8">No officer data</p>
                : <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-500 border-b" style={{ borderColor:"rgba(255,255,255,0.06)" }}>
                          <th className="text-left py-3 px-2">Officer</th>
                          <th className="text-left py-3 px-2">Assigned</th>
                          <th className="text-left py-3 px-2">Resolved</th>
                          <th className="text-left py-3 px-2">Resolution Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {officers.map((o) => (
                          <tr key={o.officer_name} className="border-b" style={{ borderColor:"rgba(255,255,255,0.04)" }}>
                            <td className="py-3 px-2 font-medium">{o.officer_name}</td>
                            <td className="py-3 px-2">{o.total_assigned}</td>
                            <td className="py-3 px-2 text-green-400">{o.resolved}</td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-24 rounded-full bg-gray-800 overflow-hidden">
                                  <div className="h-full rounded-full bg-green-500"
                                       style={{ width: o.total_assigned > 0 ? `${(o.resolved/o.total_assigned)*100}%` : "0%" }} />
                                </div>
                                <span className="text-xs text-gray-400">
                                  {o.total_assigned > 0 ? `${Math.round((o.resolved/o.total_assigned)*100)}%` : "—"}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              }
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
