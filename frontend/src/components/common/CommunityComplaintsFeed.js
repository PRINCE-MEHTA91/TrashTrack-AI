import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  FileText,
  AlertCircle,
  Loader2,
  MapPin,
  Calendar,
  RefreshCw,
  Users,
  Search,
  UserCheck,
  ExternalLink,
  Navigation,
  AlertTriangle,
  X,
  Building2,
  Layers,
  Eye,
  Plus,
  Send,
  ShieldCheck,
  RotateCcw,
  Image as ImageIcon,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config/api.js";
import { useCommunityRealtime } from "../../hooks/useCommunityRealtime";

const TABS = [
  { id: "all",         label: "All",          icon: MessageSquare, countKey: "all" },
  { id: "unassigned",  label: "Unassigned",   icon: Users,         countKey: "unassigned" },
  { id: "pending",     label: "Assigned",     icon: Clock,         countKey: "pending" },
  { id: "in_progress", label: "In Progress",  icon: AlertCircle,   countKey: "in_progress" },
  { id: "resolved",    label: "Resolved",     icon: CheckCircle2,  countKey: "resolved" },
];

const STATUS_CONFIG = {
  SUBMITTED:   { label: "Submitted",   cls: "bg-gray-500/15 text-gray-300 border-gray-500/30",         icon: FileText },
  PENDING:     { label: "Pending",     cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",       icon: Clock },
  ASSIGNED:    { label: "Assigned",    cls: "bg-blue-500/15 text-blue-400 border-blue-500/30",          icon: UserCheck },
  IN_PROGRESS: { label: "In Progress", cls: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",    icon: AlertCircle },
  RESOLVED:    { label: "Resolved",    cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  COMPLETED:   { label: "Completed",   cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  CLOSED:      { label: "Closed",      cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  VERIFIED:    { label: "Verified",    cls: "bg-teal-500/15 text-teal-300 border-teal-500/30",          icon: ShieldCheck },
};

const SEVERITY_CONFIG = {
  LOW:    { cls: "bg-gray-500/15 text-gray-400 border-gray-500/30",   label: "Low" },
  MEDIUM: { cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", label: "Medium" },
  HIGH:   { cls: "bg-red-500/15 text-red-400 border-red-500/30",       label: "High" },
};

const WASTE_LABELS = {
  ORGANIC: "Organic",
  PLASTIC: "Plastic",
  HAZARDOUS: "Hazardous",
  BULK: "Bulk / Debris",
  OTHER: "Other",
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, cls: "bg-gray-500/15 text-gray-400 border-gray-500/30", icon: FileText };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function SeverityBadge({ severity }) {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.MEDIUM;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// Complaint detail modal (timeline, evidence photos, comments, actions)
function ComplaintDetailModal({ complaintId, role, onClose, onRefresh }) {
  const { getToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Comment & Action state
  const [commentText, setCommentText] = useState("");
  const [isIncompleteReport, setIsIncompleteReport] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Admin action forms
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState("Resolution inspected and verified.");
  const [showReworkModal, setShowReworkModal] = useState(false);
  const [reworkNotes, setReworkNotes] = useState("");

  // Photo viewer tab
  const [activePhotoTab, setActivePhotoTab] = useState("before");

  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/complaints/${complaintId}/details`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.message || "Failed to load complaint details.");
      }
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [complaintId, getToken]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Submit comment / report incomplete
  async function handleSubmitComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setActionLoading(true);
      const token = getToken();
      const payload = {
        comment: commentText.trim(),
        comment_type: isIncompleteReport ? "INCOMPLETE_REPORT" : "COMMENT",
      };

      const res = await fetch(`${API_URL}/complaints/${complaintId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok) {
        setCommentText("");
        setIsIncompleteReport(false);
        setActionMessage({ type: "success", text: json.message || "Comment posted." });
        fetchDetails();
        if (onRefresh) onRefresh();
      } else {
        setActionMessage({ type: "error", text: json.message || "Failed to post comment." });
      }
    } catch {
      setActionMessage({ type: "error", text: "Network error occurred." });
    } finally {
      setActionLoading(false);
    }
  }

  // Admin: Verify work
  async function handleVerifyWork() {
    try {
      setActionLoading(true);
      const token = getToken();
      const res = await fetch(`${API_URL}/complaints/${complaintId}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: verifyNotes }),
      });
      const json = await res.json();
      if (res.ok) {
        setShowVerifyModal(false);
        setActionMessage({ type: "success", text: "Complaint verified successfully!" });
        fetchDetails();
        if (onRefresh) onRefresh();
      } else {
        setActionMessage({ type: "error", text: json.message || "Verification failed." });
      }
    } catch {
      setActionMessage({ type: "error", text: "Network error." });
    } finally {
      setActionLoading(false);
    }
  }

  // Admin: Request rework
  async function handleRequestRework() {
    if (!reworkNotes.trim()) return;
    try {
      setActionLoading(true);
      const token = getToken();
      const res = await fetch(`${API_URL}/complaints/${complaintId}/request-action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: reworkNotes, targetStatus: "IN_PROGRESS" }),
      });
      const json = await res.json();
      if (res.ok) {
        setShowReworkModal(false);
        setReworkNotes("");
        setActionMessage({ type: "success", text: "Complaint reopened for worker rework." });
        fetchDetails();
        if (onRefresh) onRefresh();
      } else {
        setActionMessage({ type: "error", text: json.message || "Failed to update." });
      }
    } catch {
      setActionMessage({ type: "error", text: "Network error." });
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <div className="bg-surface-card border border-surface-border rounded-2xl p-8 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          <p className="text-gray-300 text-sm">Loading complaint details…</p>
        </div>
      </div>
    );
  }

  if (error || !data?.complaint) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 max-w-md w-full">
          <p className="text-red-400 font-semibold mb-2">Error</p>
          <p className="text-gray-300 text-sm mb-4">{error || "Complaint not found."}</p>
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-surface-muted text-white text-sm">
            Close
          </button>
        </div>
      </div>
    );
  }

  const { complaint, comments = [], timeline = [], assignment_logs = [] } = data;
  const mapsUrl = complaint.latitude && complaint.longitude
    ? `https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div
        className="bg-surface-card border border-surface-border rounded-2xl shadow-card w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-surface-border gap-3 bg-surface-card/90 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <StatusBadge status={complaint.status} />
              <SeverityBadge severity={complaint.severity} />
              {complaint.is_my_task && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-500/20 text-primary-400 border border-primary-500/30">
                  <UserCheck className="w-2.5 h-2.5" /> Assigned to You
                </span>
              )}
              {complaint.is_my_complaint && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-citizen-500/20 text-citizen-400 border border-citizen-500/30">
                  My Complaint
                </span>
              )}
            </div>
            <h2 className="text-white font-bold text-lg leading-tight truncate">{complaint.title}</h2>
            <p className="text-gray-500 text-xs font-mono mt-0.5">ID: #{complaint.id?.slice(0, 8)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-muted transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {actionMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-medium border flex items-center justify-between ${
                actionMessage.type === "success"
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                  : "bg-red-500/10 text-red-300 border-red-500/25"
              }`}
            >
              <span>{actionMessage.text}</span>
              <button onClick={() => setActionMessage(null)} className="text-gray-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Photo Section: Before / After Comparison */}
          {(complaint.image_url || complaint.resolution_image_url) && (
            <div className="bg-surface-muted/60 border border-surface-border rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-primary-400" />
                  Site Photos
                </p>
                <div className="flex items-center gap-1 bg-surface-card rounded-lg p-0.5 border border-surface-border text-xs">
                  {complaint.image_url && (
                    <button
                      onClick={() => setActivePhotoTab("before")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                        activePhotoTab === "before"
                          ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Before Photo
                    </button>
                  )}
                  {complaint.resolution_image_url && (
                    <button
                      onClick={() => setActivePhotoTab("after")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                        activePhotoTab === "after"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Completed / After
                    </button>
                  )}
                </div>
              </div>
              <div className="rounded-xl overflow-hidden border border-surface-border bg-black/40 flex items-center justify-center max-h-72">
                {activePhotoTab === "before" && complaint.image_url ? (
                  <img
                    src={complaint.image_url}
                    alt="Before Cleanup"
                    className="w-full max-h-72 object-contain"
                  />
                ) : activePhotoTab === "after" && complaint.resolution_image_url ? (
                  <img
                    src={complaint.resolution_image_url}
                    alt="Resolution Evidence"
                    className="w-full max-h-72 object-contain"
                  />
                ) : (
                  <div className="py-10 text-gray-500 text-xs">Photo not available</div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {complaint.description && (
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                Issue Description
              </p>
              <p className="text-sm text-gray-200 leading-relaxed bg-surface-muted/40 p-3 rounded-xl border border-surface-border">
                {complaint.description}
              </p>
            </div>
          )}

          {/* Key Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="bg-surface-muted/70 rounded-xl p-3 border border-surface-border">
              <p className="text-gray-400 font-medium text-[10px] uppercase tracking-wider">Category</p>
              <p className="text-white font-semibold mt-0.5">
                {WASTE_LABELS[complaint.waste_type] || complaint.waste_type}
              </p>
            </div>
            <div className="bg-surface-muted/70 rounded-xl p-3 border border-surface-border">
              <p className="text-gray-400 font-medium text-[10px] uppercase tracking-wider">Priority</p>
              <p className="text-white font-semibold mt-0.5">{complaint.severity}</p>
            </div>
            <div className="bg-surface-muted/70 rounded-xl p-3 border border-surface-border">
              <p className="text-gray-400 font-medium text-[10px] uppercase tracking-wider">Submitted</p>
              <p className="text-white font-semibold mt-0.5">{fmtDateTime(complaint.created_at)}</p>
            </div>
            <div className="bg-surface-muted/70 rounded-xl p-3 border border-surface-border col-span-2 sm:col-span-3">
              <p className="text-gray-400 font-medium text-[10px] uppercase tracking-wider">Zone Location</p>
              <p className="text-white font-semibold mt-0.5">{complaint.address || "Area location not provided"}</p>
              <p className="text-primary-300 text-xs mt-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>
                  {complaint.ward_name ? `Ward: ${complaint.ward_name}` : "General Ward"}
                  {complaint.ward_number ? ` (#${complaint.ward_number})` : ""}
                  {complaint.municipality_name ? ` · ${complaint.municipality_name}` : ""}
                </span>
              </p>
            </div>
          </div>

          {/* Assigned Worker / Assignment Information */}
          <div className="p-3.5 rounded-xl bg-surface-muted/80 border border-surface-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4 text-primary-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                  Worker Assignment
                </p>
                <p className="text-sm text-white font-semibold truncate">
                  {complaint.is_my_task
                    ? "Assigned to You"
                    : complaint.assigned_worker_name || "Awaiting Municipal Worker Assignment"}
                </p>
                {complaint.assigned_at && (
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Assigned on {fmtDateTime(complaint.assigned_at)}
                  </p>
                )}
              </div>
            </div>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-all text-xs font-semibold flex items-center gap-1.5 shrink-0"
              >
                <Navigation className="w-3.5 h-3.5" /> Map
              </a>
            )}
          </div>

          {/* Resolution & Verification Evidence */}
          {(complaint.resolution_note || complaint.verification_notes) && (
            <div className="space-y-2">
              {complaint.resolution_note && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                  <p className="font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Worker Resolution Report
                  </p>
                  <p className="text-emerald-200 whitespace-pre-line leading-relaxed">
                    {complaint.resolution_note}
                  </p>
                </div>
              )}
              {complaint.verification_notes && (
                <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs">
                  <p className="font-semibold text-teal-400 mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Administrative Verification
                  </p>
                  <p className="text-teal-200 whitespace-pre-line leading-relaxed">
                    {complaint.verification_notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Progress Timeline */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Progress Timeline & Status History
            </h3>
            <div className="space-y-3 relative pl-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-border">
              {timeline.map((step, idx) => (
                <div key={idx} className="relative flex items-start gap-3">
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-surface-card border-2 border-primary-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary-400" />
                  </div>
                  <div className="bg-surface-muted/60 border border-surface-border rounded-xl p-3 flex-1 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-white">{step.title}</p>
                      <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                        {fmtDateTime(step.timestamp)}
                      </span>
                    </div>
                    {step.description && (
                      <p className="text-gray-300 mt-1 leading-relaxed">{step.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Role-Specific Admin Action Bar */}
          {role === "admin" && (
            <div className="p-4 rounded-xl bg-primary-500/10 border border-primary-500/25 space-y-3">
              <p className="text-xs font-bold text-primary-300 uppercase tracking-wider">
                Administrator Actions
              </p>
              <div className="flex flex-wrap gap-2">
                {complaint.status !== "VERIFIED" &&
                  ["RESOLVED", "COMPLETED"].includes(complaint.status) && (
                    <button
                      onClick={() => setShowVerifyModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 hover:bg-teal-500/30 transition-all text-xs font-semibold flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Verify Cleanup
                    </button>
                  )}
                {["RESOLVED", "COMPLETED", "VERIFIED"].includes(complaint.status) && (
                  <button
                    onClick={() => setShowReworkModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition-all text-xs font-semibold flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Request Rework
                  </button>
                )}
                <Link
                  to={`/admin/complaints?tab=assignment&search=${complaint.id?.slice(0, 8)}`}
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl bg-primary-500/20 border border-primary-500/40 text-primary-300 hover:bg-primary-500/30 transition-all text-xs font-semibold flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" /> Manage Assignment
                </Link>
              </div>

              {/* Verify Form Modal inline */}
              {showVerifyModal && (
                <div className="mt-2 p-3 rounded-lg bg-surface-card border border-teal-500/30 space-y-2">
                  <p className="text-xs font-semibold text-teal-300">Verify Resolution</p>
                  <textarea
                    rows={2}
                    value={verifyNotes}
                    onChange={(e) => setVerifyNotes(e.target.value)}
                    placeholder="Enter inspection & verification notes…"
                    className="w-full p-2 bg-surface-muted border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowVerifyModal(false)}
                      className="px-3 py-1 rounded-lg text-xs text-gray-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleVerifyWork}
                      disabled={actionLoading}
                      className="px-3 py-1 rounded-lg bg-teal-500 text-white font-semibold text-xs hover:bg-teal-400 disabled:opacity-50"
                    >
                      {actionLoading ? "Verifying…" : "Approve & Mark Verified"}
                    </button>
                  </div>
                </div>
              )}

              {/* Rework Form Modal inline */}
              {showReworkModal && (
                <div className="mt-2 p-3 rounded-lg bg-surface-card border border-amber-500/30 space-y-2">
                  <p className="text-xs font-semibold text-amber-300">Request Worker Rework</p>
                  <textarea
                    rows={2}
                    value={reworkNotes}
                    onChange={(e) => setReworkNotes(e.target.value)}
                    placeholder="Describe what needs to be redone or corrected…"
                    className="w-full p-2 bg-surface-muted border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowReworkModal(false)}
                      className="px-3 py-1 rounded-lg text-xs text-gray-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRequestRework}
                      disabled={actionLoading || !reworkNotes.trim()}
                      className="px-3 py-1 rounded-lg bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 disabled:opacity-50"
                    >
                      {actionLoading ? "Updating…" : "Reopen for Rework"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Worker action link */}
          {role === "worker" && complaint.is_my_task && (
            <div className="p-4 rounded-xl bg-primary-500/10 border border-primary-500/25 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-primary-300">Assigned Task Action</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Update progress or mark completed from your Tasks workflow.
                </p>
              </div>
              <Link
                to="/worker/tasks"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-primary-500 hover:bg-primary-400 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Go to Tasks
              </Link>
            </div>
          )}

          {/* Community Discussion & Comments Section */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
              Community Discussion & Activity ({comments.length})
            </h3>
            <div className="space-y-2 mb-4">
              {comments.length === 0 ? (
                <p className="text-xs text-gray-500 italic p-3 bg-surface-muted/40 rounded-xl border border-surface-border">
                  No comments or updates yet. Authorized community members may comment below.
                </p>
              ) : (
                comments.map((cm) => (
                  <div
                    key={cm.id}
                    className={`p-3 rounded-xl border text-xs ${
                      cm.comment_type === "INCOMPLETE_REPORT"
                        ? "bg-red-500/10 border-red-500/25"
                        : cm.comment_type === "VERIFICATION"
                        ? "bg-teal-500/10 border-teal-500/25"
                        : cm.is_my_comment
                        ? "bg-primary-500/10 border-primary-500/25 ml-4"
                        : "bg-surface-muted/70 border-surface-border"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white">{cm.author_name}</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase bg-surface-card border border-surface-border text-gray-400">
                          {cm.author_role}
                        </span>
                        {cm.comment_type === "INCOMPLETE_REPORT" && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                            Incomplete Cleanup Flag
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {fmtDateTime(cm.created_at)}
                      </span>
                    </div>
                    <p className="text-gray-200 leading-relaxed whitespace-pre-line">{cm.comment}</p>
                  </div>
                ))
              )}
            </div>

            {/* Comment Submission Form */}
            <form onSubmit={handleSubmitComment} className="space-y-2.5">
              <div className="relative">
                <textarea
                  rows={2}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={
                    isIncompleteReport
                      ? "Explain what remains uncleaned or incomplete at this site…"
                      : "Add a comment, note, or progress feedback…"
                  }
                  className="w-full p-3 bg-surface-muted border border-surface-border rounded-xl text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                {role === "citizen" && ["RESOLVED", "COMPLETED", "VERIFIED"].includes(complaint.status) ? (
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-amber-300">
                    <input
                      type="checkbox"
                      checked={isIncompleteReport}
                      onChange={(e) => setIsIncompleteReport(e.target.checked)}
                      className="rounded border-surface-border text-amber-500 focus:ring-0"
                    />
                    <span>Report that cleanup is still incomplete</span>
                  </label>
                ) : (
                  <div />
                )}

                <button
                  type="submit"
                  disabled={actionLoading || !commentText.trim()}
                  className="ml-auto px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-400 disabled:opacity-50 text-white font-semibold text-xs transition-all flex items-center gap-1.5"
                >
                  {actionLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {isIncompleteReport ? "Report Incomplete" : "Post Comment"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-surface-border bg-surface-card/90 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-muted hover:bg-surface-border text-gray-300 hover:text-white text-xs font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Complaint card component
function ComplaintCard({ complaint, role, onView }) {
  const mapsUrl = complaint.latitude && complaint.longitude
    ? `https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`
    : null;

  return (
    <div
      id={`community-complaint-${complaint.id?.slice(0, 8)}`}
      className={`group bg-surface-card border rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:border-primary-500/40 hover:shadow-glow-sm ${
        complaint.is_my_task
          ? "border-primary-500/40 ring-1 ring-primary-500/20 bg-primary-500/[0.02]"
          : complaint.status === "VERIFIED"
          ? "border-teal-500/30"
          : "border-surface-border"
      }`}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <StatusBadge status={complaint.status} />
            <SeverityBadge severity={complaint.severity} />
            {complaint.is_my_task && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-500/20 text-primary-400 border border-primary-500/30">
                <UserCheck className="w-2.5 h-2.5" /> Assigned to You
              </span>
            )}
            {complaint.is_my_complaint && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-citizen-500/20 text-citizen-400 border border-citizen-500/30">
                My Complaint
              </span>
            )}
          </div>
          <h3 className="text-white font-bold text-base leading-snug truncate group-hover:text-primary-300 transition-colors">
            {complaint.title}
          </h3>
          <p className="text-gray-500 text-[10px] font-mono mt-0.5">#{complaint.id?.slice(0, 8)}</p>
        </div>

        {/* Thumbnail Photos (Before or After) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {complaint.image_url && (
            <div
              className="w-14 h-14 rounded-xl overflow-hidden border border-surface-border shrink-0 cursor-pointer hover:opacity-90"
              onClick={() => onView(complaint)}
              title="Click to view full photo"
            >
              <img
                src={complaint.image_url}
                alt="Complaint"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {complaint.resolution_image_url && (
            <div
              className="w-14 h-14 rounded-xl overflow-hidden border border-emerald-500/30 shrink-0 cursor-pointer relative hover:opacity-90"
              onClick={() => onView(complaint)}
              title="Completion evidence photo"
            >
              <img
                src={complaint.resolution_image_url}
                alt="Resolved"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-white text-[8px] font-bold text-center py-0.5">
                Solved
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Description preview */}
      {complaint.description && (
        <p className="text-gray-400 text-xs leading-relaxed mb-3 line-clamp-2">
          {complaint.description}
        </p>
      )}

      {/* Location & Metadata Badges */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-400 mb-3.5">
        {complaint.address && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <span className="truncate max-w-[200px] text-gray-300">{complaint.address}</span>
          </span>
        )}
        {complaint.ward_name && (
          <span className="flex items-center gap-1 text-primary-300">
            <Layers className="w-3.5 h-3.5" />
            {complaint.ward_name}
            {complaint.ward_number ? ` (#${complaint.ward_number})` : ""}
          </span>
        )}
        <span className="flex items-center gap-1 text-gray-500">
          <Calendar className="w-3.5 h-3.5" />
          {fmtDate(complaint.created_at)}
        </span>
        <span className="text-gray-400">
          Category: <span className="text-gray-200">{WASTE_LABELS[complaint.waste_type] || complaint.waste_type}</span>
        </span>
      </div>

      {/* Assigned worker info */}
      <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-surface-muted/60 border border-surface-border mb-3.5">
        <div className="flex items-center gap-2 truncate">
          <UserCheck className="w-3.5 h-3.5 text-primary-400 shrink-0" />
          <span className="text-gray-400 text-xs">
            Assigned to:{" "}
            <span className="text-gray-200 font-semibold">
              {complaint.is_my_task
                ? "You"
                : complaint.assigned_worker_name || "Awaiting assignment"}
            </span>
          </span>
        </div>
        {complaint.comments_count > 0 && (
          <span className="text-gray-400 text-[11px] font-medium flex items-center gap-1">
            <MessageSquare className="w-3 h-3 text-gray-500" />
            {complaint.comments_count}
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onView(complaint)}
          id={`community-complaint-view-${complaint.id?.slice(0, 8)}`}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-muted hover:bg-surface-border text-gray-200 hover:text-white transition-all text-xs font-semibold border border-surface-border"
        >
          <Eye className="w-3.5 h-3.5" /> View Details & Timeline
        </button>

        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            id={`community-complaint-map-${complaint.id?.slice(0, 8)}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all text-xs font-medium border border-blue-500/20"
          >
            <Navigation className="w-3.5 h-3.5" /> Map
          </a>
        )}

        {role === "worker" && complaint.is_my_task && (
          <Link
            to="/worker/tasks"
            id={`community-complaint-task-${complaint.id?.slice(0, 8)}`}
            className="ml-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary-500/15 hover:bg-primary-500/25 text-primary-400 transition-all text-xs font-semibold border border-primary-500/30"
          >
            <ExternalLink className="w-3.5 h-3.5" /> My Task
          </Link>
        )}

        {role === "admin" && (
          <Link
            to={`/admin/complaints?tab=assignment&search=${complaint.id?.slice(0, 8)}`}
            id={`community-complaint-admin-manage-${complaint.id?.slice(0, 8)}`}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-500/15 hover:bg-primary-500/25 text-primary-300 transition-all text-xs font-semibold border border-primary-500/30"
          >
            <UserCheck className="w-3.5 h-3.5" /> Manage
          </Link>
        )}
      </div>
    </div>
  );
}

// Community complaints feed
export default function CommunityComplaintsFeed({ role = "citizen", initialTab = "all" }) {
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [complaints, setComplaints] = useState([]);
  const [counts, setCounts] = useState({ all: 0, unassigned: 0, pending: 0, in_progress: 0, resolved: 0 });
  const [zone, setZone] = useState(null);
  const [wards, setWards] = useState([]);
  const [availableMunis, setAvailableMunis] = useState([]);
  const [selectedMuniId, setSelectedMuniId] = useState("");
  const [selectedWardId, setSelectedWardId] = useState("");

  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("");
  const [selectedWasteType, setSelectedWasteType] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 25 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeComplaintModalId, setActiveComplaintModalId] = useState(null);

  // Fetch Complaints from Backend
  const fetchComplaints = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      if (!token) return;

      const params = new URLSearchParams();
      if (activeTab && activeTab !== "all") params.set("tab", activeTab);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (selectedSeverity) params.set("severity", selectedSeverity);
      if (selectedWasteType) params.set("waste_type", selectedWasteType);
      if (selectedWardId) params.set("ward_id", selectedWardId);
      if (selectedMuniId) params.set("municipality_id", selectedMuniId);
      params.set("page", String(page));
      params.set("limit", "25");

      const res = await fetch(`${API_URL}/complaints/community?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints || []);
        if (data.counts) setCounts(data.counts);
        if (data.pagination) setPagination(data.pagination);
        if (data.zone) setZone(data.zone);
        if (data.wards) setWards(data.wards);
        if (data.available_municipalities) setAvailableMunis(data.available_municipalities);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || "Failed to load community complaints feed.");
      }
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [getToken, activeTab, searchQuery, selectedSeverity, selectedWasteType, selectedWardId, selectedMuniId, page]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Hook real-time SSE updates
  useCommunityRealtime({
    municipalityId: zone?.id || selectedMuniId || null,
    onUpdate: () => {
      fetchComplaints();
    },
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 pb-28 lg:pb-8">
      {/* Feed Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1
              id="community-complaints-title"
              className="font-display font-bold text-2xl text-white flex items-center gap-2.5"
            >
              <MessageSquare className="w-6 h-6 text-primary-400" />
              Community Complaints
            </h1>
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              title="Real-time Zone Synchronization Active"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Feed
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Shared zone-wide complaints raised by citizens in{" "}
            {zone?.name ? (
              <span className="font-semibold text-gray-200">{zone.name}</span>
            ) : (
              "your authorized area"
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start">
          {role === "citizen" && (
            <button
              id="citizen-new-complaint-btn"
              onClick={() => navigate("/citizen/report")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-citizen-500 hover:bg-citizen-400 text-white font-semibold text-sm transition-all shadow-glow-sm"
            >
              <Plus className="w-4 h-4" /> Report Waste
            </button>
          )}

          <button
            id="community-feed-refresh-btn"
            onClick={fetchComplaints}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-muted border border-surface-border hover:border-primary-500/40 text-gray-300 hover:text-white transition-all text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Zone Scope Information Pill */}
      {zone && (
        <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-primary-400" />
            <div className="text-xs">
              <span className="text-gray-400">Authorized Municipality: </span>
              <span className="text-white font-bold">{zone.name}</span>
              {zone.district && <span className="text-gray-400"> ({zone.district})</span>}
            </div>
          </div>

          {/* Citizen can optionally switch municipality if allowed */}
          {role === "citizen" && availableMunis.length > 1 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400">Change Zone:</span>
              <select
                id="citizen-zone-selector"
                value={selectedMuniId || zone.id}
                onChange={(e) => {
                  setSelectedMuniId(e.target.value);
                  setPage(1);
                }}
                className="bg-surface-muted border border-surface-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-primary-500"
              >
                {availableMunis.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.district ? `(${m.district})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div
        id="community-complaints-tabs"
        className="flex items-center gap-1.5 p-1 bg-surface-card border border-surface-border rounded-xl overflow-x-auto"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count = counts[tab.countKey] || 0;
          return (
            <button
              key={tab.id}
              id={`community-complaints-tab-${tab.id}`}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                  : "text-gray-400 hover:text-gray-200 border border-transparent"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive
                    ? "bg-primary-500/30 text-primary-300"
                    : tab.id === "unassigned" && count > 0
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-surface-muted text-gray-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        {/* Search */}
        <div className="sm:col-span-5 relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="community-complaints-search"
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by title, area, description…"
            className="w-full pl-9 pr-4 py-2 bg-surface-card border border-surface-border rounded-xl text-xs md:text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-500/50"
          />
        </div>

        {/* Ward Filter */}
        {wards.length > 0 && (
          <div className="sm:col-span-3">
            <select
              id="community-complaints-ward-filter"
              value={selectedWardId}
              onChange={(e) => {
                setSelectedWardId(e.target.value);
                setPage(1);
              }}
              className="w-full bg-surface-card border border-surface-border rounded-xl px-3 py-2 text-xs md:text-sm text-gray-300 focus:outline-none focus:border-primary-500/50"
            >
              <option value="">All Wards ({wards.length})</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.ward_number ? `(#${w.ward_number})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Priority Filter */}
        <div className={wards.length > 0 ? "sm:col-span-2" : "sm:col-span-3"}>
          <select
            id="community-complaints-severity-filter"
            value={selectedSeverity}
            onChange={(e) => {
              setSelectedSeverity(e.target.value);
              setPage(1);
            }}
            className="w-full bg-surface-card border border-surface-border rounded-xl px-3 py-2 text-xs md:text-sm text-gray-300 focus:outline-none focus:border-primary-500/50"
          >
            <option value="">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>
        </div>

        {/* Waste Type Filter */}
        <div className={wards.length > 0 ? "sm:col-span-2" : "sm:col-span-4"}>
          <select
            id="community-complaints-waste-filter"
            value={selectedWasteType}
            onChange={(e) => {
              setSelectedWasteType(e.target.value);
              setPage(1);
            }}
            className="w-full bg-surface-card border border-surface-border rounded-xl px-3 py-2 text-xs md:text-sm text-gray-300 focus:outline-none focus:border-primary-500/50"
          >
            <option value="">All Categories</option>
            <option value="PLASTIC">Plastic Waste</option>
            <option value="ORGANIC">Organic / Bio</option>
            <option value="HAZARDOUS">Hazardous</option>
            <option value="BULK">Bulk / Construction</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* Content State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          <p className="text-gray-400 text-sm">Loading community complaints feed…</p>
        </div>
      ) : error ? (
        <div className="p-5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-300 font-medium">{error}</p>
          </div>
          <button
            onClick={fetchComplaints}
            className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-300 text-xs font-semibold hover:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      ) : complaints.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center bg-surface-card border border-surface-border rounded-2xl p-8">
          <div className="w-14 h-14 rounded-2xl bg-surface-muted border border-surface-border flex items-center justify-center">
            <MessageSquare className="w-7 h-7 text-gray-500" />
          </div>
          <p className="text-white font-bold text-base">No community complaints found</p>
          <p className="text-gray-400 text-sm max-w-sm">
            {activeTab !== "all"
              ? "No complaints match this filter in your zone. Try switching tabs."
              : zone?.name
              ? `No complaints recorded in ${zone.name} yet. When citizens report waste, it will appear here.`
              : "No complaints found. Please ensure location is enabled or select your municipality."}
          </p>
          {role === "citizen" && (
            <button
              onClick={() => navigate("/citizen/report")}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-citizen-500 hover:bg-citizen-400 text-white font-semibold text-xs transition-all shadow-glow-sm"
            >
              <Plus className="w-4 h-4" /> Report Waste in this Zone
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
            <span>
              Showing {complaints.length} of {pagination.total} community complaint
              {pagination.total !== 1 ? "s" : ""}
            </span>
            {pagination.pages > 1 && (
              <span>
                Page {pagination.page} / {pagination.pages}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {complaints.map((c) => (
              <ComplaintCard
                key={c.id}
                complaint={c}
                role={role}
                onView={() => setActiveComplaintModalId(c.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3.5 py-1.5 rounded-lg border border-surface-border text-gray-400 hover:text-white hover:border-primary-500/40 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const half = Math.floor(Math.min(5, pagination.pages) / 2);
                const start = Math.max(
                  1,
                  Math.min(page - half, pagination.pages - Math.min(5, pagination.pages) + 1)
                );
                const p = start + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                      p === page
                        ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                        : "text-gray-400 hover:text-white hover:bg-surface-muted border border-transparent"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
                className="px-3.5 py-1.5 rounded-lg border border-surface-border text-gray-400 hover:text-white hover:border-primary-500/40 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {activeComplaintModalId && (
        <ComplaintDetailModal
          complaintId={activeComplaintModalId}
          role={role}
          onClose={() => setActiveComplaintModalId(null)}
          onRefresh={fetchComplaints}
        />
      )}
    </div>
  );
}
