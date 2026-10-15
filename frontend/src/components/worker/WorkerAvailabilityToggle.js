import { useState, useEffect, useRef, useCallback } from "react";
import {
  Power,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldAlert,
  Info,
  X,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config/api.js";

function formatElapsed(totalSeconds) {
  if (totalSeconds < 0) totalSeconds = 0;
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export default function WorkerAvailabilityToggle() {
  const { user, getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [errorModal, setErrorModal] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const heartbeatRef = useRef(null);

  // Fetch current availability from backend
  const fetchAvailability = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/worker/availability`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAvailability(data);
        if (data.is_active && data.current_session?.started_at) {
          const startMs = new Date(data.current_session.started_at).getTime();
          const nowMs = Date.now();
          setElapsedSeconds(Math.max(0, Math.floor((nowMs - startMs) / 1000)));
        } else {
          setElapsedSeconds(0);
        }
      }
    } catch (err) {
      console.error("Failed to load worker availability:", err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Live timer tick when worker is active
  useEffect(() => {
    if (!availability?.is_active || !availability?.current_session?.started_at) {
      return;
    }
    const timer = setInterval(() => {
      const startMs = new Date(availability.current_session.started_at).getTime();
      const nowMs = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((nowMs - startMs) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [availability?.is_active, availability?.current_session?.started_at]);

  // Periodic heartbeat when active (every 90s)
  useEffect(() => {
    if (!availability?.is_active) {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      return;
    }

    async function sendHeartbeat() {
      try {
        const token = getToken();
        if (!token) return;
        await fetch(`${API_URL}/worker/availability/heartbeat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (_) {}
    }

    heartbeatRef.current = setInterval(sendHeartbeat, 90000);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [availability?.is_active, getToken]);

  // Toggle handler
  async function handleToggle() {
    if (toggling) return;

    const isCurrentlyActive = availability?.is_active;
    const targetAction = isCurrentlyActive ? "INACTIVE" : "ACTIVE";

    // Immediate client-side check if attempting to activate without approval
    if (!isCurrentlyActive && !isEligible) {
      setErrorModal({
        title: "Duty Activation Restricted",
        message:
          availability?.rejection_reason || user?.rejection_reason
            ? `Your worker account was rejected (${availability?.rejection_reason || user?.rejection_reason}). You cannot go Active.`
            : "Your registration is currently pending administrator verification. Only approved workers can go Active.",
        status: availability?.verification_status || user?.verification_status,
      });
      return;
    }

    setToggling(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/worker/availability/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: targetAction }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAvailability((prev) => ({
          ...prev,
          availability_status: data.availability_status,
          is_active: data.is_active,
          current_session: data.current_session,
          today_summary: data.today_summary,
        }));
        if (data.is_active) {
          setElapsedSeconds(0);
        }
        window.dispatchEvent(
          new CustomEvent("tt:worker-availability-changed", { detail: data })
        );
      } else {
        setErrorModal({
          title: "Activation Denied",
          message: data.message || "Unable to update status. Please try again.",
          status: data.code || "DENIED",
        });
      }
    } catch {
      setErrorModal({
        title: "Connection Failed",
        message: "Unable to reach server to update status. Please check your network.",
        status: "NETWORK_ERROR",
      });
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-muted border border-surface-border animate-pulse">
        <Loader2 className="w-3.5 h-3.5 text-gray-500 animate-spin" />
        <span className="text-xs text-gray-500 font-medium">Checking status…</span>
      </div>
    );
  }

  const isActive = Boolean(availability?.is_active);
  // An approved worker has eligible = true, verification_status === "APPROVED", or user.status === "active"
  const isApprovedWorker =
    availability?.eligible ??
    (user?.status === "active" || user?.verification_status === "APPROVED");
  const isEligible = Boolean(isApprovedWorker);

  if (loading && !availability) {
    return (
      <div
        id="worker-topbar-availability"
        className="flex items-center gap-2 sm:gap-3 bg-surface-card border border-surface-border rounded-xl px-2.5 sm:px-3 py-1.5 shadow-sm"
      >
        <span className="inline-flex rounded-full h-2.5 w-2.5 bg-gray-500"></span>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-400" />
          <span className="hidden sm:inline">Syncing duty status…</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        id="worker-topbar-availability"
        className="flex items-center gap-2 sm:gap-3 bg-surface-card border border-surface-border rounded-xl px-2.5 sm:px-3 py-1.5 shadow-sm"
      >
        {/* Status Indicator & Timer */}
        <div className="flex items-center gap-2">
          {isActive ? (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-glow-sm"></span>
              </span>
              <div className="hidden sm:flex flex-col">
                <span className="text-xs font-bold text-emerald-400 leading-none">
                  Active
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1 font-mono">
                  <Clock className="w-2.5 h-2.5 text-emerald-400" />
                  {formatElapsed(elapsedSeconds)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full h-2.5 w-2.5 bg-gray-500"></span>
              <div className="hidden sm:flex flex-col">
                <span className="text-xs font-medium text-gray-400 leading-none">
                  Inactive
                </span>
                {availability?.today_summary?.total_seconds > 0 ? (
                  <span className="text-[10px] text-gray-500 mt-0.5">
                    Today: {availability.today_summary.total_formatted}
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-500 mt-0.5">
                    Off duty
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Toggle Action Button */}
        <button
          id="btn-worker-availability-toggle"
          onClick={handleToggle}
          disabled={toggling}
          title={
            isActive
              ? "Click to go Inactive (stop tracking shift)"
              : !isEligible
              ? "Account verification required before going Active"
              : "Click to go Active (start tracking shift)"
          }
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 select-none ${
            toggling
              ? "opacity-60 cursor-not-allowed bg-surface-muted text-gray-400"
              : isActive
              ? "bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 hover:text-red-200 shadow-sm"
              : !isEligible
              ? "bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200"
              : "bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 shadow-glow-sm"
          }`}
        >
          {toggling ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
          ) : isActive ? (
            <Power className="w-3.5 h-3.5 text-red-400" />
          ) : !isEligible ? (
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Power className="w-3.5 h-3.5 text-emerald-400" />
          )}

          <span>
            {toggling
              ? "Updating…"
              : isActive
              ? "Go Inactive"
              : !isEligible
              ? "Pending Verification"
              : "Go Active"}
          </span>
        </button>
      </div>

      {/* ── Modal for unverified / blocked notice ── */}
      {errorModal && (
        <div
          id="availability-error-modal"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setErrorModal(null)}
        >
          <div
            className="w-full max-w-md bg-surface-card border border-surface-border rounded-2xl shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-bold text-white text-base">
                  {errorModal.title}
                </h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  {errorModal.message}
                </p>
              </div>
              <button
                onClick={() => setErrorModal(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-surface-muted border border-surface-border text-xs text-gray-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-gray-200">
                <Info className="w-3.5 h-3.5 text-primary-400" />
                <span>Verification Policy</span>
              </div>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Only workers verified and approved by their local municipal administrator can clock in for duty and accept task assignments.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setErrorModal(null)}
                className="px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
