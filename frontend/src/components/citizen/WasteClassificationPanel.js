/**
 * WasteClassificationPanel.js
 *
 * Shows an AI waste classification result after the citizen captures a photo.
 * This is an informational helper — it does NOT block or alter the existing
 * complaint submission flow in any way.
 *
 * Usage:
 *   <WasteClassificationPanel imageBase64={formData.image_url} token={token} />
 */

import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";
import { API_URL } from "../../config/api.js";

// ── Confidence colour thresholds ──────────────────────────────────────────────
function confidenceColor(pct) {
  if (pct >= 75) return "text-emerald-400";
  if (pct >= 50) return "text-amber-400";
  return "text-red-400";
}

function confidenceBg(pct) {
  if (pct >= 75) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-red-500";
}

// ── Main component ────────────────────────────────────────────────────────────
export default function WasteClassificationPanel({ imageBase64, token }) {
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [expanded, setExpanded] = useState(false);

  // Track which image we last classified so we don't re-classify on unrelated renders
  const lastClassifiedRef = useRef(null);

  useEffect(() => {
    // Only classify when there is a new image
    if (!imageBase64 || imageBase64 === lastClassifiedRef.current) return;

    lastClassifiedRef.current = imageBase64;
    setStatus("loading");
    setResult(null);
    setErrorMsg("");
    setExpanded(false);

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API_URL}/classify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ image: imageBase64 }),
          signal: AbortSignal.timeout(35_000),
        });

        if (cancelled) return;

        const data = await res.json();

        if (res.ok && data.success) {
          setResult(data);
          setStatus("done");
        } else {
          setErrorMsg(data.message || "Classification failed. Please try again.");
          setStatus("error");
        }
      } catch (err) {
        if (cancelled) return;
        if (err.name === "TimeoutError" || err.name === "AbortError") {
          setErrorMsg("Classification timed out. The AI service may be starting up.");
        } else {
          setErrorMsg("Could not reach the classification service.");
        }
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [imageBase64, token]);

  // Don't render anything until there's something to show
  if (status === "idle") return null;

  return (
    <div className="rounded-xl border border-surface-border bg-surface-muted overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-citizen-400 shrink-0" />
          <span className="text-sm font-semibold text-white">AI Waste Classification</span>
        </div>

        {/* Loading spinner */}
        {status === "loading" && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Analysing…</span>
          </div>
        )}

        {/* Expand / collapse when done */}
        {status === "done" && result && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="p-1 rounded-lg text-gray-400 hover:text-white transition-colors"
            aria-label={expanded ? "Collapse predictions" : "Expand predictions"}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Error state */}
      {status === "error" && (
        <div className="px-4 pb-4 flex items-start gap-2 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Loading skeleton */}
      {status === "loading" && (
        <div className="px-4 pb-4 space-y-2 animate-pulse">
          <div className="h-3 bg-surface-border rounded w-2/3" />
          <div className="h-2 bg-surface-border rounded w-1/2" />
        </div>
      )}

      {/* Result */}
      {status === "done" && result && (
        <div className="px-4 pb-4 space-y-3">
          {/* Top-1 result */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-bold text-white truncate">{result.waste_type}</span>
            </div>
            <span className={`text-sm font-bold tabular-nums shrink-0 ${confidenceColor(result.confidence)}`}>
              {result.confidence.toFixed(1)}%
            </span>
          </div>

          {/* Confidence bar */}
          <div className="w-full h-1.5 rounded-full bg-surface-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${confidenceBg(result.confidence)}`}
              style={{ width: `${Math.min(result.confidence, 100)}%` }}
            />
          </div>

          {/* Top-3 breakdown (expandable) */}
          {expanded && result.top_predictions?.length > 1 && (
            <div className="pt-1 space-y-2">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide font-semibold">
                Top predictions
              </p>
              {result.top_predictions.map((pred, idx) => (
                <div key={pred.class} className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-500 w-4 shrink-0">{idx + 1}.</span>
                  <span className="text-xs text-gray-300 flex-1 truncate">{pred.class}</span>
                  <span className={`text-xs font-semibold tabular-nums shrink-0 ${confidenceColor(pred.confidence)}`}>
                    {pred.confidence.toFixed(1)}%
                  </span>
                  {/* Mini bar */}
                  <div className="w-16 h-1 rounded-full bg-surface-border overflow-hidden shrink-0">
                    <div
                      className={`h-full rounded-full ${confidenceBg(pred.confidence)}`}
                      style={{ width: `${Math.min(pred.confidence, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-[10px] text-gray-500 leading-relaxed">
            AI-assisted suggestion only. You can override the waste type in the form below.
          </p>
        </div>
      )}
    </div>
  );
}

