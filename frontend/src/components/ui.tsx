import { ReactNode } from "react";

type CardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: string;
  color?: string;
};

export function StatCard({ title, value, subtitle, icon, trend, color = "#FF9933" }: CardProps) {
  return (
    <div className="glass p-5 hover:scale-[1.01] transition-transform duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="text-2xl">{icon}</div>
        {trend && (
          <span className="text-xs px-2 py-1 rounded-full"
                style={{ background: trend.startsWith("+") ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                         color: trend.startsWith("+") ? "#4ade80" : "#f87171" }}>
            {trend}
          </span>
        )}
      </div>
      <div className="text-3xl font-extrabold mb-1" style={{ color }}>{value}</div>
      <div className="text-sm font-medium text-gray-300">{title}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}

export function Badge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status.replace("_", " ")}</span>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    high: "rgba(239,68,68,0.15)/#f87171/rgba(239,68,68,0.3)",
    medium: "rgba(234,179,8,0.15)/#facc15/rgba(234,179,8,0.3)",
    low: "rgba(107,114,128,0.15)/#9ca3af/rgba(107,114,128,0.3)",
  };
  const [bg, fg, border] = (colors[priority] || colors.medium).split("/");
  return (
    <span className="badge" style={{ background: bg, color: fg, border: `1px solid ${border}` }}>
      {priority}
    </span>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="w-10 h-10 rounded-full border-2 border-t-orange-500 animate-spin"
           style={{ borderColor: "rgba(255,255,255,0.1)", borderTopColor: "#FF9933" }} />
    </div>
  );
}

export function EmptyState({ message = "No data found" }: { message?: string }) {
  return (
    <div className="text-center py-16 text-gray-500">
      <div className="text-4xl mb-3">📭</div>
      <p>{message}</p>
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
