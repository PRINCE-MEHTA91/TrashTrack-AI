import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bell,
  CheckCircle2,
  XCircle,
  MapPin,
  Clock,
  Navigation,
  AlertTriangle,
  Zap,
  Trash2,
  ExternalLink,
  ChevronRight,
  Loader2,
  FileText,
  AlertCircle,
  Camera,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config/api.js";

const COMMON_REJECTION_REASONS = [
  "Too far away",
  "Currently handling other tasks",
  "Incorrect or inaccessible location",
  "Equipment or vehicle unavailable",
  "Other",
];

const SEVERITY_CONFIG = {
  HIGH: { label: "High Priority", cls: "bg-red-500/20 text-red-400 border-red-500/40" },
  MEDIUM: { label: "Medium Priority", cls: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
  LOW: { label: "Low Priority", cls: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
};

const WASTE_TYPE_CONFIG = {
  PLASTIC: { label: "Plastic Waste", cls: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30" },
  ORGANIC: { label: "Organic / Wet", cls: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" },
  HAZARDOUS: { label: "Hazardous / Bio", cls: "text-red-400 bg-red-500/15 border-red-500/30" },
  BULK: { label: "Bulk / Debris", cls: "text-purple-400 bg-purple-500/15 border-purple-500/30" },
  OTHER: { label: "General Waste", cls: "text-gray-300 bg-gray-500/15 border-gray-500/30" },
};

export default function TaskOfferPopup() {
  const { getToken, user } = useAuth();
  const [offers, setOffers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [otherExplanation, setOtherExplanation] = useState("");
  const [validationError, setValidationError] = useState("");
  const [notificationMsg, setNotificationMsg] = useState(null);

  // Fetch pending offers
  const fetchOffers = useCallback(async () => {
    const token = getToken();
    if (!token || user?.role !== "worker") return;

    try {
      const res = await fetch(`${API_URL}/worker/tasks/pending-offers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.offers)) {
        setOffers(data.offers);
        setCurrentIndex(0);
      }
    } catch (err) {
      // Quiet fail on polling network glitches
    }
  }, [getToken, user?.role]);

  // Polling every 12 seconds + window event listener
  useEffect(() => {
    fetchOffers();
    const interval = setInterval(fetchOffers, 12000);

    const handleOfferCheck = () => fetchOffers();
    window.addEventListener("task-offer-received", handleOfferCheck);
    window.addEventListener("task-status-updated", handleOfferCheck);

    return () => {
      clearInterval(interval);
      window.removeEventListener("task-offer-received", handleOfferCheck);
      window.removeEventListener("task-status-updated", handleOfferCheck);
    };
  }, [fetchOffers]);

  const currentOffer = offers[currentIndex] || null;

  // Accept Task handler
  const handleAcceptTask = async () => {
    if (!currentOffer || actionLoading) return;
    setActionLoading(true);
    setValidationError("");

    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/worker/tasks/${currentOffer.id}/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to accept task offer.");
      }

      setNotificationMsg({
        type: "success",
        text: `Task #${currentOffer.id.slice(0, 8)} accepted! Moved to your active pending tasks.`,
      });

      // Remove accepted offer from local queue
      setOffers((prev) => prev.filter((o) => o.id !== currentOffer.id));
      window.dispatchEvent(new Event("task-status-updated"));

      setTimeout(() => {
        setNotificationMsg(null);
      }, 4000);
    } catch (err) {
      setValidationError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Task submission handler
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!currentOffer || actionLoading) return;

    // Validate reason
    if (!selectedReason || !selectedReason.trim()) {
      setValidationError("Please select a valid reason for rejecting this assignment.");
      return;
    }

    if (selectedReason === "Other") {
      if (!otherExplanation || !otherExplanation.trim()) {
        setValidationError("A written explanation is required when selecting 'Other'.");
        return;
      }
    }

    setActionLoading(true);
    setValidationError("");

    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/worker/tasks/${currentOffer.id}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: selectedReason,
          explanation: selectedReason === "Other" ? otherExplanation.trim() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to reject task offer.");
      }

      setNotificationMsg({
        type: "info",
        text: `Task #${currentOffer.id.slice(0, 8)} rejected. Reassigning to next eligible worker...`,
      });

      // Reset reject modal and remove rejected offer
      setShowRejectModal(false);
      setSelectedReason("");
      setOtherExplanation("");
      setOffers((prev) => prev.filter((o) => o.id !== currentOffer.id));
      window.dispatchEvent(new Event("task-status-updated"));

      setTimeout(() => {
        setNotificationMsg(null);
      }, 4500);
    } catch (err) {
      setValidationError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (!currentOffer && !notificationMsg) return null;

  const severity = currentOffer ? SEVERITY_CONFIG[currentOffer.severity] || SEVERITY_CONFIG.MEDIUM : null;
  const waste = currentOffer ? WASTE_TYPE_CONFIG[currentOffer.waste_type] || WASTE_TYPE_CONFIG.OTHER : null;
  const shortId = currentOffer ? currentOffer.id.slice(0, 8) : "";
  const mapUrl = currentOffer?.latitude && currentOffer?.longitude
    ? `https://www.google.com/maps?q=${currentOffer.latitude},${currentOffer.longitude}`
    : null;

  return (
    <>
      {/* Toast Notification message */}
      {notificationMsg && (
        <div className="fixed top-5 right-5 z-50 animate-bounce">
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md border text-sm font-semibold ${
              notificationMsg.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200 shadow-emerald-500/20"
                : "bg-surface-card/95 border-amber-500/50 text-amber-200 shadow-amber-500/20"
            }`}
          >
            {notificationMsg.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <span>{notificationMsg.text}</span>
          </div>
        </div>
      )}

      {/* Primary Assignment Offer Modal */}
      {currentOffer && (
        <div
          id="worker-task-offer-popup"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
        >
          <div className="w-full max-w-lg bg-surface-card border-2 border-primary-500/40 rounded-3xl shadow-2xl shadow-primary-500/10 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-primary-600 via-primary-500 to-emerald-600 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center animate-pulse">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary-100">
                      Incoming Task Assignment
                    </span>
                    {offers.length > 1 && (
                      <span className="px-2 py-0.5 rounded-full bg-black/30 text-xs font-semibold">
                        {currentIndex + 1} of {offers.length}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold">New Waste Cleanup Offer</h3>
                </div>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping" />
            </div>

            {/* Error banner */}
            {validationError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Content body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Title & Short ID */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-xl font-display font-bold text-white leading-tight">
                    {currentOffer.title || "Waste Report"}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1 font-mono">
                    Complaint ID: <span className="text-gray-200 font-semibold">{currentOffer.id}</span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full border text-xs font-bold ${severity.cls}`}>
                    {severity.label}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${waste.cls}`}>
                    {waste.label}
                  </span>
                </div>
              </div>

              {/* Description */}
              {currentOffer.description && (
                <p className="text-sm text-gray-300 bg-surface-muted/60 p-3 rounded-xl border border-surface-border">
                  {currentOffer.description}
                </p>
              )}

              {/* Detail Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Location & Address */}
                <div className="p-3 rounded-xl bg-surface-muted/80 border border-surface-border space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-400 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-primary-400" />
                    <span>Location</span>
                  </div>
                  <p className="text-gray-200 font-semibold line-clamp-2">
                    {currentOffer.address || "Coordinates supplied"}
                  </p>
                  {mapUrl && (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300 font-medium mt-1 transition-colors"
                    >
                      <span>Open on Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Distance & Municipality */}
                <div className="p-3 rounded-xl bg-surface-muted/80 border border-surface-border space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-400 font-medium">
                    <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Distance from you</span>
                  </div>
                  <p className="text-gray-200 font-bold text-sm">
                    {currentOffer.assignment_distance_meters != null
                      ? currentOffer.assignment_distance_meters >= 1000
                        ? `${(currentOffer.assignment_distance_meters / 1000).toFixed(1)} km away`
                        : `${currentOffer.assignment_distance_meters} meters away`
                      : "Within authorized zone"}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {currentOffer.municipality_name || "Assigned Municipality"}
                    {currentOffer.ward_name ? ` • ${currentOffer.ward_name}` : ""}
                  </p>
                </div>

                {/* Assignment Time */}
                <div className="p-3 rounded-xl bg-surface-muted/80 border border-surface-border space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-400 font-medium">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Offered At</span>
                  </div>
                  <p className="text-gray-200 font-semibold">
                    {currentOffer.assigned_at
                      ? new Date(currentOffer.assigned_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })
                      : "Just now"}
                  </p>
                </div>

                {/* Mode */}
                <div className="p-3 rounded-xl bg-surface-muted/80 border border-surface-border space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-400 font-medium">
                    <Zap className="w-3.5 h-3.5 text-primary-400" />
                    <span>Dispatch Mode</span>
                  </div>
                  <p className="text-gray-200 font-semibold">
                    {currentOffer.assignment_mode === "AUTO_NEAREST"
                      ? "Automatic Nearest Worker"
                      : "Administrative Manual"}
                  </p>
                </div>
              </div>

              {/* Attached Image Evidence */}
              {currentOffer.image_url && (
                <div className="rounded-2xl overflow-hidden border border-surface-border relative max-h-40 bg-black/40">
                  <img
                    src={currentOffer.image_url}
                    alt="Garbage report"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-[11px] text-white flex items-center gap-1">
                    <Camera className="w-3 h-3" />
                    <span>Citizen Photo Evidence</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons footer */}
            <div className="p-6 bg-surface-card border-t border-surface-border flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                id="reject-task-offer-btn"
                type="button"
                onClick={() => {
                  setValidationError("");
                  setSelectedReason("");
                  setOtherExplanation("");
                  setShowRejectModal(true);
                }}
                disabled={actionLoading}
                className="w-full sm:w-1/2 py-3 px-4 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500 font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Task</span>
              </button>

              <button
                id="accept-task-offer-btn"
                type="button"
                onClick={handleAcceptTask}
                disabled={actionLoading}
                className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-primary-600 hover:from-emerald-500 hover:to-primary-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Accept Task</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Reject Task with Mandatory Reason */}
      {showRejectModal && currentOffer && (
        <div
          id="task-rejection-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
        >
          <div className="w-full max-w-md bg-surface-card border border-red-500/40 rounded-3xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-red-500/15 border-b border-red-500/30 px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reject Task Assignment</h3>
                <p className="text-xs text-red-300">A mandatory reason is required to reassign this task</p>
              </div>
            </div>

            <form onSubmit={handleRejectSubmit} className="p-6 space-y-4">
              {validationError && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center gap-2 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-300">
                  Reason for rejection <span className="text-red-400">*</span>
                </label>
                <div className="space-y-2">
                  {COMMON_REJECTION_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                        selectedReason === reason
                          ? "bg-red-500/10 border-red-500/50 text-white"
                          : "bg-surface-muted/60 border-surface-border text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="rejectionReason"
                        value={reason}
                        checked={selectedReason === reason}
                        onChange={(e) => {
                          setSelectedReason(e.target.value);
                          setValidationError("");
                        }}
                        className="text-red-500 focus:ring-red-400"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Conditional explanation textarea when "Other" is selected */}
              {selectedReason === "Other" && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="block text-xs font-semibold text-gray-300">
                    Please provide an explanation <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    id="rejection-explanation-input"
                    rows={3}
                    value={otherExplanation}
                    onChange={(e) => {
                      setOtherExplanation(e.target.value);
                      setValidationError("");
                    }}
                    placeholder="Provide specific details regarding why this task cannot be accepted..."
                    className="w-full bg-surface-muted border border-surface-border rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                  />
                </div>
              )}

              <p className="text-[11px] text-gray-400">
                Notice: Rejecting this task will exclude you from the immediate reassignment attempt and offer the task to the next eligible worker.
              </p>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectModal(false);
                    setValidationError("");
                  }}
                  disabled={actionLoading}
                  className="px-4 py-2.5 rounded-xl border border-surface-border text-gray-300 hover:bg-surface-muted text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>

                <button
                  id="confirm-reject-btn"
                  type="submit"
                  disabled={actionLoading || !selectedReason || (selectedReason === "Other" && !otherExplanation.trim())}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-40"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Rejecting…</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Confirm Rejection</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
