import { useState, useEffect } from "react";
import {
  ClipboardList,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Activity,
  Zap,
  ArrowRight,
  Loader2,
  MapPin
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config/api.js";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function StatCard({ icon: Icon, label, value, sub, color = "primary", loading }) {
  const colors = {
    primary: "bg-primary-500/15 border-primary-500/30 text-primary-400",
    amber:   "bg-amber-500/15   border-amber-500/30   text-amber-400",
    blue:    "bg-blue-500/15    border-blue-500/30    text-blue-400",
    emerald: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
    red:     "bg-red-500/15     border-red-500/30     text-red-400",
  };
  const cls = colors[color] || colors.primary;
  return (
    <div className="card p-5 flex flex-col gap-3 hover:border-primary-500/20 transition-colors">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${cls}`}>
        <Icon className="w-5 h-5" />
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-surface-muted animate-pulse rounded-lg" />
      ) : (
        <p className="font-display font-bold text-2xl text-white">{value ?? "—"}</p>
      )}
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminHomePage() {
  const { user, getToken } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [muni, setMuni] = useState(null);
  const [pendingWorkerCount, setPendingWorkerCount] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const token = getToken();
        if (!token) return;

        // ── Admin dashboard summary (complaint counts, user totals, worker stats) ──
        // This is a dedicated admin endpoint filtered by the admin's own municipality.
        // DO NOT use /citizen/stats here — that is a citizen-only route (403 for admins).
        fetch(`${API_URL}/admin/dashboard/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data && data.success) setStats(data);
          })
          .catch(() => {});

        // ── Municipality info ──
        fetch(`${API_URL}/municipalities/my`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => data?.municipality && setMuni(data.municipality))
          .catch(() => {});

        // ── Pending worker approvals count ──
        fetch(`${API_URL}/admin/workers/pending-count`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => typeof data?.count === "number" && setPendingWorkerCount(data.count))
          .catch(() => {});
      } catch (e) {
        // Silently fail — individual fetch calls handle their own errors
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [getToken]);


  const cards = [
    {
      icon: ClipboardList,
      label: "Total Complaints",
      value: stats?.totalComplaints ?? "—",
      sub: "All time",
      color: "primary",
      to: "/admin/complaints",
    },
    {
      icon: Clock,
      label: "Awaiting Worker",
      value: stats?.unassigned ?? "0",
      sub: "Needs worker assignment",
      color: "amber",
      to: "/admin/complaints?tab=unassigned",
    },
    {
      icon: Activity,
      label: "In Progress",
      value: stats?.inProgress ?? "—",
      sub: "Being resolved",
      color: "blue",
      to: "/admin/complaints?tab=in_progress",
    },
    {
      icon: CheckCircle2,
      label: "Resolved",
      value: stats?.resolved ?? "—",
      sub: "Completed",
      color: "emerald",
      to: "/admin/complaints?tab=resolved",
    },
  ];

  const quickLinks = [
    { to: "/admin/complaints?tab=unassigned", icon: Users, label: "Assign Unallocated Complaints", color: "text-amber-400" },
    { to: "/admin/complaints", icon: ClipboardList, label: "View All Complaints & Tasks", color: "text-primary-400" },
    { to: "/admin/workforce?tab=approvals", icon: AlertTriangle, label: "Pending Worker Approvals", color: "text-amber-400" },
    { to: "/admin/workforce", icon: Users, label: "Manage Workforce", color: "text-blue-400" },
  ];


  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-gray-400 text-sm mb-1">{getGreeting()},</p>
          <h1 id="admin-overview-title" className="font-display font-bold text-2xl md:text-3xl text-white">
            {user?.full_name ?? "Administrator"} 👋
          </h1>
          {muni ? (
             <p className="text-gray-400 text-sm mt-1 flex items-center gap-1.5">
               <MapPin className="w-4 h-4 text-primary-400" />
               Managing <span className="font-medium text-white">{muni.name}</span>, {muni.state}
             </p>
          ) : (
             <p className="text-gray-400 text-sm mt-1">Here's what's happening across your municipality today.</p>
          )}
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-card border border-surface-border">
          <Zap className="w-3.5 h-3.5 text-primary-400" />
          <span className="text-xs text-gray-300 font-medium">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <NavLink key={c.to} to={c.to} className="block hover:-translate-y-0.5 transition-transform duration-200">
            <StatCard
              icon={c.icon}
              label={c.label}
              value={c.value}
              sub={c.sub}
              color={c.color}
              loading={loading}
            />
          </NavLink>
        ))}
      </div>

      {/* Quick actions */}
      <div className="card p-6">
        <h2 className="font-display font-semibold text-white text-base mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary-400" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickLinks.map((link) => {
            const isApprovals = link.to.includes("approvals");
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-muted hover:bg-surface-border border border-surface-border hover:border-primary-500/30 transition-all duration-200 group"
              >
                <link.icon className={`w-4.5 h-4.5 shrink-0 ${link.color}`} />
                <span className="text-sm text-gray-300 group-hover:text-white font-medium flex-1">{link.label}</span>
                {isApprovals && pendingWorkerCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold">
                    {pendingWorkerCount} pending
                  </span>
                )}
                <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Info footer */}
      <div className="rounded-xl border border-surface-border bg-surface-card px-6 py-4">
        <p className="text-xs text-gray-400 leading-relaxed">
          <span className="text-gray-300 font-semibold">TrashTrack AI Admin Dashboard</span> — Use the sidebar to manage complaints, workforce, municipal operations, analytics, and settings. Data shown reflects live API state.
        </p>
      </div>
    </div>
  );
}
