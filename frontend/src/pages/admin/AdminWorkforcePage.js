import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Users,
  AlertTriangle,
  Activity,
  BarChart2,
  Star,
  Loader2,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config/api.js";

const TABS = [
  { id: "all",          label: "All Workers",       icon: Users },
  { id: "approvals",    label: "Pending Approvals", icon: AlertTriangle },
  { id: "availability", label: "Availability",      icon: Activity },
  { id: "workload",     label: "Workload",           icon: BarChart2 },
  { id: "performance",  label: "Performance",        icon: Star },
];

function getInitials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
}

function WorkerCard({ worker }) {
  const initials = getInitials(worker.full_name);
  const isActive = worker.status === "active";
  const joinDate = worker.created_at
    ? new Date(worker.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  return (
    <div className="card p-5 flex items-start gap-4 hover:border-primary-500/20 transition-colors">
      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center font-bold text-white text-sm shrink-0 ring-2 ring-primary-500/20">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-white text-sm">{worker.full_name}</h3>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${
            isActive
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
              : "bg-amber-500/15 border-amber-500/30 text-amber-400"
          }`}>
            {isActive ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {isActive ? "Active" : worker.status}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{worker.email}</span>
          {worker.phone_number && (
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{worker.phone_number}</span>
          )}
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Joined {joinDate}</span>
        </div>
        {worker.address && (
          <p className="text-xs text-gray-600 mt-1 truncate">{worker.address}</p>
        )}
      </div>
    </div>
  );
}

function ComingSoonSection({ label }) {
  return (
    <div className="card p-10 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4">
        <Users className="w-7 h-7 text-primary-400" />
      </div>
      <h3 className="font-display font-semibold text-white text-lg mb-2">{label}</h3>
      <p className="text-gray-400 text-sm max-w-sm leading-relaxed">
        This section will be populated once the admin workforce API endpoints are available.
      </p>
      <span className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-400 text-xs font-bold">
        API Pending
      </span>
    </div>
  );
}

export default function AdminWorkforcePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { getToken } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const tabParam = searchParams.get("tab") || "all";
  const activeTab = TABS.find(t => t.id === tabParam)?.id || "all";

  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) return;
      // Admin workers listing endpoint (to be implemented)
      const res = await fetch(`${API_URL}/admin/workers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWorkers(data.workers || []);
      } else {
        setError("Admin workers API is not yet available.");
        setWorkers([]);
      }
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { if (activeTab === "all" || activeTab === "approvals") fetchWorkers(); else setLoading(false); }, [fetchWorkers, activeTab]);

  function setTab(id) {
    if (id === "all") setSearchParams({});
    else setSearchParams({ tab: id });
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 id="admin-workforce-title" className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-400" />
            Workforce
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage workers, approvals, availability, and performance</p>
        </div>
        <button
          id="admin-workforce-refresh-btn"
          onClick={fetchWorkers}
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
              id={`admin-workforce-tab-${tab.id}`}
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

      {/* Content */}
      {activeTab === "availability" ? (
        <ComingSoonSection label="Worker Availability" />
      ) : activeTab === "workload" ? (
        <ComingSoonSection label="Workload Distribution" />
      ) : activeTab === "performance" ? (
        <ComingSoonSection label="Worker Performance" />
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          <p className="text-gray-400 text-sm">Loading workforce data…</p>
        </div>
      ) : error ? (
        <div className="card p-10 flex flex-col items-center text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mb-4" />
          <h3 className="font-semibold text-white mb-2">Could not load workers</h3>
          <p className="text-gray-400 text-sm max-w-sm">{error}</p>
          <span className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
            Admin API Endpoint Coming Soon
          </span>
        </div>
      ) : workers.length === 0 ? (
        <div className="card p-10 flex flex-col items-center text-center">
          <Users className="w-10 h-10 text-gray-600 mb-4" />
          <h3 className="font-semibold text-white mb-2">
            {activeTab === "approvals" ? "No pending approvals" : "No workers found"}
          </h3>
          <p className="text-gray-400 text-sm">
            {activeTab === "approvals"
              ? "All worker registrations have been processed."
              : "No workers have been registered yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {workers
            .filter(w => activeTab === "approvals" ? w.status !== "active" : true)
            .map(w => <WorkerCard key={w.id} worker={w} />)}
        </div>
      )}
    </div>
  );
}
