import { useState, useEffect, useCallback } from "react";
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  History,
  Activity,
  User,
  Building2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config/api.js";

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatPrettyDate(dateStr) {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function WorkerWorkingHoursModal({ workerId, initialWorkerName, onClose }) {
  const { getToken } = useAuth();
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const fetchHours = useCallback(async (date) => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/admin/workers/${workerId}/working-hours?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json.message || "Failed to load working hours for this worker.");
      }
    } catch {
      setError("Network error while loading worker activity history.");
    } finally {
      setLoading(false);
    }
  }, [workerId, getToken]);

  useEffect(() => {
    fetchHours(selectedDate);
  }, [fetchHours, selectedDate]);

  const isToday = selectedDate === getTodayStr();

  return (
    <div
      id="worker-working-hours-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        id="worker-working-hours-modal-content"
        className="w-full max-w-2xl bg-surface-card border border-surface-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between shrink-0 bg-surface-card/95">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center text-primary-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-bold text-white text-base truncate">
                Working Hours & Duty History
              </h3>
              <p className="text-xs text-gray-400 truncate">
                {data?.worker?.full_name || initialWorkerName || "Worker"} • ID: {workerId.slice(0, 8)}…
              </p>
            </div>
          </div>

          <button
            id="btn-close-working-hours-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Modal Body ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Date Selector Navigation */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-surface-muted border border-surface-border rounded-xl">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDate((d) => shiftDate(d, -1))}
                className="p-1.5 rounded-lg bg-surface-card hover:bg-surface-border border border-surface-border text-gray-300 hover:text-white transition-all text-xs flex items-center gap-1"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Previous Day</span>
              </button>

              <button
                onClick={() => setSelectedDate(getTodayStr())}
                disabled={isToday}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isToday
                    ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                    : "bg-surface-card hover:bg-surface-border border border-surface-border text-gray-300 hover:text-white"
                }`}
              >
                Today
              </button>

              <button
                onClick={() => setSelectedDate((d) => shiftDate(d, 1))}
                disabled={isToday}
                className="p-1.5 rounded-lg bg-surface-card hover:bg-surface-border border border-surface-border text-gray-300 hover:text-white transition-all text-xs flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Next Day"
              >
                <span className="hidden sm:inline">Next Day</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                id="working-hours-date-picker"
                type="date"
                max={getTodayStr()}
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="px-2.5 py-1 bg-surface-card border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
              />
            </div>
          </div>

          {/* Daily KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-surface-border">
              <span className="text-[11px] font-medium text-gray-400 block mb-1">
                Selected Date
              </span>
              <p className="text-sm font-semibold text-white">
                {formatPrettyDate(selectedDate)}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-primary-500/10 border border-primary-500/25">
              <span className="text-[11px] font-medium text-primary-300 block mb-1">
                Total Active Time
              </span>
              <p className="text-base font-bold text-primary-400 font-mono">
                {loading ? "…" : data?.total_active_formatted || "0 mins"}
              </p>
              {data?.total_active_words && (
                <span className="text-[11px] text-gray-400 block mt-0.5">
                  ({data.total_active_words})
                </span>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-surface-border">
              <span className="text-[11px] font-medium text-gray-400 block mb-1">
                Duty Sessions
              </span>
              <p className="text-base font-bold text-white font-mono">
                {loading ? "…" : `${data?.sessions_count || 0} session${data?.sessions_count === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>

          {/* ── Sessions Breakdown Table ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-primary-400" />
                Session Timeline for {selectedDate}
              </h4>
            </div>

            {loading ? (
              <div className="p-10 flex flex-col items-center justify-center gap-2 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
                <span className="text-xs">Loading duty records…</span>
              </div>
            ) : error ? (
              <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : !data?.sessions || data.sessions.length === 0 ? (
              <div className="p-8 rounded-xl bg-surface-muted border border-surface-border text-center text-gray-400 space-y-1">
                <Clock className="w-7 h-7 mx-auto text-gray-500 mb-2 opacity-60" />
                <p className="text-xs font-semibold text-gray-300">No duty sessions on this date</p>
                <p className="text-[11px] text-gray-500">
                  The worker was off-duty or inactive on {formatPrettyDate(selectedDate)}.
                </p>
              </div>
            ) : (
              <div className="border border-surface-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-muted/80 text-gray-400 border-b border-surface-border text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">#</th>
                        <th className="py-2.5 px-3 font-semibold">Start Time</th>
                        <th className="py-2.5 px-3 font-semibold">End Time</th>
                        <th className="py-2.5 px-3 font-semibold">Duration</th>
                        <th className="py-2.5 px-3 font-semibold">Status / Closure</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border/60">
                      {data.sessions.map((s) => (
                        <tr
                          key={s.id}
                          className="hover:bg-surface-muted/40 transition-colors"
                        >
                          <td className="py-3 px-3 text-gray-500 font-mono">
                            {s.session_number}
                          </td>
                          <td className="py-3 px-3 text-white font-mono font-medium">
                            {s.started_at_formatted}
                          </td>
                          <td className="py-3 px-3 font-mono">
                            {s.is_ongoing ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                In Progress
                              </span>
                            ) : (
                              <span className="text-gray-300">{s.ended_at_formatted}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-primary-400">
                            {s.duration_formatted}
                          </td>
                          <td className="py-3 px-3 text-gray-400 text-[11px]">
                            {s.closure_reason_label}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-surface-muted/50 border-t border-surface-border text-xs font-semibold">
                      <tr>
                        <td colSpan={3} className="py-2.5 px-3 text-white">
                          Total Active Hours ({data.date})
                        </td>
                        <td colSpan={2} className="py-2.5 px-3 text-primary-400 font-mono">
                          {data.total_active_formatted} ({data.total_active_words})
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── Recent 14-day history quick picker ── */}
          {data?.recent_history && data.recent_history.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-surface-border">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-gray-500" />
                Recent Daily Activity Logs
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {data.recent_history.map((h) => {
                  const isSelected = h.work_date === selectedDate;
                  return (
                    <button
                      key={h.work_date}
                      onClick={() => setSelectedDate(h.work_date)}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "bg-primary-500/15 border-primary-500/40 text-primary-300"
                          : "bg-surface-muted/50 border-surface-border text-gray-400 hover:text-white hover:border-gray-600"
                      }`}
                    >
                      <span className="text-[10px] block text-gray-500 font-mono">
                        {h.work_date}
                      </span>
                      <span className="text-xs font-semibold text-white block mt-0.5">
                        {h.total_formatted}
                      </span>
                      <span className="text-[10px] text-gray-500 block">
                        {h.sessions_count} session{h.sessions_count === 1 ? "" : "s"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div className="px-6 py-3 border-t border-surface-border flex justify-end shrink-0 bg-surface-card">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-muted hover:bg-surface-border text-gray-300 hover:text-white text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
