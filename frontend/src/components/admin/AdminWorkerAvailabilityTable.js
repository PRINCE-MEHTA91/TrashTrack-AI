import { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity,
  Users,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Power,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Building2,
  Calendar,
  ShieldCheck,
  Mail,
  Phone,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config/api.js";
import WorkerWorkingHoursModal from "./WorkerWorkingHoursModal";

function getInitials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export default function AdminWorkerAvailabilityTable() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ workers: [], active_count: 0, inactive_count: 0 });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'active', 'inactive'

  // Modal & Actions
  const [selectedWorkerForHours, setSelectedWorkerForHours] = useState(null);
  const [closingSessionWorkerId, setClosingSessionWorkerId] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  const fetchLiveStatus = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/admin/workers/availability/live`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setError(null);
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json.message || "Failed to load live availability records.");
      }
    } catch {
      setError("Unable to connect to live monitoring service.");
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchLiveStatus();

    // Auto-refresh interval (every 15 seconds)
    const interval = setInterval(() => {
      fetchLiveStatus(false);
    }, 15000);

    // Event listener for updates from other tabs
    function handleGlobalUpdate() {
      fetchLiveStatus(false);
    }
    window.addEventListener("tt:worker-availability-changed", handleGlobalUpdate);
    window.addEventListener("tt:workforce-updated", handleGlobalUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("tt:worker-availability-changed", handleGlobalUpdate);
      window.removeEventListener("tt:workforce-updated", handleGlobalUpdate);
    };
  }, [fetchLiveStatus]);

  // Admin Force-Close Session handler
  async function handleAdminCloseSession(worker) {
    if (!window.confirm(`Are you sure you want to end the active duty session for ${worker.full_name}?`)) {
      return;
    }
    setClosingSessionWorkerId(worker.id);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/admin/workers/${worker.id}/close-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setActionNotice({
          type: "success",
          message: `Active session for ${worker.full_name} was closed by admin.`,
        });
        await fetchLiveStatus(false);
      } else {
        setActionNotice({
          type: "error",
          message: resData.message || "Failed to close worker session.",
        });
      }
    } catch {
      setActionNotice({
        type: "error",
        message: "An error occurred while terminating worker session.",
      });
    } finally {
      setClosingSessionWorkerId(null);
    }
  }

  // Filtered workers list
  const filteredWorkers = (data?.workers || []).filter((w) => {
    if (statusFilter === "active" && !w.is_active) return false;
    if (statusFilter === "inactive" && w.is_active) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      w.full_name?.toLowerCase().includes(q) ||
      w.email?.toLowerCase().includes(q) ||
      w.phone_number?.toLowerCase().includes(q) ||
      w.assigned_area?.toLowerCase().includes(q) ||
      w.id?.toLowerCase().includes(q)
    );
  });

  return (
    <div id="admin-worker-availability-monitoring" className="space-y-5">
      {/* ── Top Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Total Workers</span>
            <Users className="w-4 h-4 text-primary-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-display font-bold text-white">
              {loading ? "…" : data.total_workers || data.workers?.length || 0}
            </span>
            <span className="block text-[11px] text-gray-500 mt-0.5">
              Assigned Field Workforce
            </span>
          </div>
        </div>

        <div className="card p-4 flex flex-col justify-between bg-emerald-500/5 border-emerald-500/20">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-semibold">Active On Duty</span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-display font-bold text-emerald-400">
              {loading ? "…" : data.active_count || 0}
            </span>
            <span className="block text-[11px] text-emerald-500/80 mt-0.5">
              Available for task allocation
            </span>
          </div>
        </div>

        <div className="card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Inactive / Off Duty</span>
            <span className="w-2.5 h-2.5 rounded-full bg-gray-500"></span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-display font-bold text-gray-300">
              {loading ? "…" : data.inactive_count || 0}
            </span>
            <span className="block text-[11px] text-gray-500 mt-0.5">
              Unavailable for new work
            </span>
          </div>
        </div>

        <div className="card p-4 flex flex-col justify-between bg-surface-card">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Live Polling</span>
            <Activity className="w-4 h-4 text-primary-400 animate-pulse" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-300 block">Auto-Sync</span>
              <span className="text-[11px] text-gray-500 block">Every 15s</span>
            </div>
            <button
              id="btn-admin-availability-refresh"
              onClick={() => fetchLiveStatus(true)}
              disabled={refreshing}
              className="p-2 rounded-xl bg-surface-muted hover:bg-surface-border text-gray-300 hover:text-white transition-all text-xs"
              title="Refresh live statuses now"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-primary-400" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Action Notice ── */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs animate-slide-down ${
            actionNotice.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          <span>{actionNotice.message}</span>
          <button
            onClick={() => setActionNotice(null)}
            className="text-gray-400 hover:text-white ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Controls: Search & Filters ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="admin-availability-search-input"
            type="text"
            placeholder="Search by worker name, ID, phone, email, or area…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-card border border-surface-border rounded-xl text-white placeholder-gray-500 text-xs focus:outline-none focus:border-primary-500/50"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Status:
          </span>
          {[
            { id: "all", label: "All" },
            { id: "active", label: `Active (${data.active_count || 0})` },
            { id: "inactive", label: `Inactive (${data.inactive_count || 0})` },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === pill.id
                  ? "bg-primary-500/20 text-primary-400 border border-primary-500/30 shadow-glow-sm"
                  : "bg-surface-card text-gray-400 hover:text-white border border-surface-border"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Live Monitoring Table ── */}
      {loading ? (
        <div className="card p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          <p className="text-xs text-gray-400 font-medium">Synchronizing live worker telemetry…</p>
        </div>
      ) : error ? (
        <div className="card p-8 flex flex-col items-center text-center">
          <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
          <h4 className="font-semibold text-white text-sm">Monitoring Data Unavailable</h4>
          <p className="text-xs text-gray-400 mt-1 max-w-sm">{error}</p>
        </div>
      ) : filteredWorkers.length === 0 ? (
        <div className="card p-10 text-center space-y-2">
          <Users className="w-8 h-8 mx-auto text-gray-500 opacity-60 mb-2" />
          <h4 className="text-sm font-semibold text-white">No workers found</h4>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            {searchQuery
              ? `No workers match "${searchQuery}" under the current filter.`
              : "No workers registered under this municipal jurisdiction yet."}
          </p>
        </div>
      ) : (
        <div className="border border-surface-border rounded-2xl overflow-hidden card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted/90 text-gray-400 border-b border-surface-border text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Worker</th>
                  <th className="py-3 px-3 font-semibold">Jurisdiction / Ward</th>
                  <th className="py-3 px-3 font-semibold">Current Status</th>
                  <th className="py-3 px-3 font-semibold">Active Session</th>
                  <th className="py-3 px-3 font-semibold">Last Status Change</th>
                  <th className="py-3 px-3 font-semibold">Today's Total Active Time</th>
                  <th className="py-3 px-3 font-semibold">Sessions Today</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/60">
                {filteredWorkers.map((w) => {
                  const initials = getInitials(w.full_name);
                  const isWorkerActive = w.is_active;

                  return (
                    <tr
                      key={w.id}
                      id={`live-worker-row-${w.id}`}
                      className="hover:bg-surface-muted/30 transition-colors"
                    >
                      {/* Worker info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0 ${
                              isWorkerActive
                                ? "bg-gradient-to-br from-emerald-500 to-emerald-700 ring-2 ring-emerald-500/30"
                                : "bg-gradient-to-br from-gray-600 to-gray-800 text-gray-300"
                            }`}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-white block truncate leading-tight">
                              {w.full_name}
                            </span>
                            <span className="text-[11px] text-gray-500 font-mono block truncate">
                              ID: {w.id.slice(0, 8)}…
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Jurisdiction */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 text-gray-300">
                          <Building2 className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                          <span className="truncate max-w-[150px]">
                            {w.assigned_area || "Unassigned"}
                          </span>
                        </div>
                      </td>

                      {/* Current Status */}
                      <td className="py-3.5 px-3">
                        {isWorkerActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold text-[11px] shadow-glow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                            🟢 Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-muted border border-surface-border text-gray-400 font-medium text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                            ⚪ Inactive
                          </span>
                        )}
                      </td>

                      {/* Active Session details */}
                      <td className="py-3.5 px-3 font-mono">
                        {isWorkerActive && w.current_session ? (
                          <div className="space-y-0.5">
                            <span className="text-emerald-300 font-semibold block text-xs">
                              {w.current_session.elapsed_formatted}
                            </span>
                            <span className="text-[10px] text-gray-400 block">
                              Since {w.current_session.started_at_formatted}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-xs">—</span>
                        )}
                      </td>

                      {/* Last Status Change */}
                      <td className="py-3.5 px-3 font-mono text-gray-400">
                        {w.last_status_change_formatted}
                      </td>

                      {/* Today's total active duration */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-white text-xs block">
                            {w.today_summary?.total_formatted || "0 mins"}
                          </span>
                          {w.today_summary?.total_words && (
                            <span className="text-[10px] text-gray-500 block truncate max-w-[140px]">
                              {w.today_summary.total_words}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sessions today */}
                      <td className="py-3.5 px-3 font-mono">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-muted text-gray-300 text-xs font-semibold">
                          {w.today_summary?.session_count || 0} session
                          {w.today_summary?.session_count === 1 ? "" : "s"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`btn-worker-history-${w.id}`}
                            onClick={() => setSelectedWorkerForHours(w)}
                            className="px-2.5 py-1.5 rounded-lg bg-surface-muted hover:bg-surface-border border border-surface-border text-primary-400 hover:text-primary-300 text-xs font-semibold flex items-center gap-1 transition-all"
                            title="View daily session timeline and history"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Working Hours</span>
                          </button>

                          {isWorkerActive && (
                            <button
                              id={`btn-admin-close-session-${w.id}`}
                              onClick={() => handleAdminCloseSession(w)}
                              disabled={closingSessionWorkerId === w.id}
                              className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 hover:text-red-300 transition-all text-xs disabled:opacity-50"
                              title="Force-close active session"
                            >
                              {closingSessionWorkerId === w.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Power className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Working Hours History Modal ── */}
      {selectedWorkerForHours && (
        <WorkerWorkingHoursModal
          workerId={selectedWorkerForHours.id}
          initialWorkerName={selectedWorkerForHours.full_name}
          onClose={() => setSelectedWorkerForHours(null)}
        />
      )}
    </div>
  );
}
