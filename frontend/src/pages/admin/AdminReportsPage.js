import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Layers,
  Star,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config/api.js";

const TABS = [
  { id: "trends",      label: "Complaint Trends",   icon: TrendingUp },
  { id: "resolution",  label: "Resolution Rates",   icon: CheckCircle2 },
  { id: "waste",       label: "Waste Statistics",   icon: Layers },
  { id: "worker-perf", label: "Worker Performance", icon: Star },
];

function StatBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const colors = {
    primary: "bg-primary-500",
    amber:   "bg-amber-500",
    blue:    "bg-blue-500",
    red:     "bg-red-500",
    gray:    "bg-gray-500",
    emerald: "bg-emerald-500",
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-300 font-medium">{label}</span>
        <span className="text-gray-400">{value} ({pct}%)</span>
      </div>
      <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colors[color] || colors.primary}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color = "primary" }) {
  const colors = {
    primary: "bg-primary-500/15 border-primary-500/30 text-primary-400",
    amber:   "bg-amber-500/15   border-amber-500/30   text-amber-400",
    blue:    "bg-blue-500/15    border-blue-500/30    text-blue-400",
    emerald: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
    red:     "bg-red-500/15     border-red-500/30     text-red-400",
  };
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${colors[color]}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <p className="font-display font-bold text-2xl text-white">{value}</p>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}

function ComingSoonCard({ label, description }) {
  return (
    <div className="card p-10 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4">
        <BarChart3 className="w-7 h-7 text-primary-400" />
      </div>
      <h3 className="font-display font-semibold text-white text-lg mb-2">{label}</h3>
      <p className="text-gray-400 text-sm max-w-sm leading-relaxed">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-400 text-xs font-bold">
        API Pending
      </span>
    </div>
  );
}

export default function AdminReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { getToken } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  const tabParam  = searchParams.get("tab") || "trends";
  const activeTab = TABS.find(t => t.id === tabParam)?.id || "trends";

  function setTab(id) {
    if (id === "trends") setSearchParams({});
    else setSearchParams({ tab: id });
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/complaints/me?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derived stats from complaints data
  const total = complaints.length;
  const byStatus = {
    SUBMITTED:   complaints.filter(c => c.status === "SUBMITTED").length,
    PENDING:     complaints.filter(c => c.status === "PENDING").length,
    IN_PROGRESS: complaints.filter(c => c.status === "IN_PROGRESS").length,
    RESOLVED:    complaints.filter(c => ["RESOLVED","CLOSED","VERIFIED"].includes(c.status)).length,
  };
  const byType = {
    ORGANIC:   complaints.filter(c => c.waste_type === "ORGANIC").length,
    PLASTIC:   complaints.filter(c => c.waste_type === "PLASTIC").length,
    HAZARDOUS: complaints.filter(c => c.waste_type === "HAZARDOUS").length,
    BULK:      complaints.filter(c => c.waste_type === "BULK").length,
    OTHER:     complaints.filter(c => c.waste_type === "OTHER").length,
  };
  const bySeverity = {
    LOW:    complaints.filter(c => c.severity === "LOW").length,
    MEDIUM: complaints.filter(c => c.severity === "MEDIUM").length,
    HIGH:   complaints.filter(c => c.severity === "HIGH").length,
  };
  const resolutionRate = total > 0 ? Math.round((byStatus.RESOLVED / total) * 100) : 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 id="admin-reports-title" className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary-400" />
            Reports & Analytics
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Insights and statistics across all municipal waste management operations</p>
        </div>
        <button
          id="admin-reports-refresh-btn"
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-muted border border-surface-border hover:border-primary-500/40 text-gray-400 hover:text-white transition-all text-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-surface-card border border-surface-border rounded-xl overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`admin-reports-tab-${tab.id}`}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          <p className="text-gray-400 text-sm">Loading analytics…</p>
        </div>
      ) : activeTab === "trends" ? (
        <div className="space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard icon={BarChart3}    label="Total Complaints"  value={total}                         color="primary" />
            <SummaryCard icon={TrendingUp}   label="Resolution Rate"   value={`${resolutionRate}%`}          color="emerald" />
            <SummaryCard icon={AlertCircle}  label="High Severity"     value={bySeverity.HIGH}               color="red" />
            <SummaryCard icon={CheckCircle2} label="Resolved"          value={byStatus.RESOLVED}             color="blue" />
          </div>

          {/* Status distribution */}
          <div className="card p-6 space-y-5">
            <h2 className="font-display font-semibold text-white text-sm">Complaint Status Distribution</h2>
            <div className="space-y-4">
              <StatBar label="Submitted"   value={byStatus.SUBMITTED}   max={total} color="gray" />
              <StatBar label="Pending"     value={byStatus.PENDING}     max={total} color="amber" />
              <StatBar label="In Progress" value={byStatus.IN_PROGRESS} max={total} color="blue" />
              <StatBar label="Resolved"    value={byStatus.RESOLVED}    max={total} color="emerald" />
            </div>
          </div>

          {/* Severity distribution */}
          <div className="card p-6 space-y-5">
            <h2 className="font-display font-semibold text-white text-sm">Severity Distribution</h2>
            <div className="space-y-4">
              <StatBar label="Low"    value={bySeverity.LOW}    max={total} color="primary" />
              <StatBar label="Medium" value={bySeverity.MEDIUM} max={total} color="amber" />
              <StatBar label="High"   value={bySeverity.HIGH}   max={total} color="red" />
            </div>
          </div>
        </div>
      ) : activeTab === "resolution" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <SummaryCard icon={CheckCircle2} label="Resolved"       value={byStatus.RESOLVED}             color="emerald" />
            <SummaryCard icon={TrendingUp}   label="Resolution Rate" value={`${resolutionRate}%`}         color="primary" />
            <SummaryCard icon={AlertCircle}  label="Still Open"     value={byStatus.PENDING + byStatus.IN_PROGRESS} color="amber" />
          </div>
          <div className="card p-6 space-y-5">
            <h2 className="font-display font-semibold text-white text-sm">Resolution Breakdown</h2>
            <div className="space-y-4">
              <StatBar label="Resolved" value={byStatus.RESOLVED}    max={total} color="emerald" />
              <StatBar label="Pending"  value={byStatus.PENDING}     max={total} color="amber" />
              <StatBar label="Active"   value={byStatus.IN_PROGRESS} max={total} color="blue" />
            </div>
          </div>
        </div>
      ) : activeTab === "waste" ? (
        <div className="space-y-6">
          <div className="card p-6 space-y-5">
            <h2 className="font-display font-semibold text-white text-sm">Waste Type Statistics</h2>
            <div className="space-y-4">
              <StatBar label="Organic"   value={byType.ORGANIC}   max={total} color="emerald" />
              <StatBar label="Plastic"   value={byType.PLASTIC}   max={total} color="blue" />
              <StatBar label="Hazardous" value={byType.HAZARDOUS} max={total} color="red" />
              <StatBar label="Bulk"      value={byType.BULK}      max={total} color="amber" />
              <StatBar label="Other"     value={byType.OTHER}     max={total} color="gray" />
            </div>
          </div>
        </div>
      ) : (
        <ComingSoonCard
          label="Worker Performance Analytics"
          description="Detailed per-worker performance metrics, resolution times, and efficiency scores will be available once the workforce API is implemented."
        />
      )}
    </div>
  );
}
