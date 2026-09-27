// LocationStatus – renders the correct UI for each geolocation state (prompt, denied, unavailable, timeout, error).
// Used in both Citizen and Worker dashboards. Pass accentClass for role-specific button color.
import { MapPin, AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";

export function LocationStatus({
  status,
  errorMessage,
  showPrompt,
  onAllow,
  onRetry,
  accentClass = "bg-citizen-500 hover:bg-citizen-400",
}) {
  // Invisible if idle or already saved silently
  if (status === "idle" || status === "saved") return null;

  // ── Auto-checking / saving — show inline spinner ──
  if (status === "checking" || status === "saving") {
    return (
      <div
        id="location-status-checking"
        className="flex items-center gap-2.5 text-sm text-gray-400 px-4 py-3 rounded-xl bg-surface-muted border border-surface-border"
      >
        <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
        <span>{status === "saving" ? "Saving your location…" : "Detecting your location…"}</span>
      </div>
    );
  }

  // ── Prompt — user hasn't granted yet ──
  if (showPrompt && status === "prompt") {
    return (
      <div
        id="location-status-prompt"
        className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/25"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Enable Location Access</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Share your location to improve zone detection and relevant updates.
            </p>
          </div>
        </div>
        <button
          id="location-allow-btn"
          onClick={onAllow}
          className={`${accentClass} text-white font-semibold text-sm px-5 py-2 rounded-xl transition-colors shrink-0`}
        >
          Allow Location
        </button>
      </div>
    );
  }

  // ── Denied — show friendly message, do NOT re-prompt ──
  if (status === "denied") {
    return (
      <div
        id="location-status-denied"
        className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Location Access Disabled</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {errorMessage ||
                "Location permission is disabled. Please enable it from your browser settings."}
            </p>
          </div>
        </div>
        <button
          id="location-try-again-btn"
          onClick={onRetry}
          className="text-amber-400 hover:text-amber-300 font-semibold text-sm px-5 py-2 rounded-xl border border-amber-500/30 hover:border-amber-400/50 transition-colors shrink-0"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ── Unavailable / Timeout / Error ──
  if (status === "unavailable" || status === "timeout" || status === "error") {
    return (
      <div
        id="location-status-error"
        className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-red-500/10 border border-red-500/25"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {status === "timeout" ? "Location Timed Out" : "Location Unavailable"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {errorMessage || "Unable to retrieve your location. Your dashboard still works normally."}
            </p>
          </div>
        </div>
        <button
          id="location-retry-btn"
          onClick={onRetry}
          className="text-red-400 hover:text-red-300 font-semibold text-sm px-5 py-2 rounded-xl border border-red-500/30 hover:border-red-400/50 transition-colors shrink-0"
        >
          Try Again
        </button>
      </div>
    );
  }

  return null;
}

/**
 * LocationSavedBadge – small inline badge to show when location was successfully saved.
 * Optionally auto-hides after a delay.
 */
export function LocationSavedBadge({ visible }) {
  if (!visible) return null;
  return (
    <div
      id="location-saved-badge"
      className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium"
    >
      <CheckCircle2 className="w-3.5 h-3.5" />
      Location saved
    </div>
  );
}
