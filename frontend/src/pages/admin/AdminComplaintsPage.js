import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ClipboardList,
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
  Filter,
  Zap,
  Navigation,
  History,
  UserCheck,
  X,
  Phone,
  User,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config/api.js";

const TABS = [
  { id: "all",         label: "All Complaints",   icon: ClipboardList, countKey: "all" },
  { id: "unassigned",  label: "Awaiting Worker",  icon: Users,         countKey: "unassigned" },
  { id: "pending",     label: "Pending",          icon: Clock,         countKey: "pending" },
  { id: "in_progress", label: "In Progress",      icon: AlertCircle,   countKey: "in_progress" },
  { id: "resolved",    label: "Resolved",         icon: CheckCircle2,  countKey: "resolved" },
];

const STATUS_CONFIG = {
  SUBMITTED:   { label: "Submitted",   cls: "bg-gray-500/15 text-gray-400 border-gray-500/30",          icon: FileText },
  PENDING:     { label: "Pending",     cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",        icon: Clock },
  IN_PROGRESS: { label: "In Progress", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30",           icon: AlertCircle },
  RESOLVED:    { label: "Resolved",    cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",  icon: CheckCircle2 },
  COMPLETED:   { label: "Completed",   cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",  icon: CheckCircle2 },
  CLOSED:      { label: "Closed",      cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",  icon: CheckCircle2 },
  VERIFIED:    { label: "Verified",    cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",  icon: CheckCircle2 },
};

const SEVERITY_CONFIG = {
  LOW:    "bg-gray-500/15 text-gray-400 border-gray-500/30",
  MEDIUM: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  HIGH:   "bg-red-500/15   text-red-400   border-red-500/30",
};

export default function AdminComplaintsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { getToken } = useAuth();

  // State
  const [complaints, setComplaints] = useState([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, in_progress: 0, resolved: 0, unassigned: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("");
  const [selectedWasteType, setSelectedWasteType] = useState("");

  // Modals
  const [assigningComplaint, setAssigningComplaint] = useState(null);
  const [viewingLogsComplaint, setViewingLogsComplaint] = useState(null);
  const [autoAssigningId, setAutoAssigningId] = useState(null);

  // Determine active tab from URL query params
  const tabParam = searchParams.get("tab") || searchParams.get("status") || "all";
  const activeTab = TABS.some((t) => t.id === tabParam) ? tabParam : "all";

  const setTab = (tabId) => {
    const next = new URLSearchParams(searchParams);
    if (tabId === "all") {
      next.delete("tab");
      next.delete("status");
    } else {
      next.set("tab", tabId);
      next.delete("status");
    }
    setSearchParams(next);
  };

  // Fetch complaints from database
  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) return;

      const params = new URLSearchParams();
      if (activeTab && activeTab !== "all") params.append("tab", activeTab);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (selectedSeverity) params.append("severity", selectedSeverity);
      if (selectedWasteType) params.append("waste_type", selectedWasteType);

      const res = await fetch(`${API_URL}/admin/complaints?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints || []);
        if (data.counts) setCounts(data.counts);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Failed to load complaints.");
      }
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [getToken, activeTab, searchQuery, selectedSeverity, selectedWasteType]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Trigger Automatic Nearest Assignment on an unassigned complaint
  const handleAutoAssign = async (complaintId) => {
    setAutoAssigningId(complaintId);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/admin/complaints/${complaintId}/auto-assign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (res.ok && data.success && data.assigned) {
        setActionNotice({
          type: "success",
          text: `Auto-assigned to nearest worker: ${data.worker?.full_name} (${data.distance_meters}m away)`,
        });
      } else {
        setActionNotice({
          type: "warning",
          text: data.message || "No eligible worker found within radius. Complaint remains queued.",
        });
      }
      await fetchComplaints();
    } catch (err) {
      setActionNotice({ type: "error", text: "Failed to run auto-assignment." });
    } finally {
      setAutoAssigningId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 id="admin-complaints-title" className="font-display font-bold text-2xl text-white flex items-center gap-2.5">
            <ClipboardList className="w-6 h-6 text-primary-400" />
            Complaints & Task Management
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Monitor reported waste, review automatic assignments, and dispatch municipal workforce.
          </p>
        </div>
        <button
          id="admin-complaints-refresh-btn"
          onClick={fetchComplaints}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-muted border border-surface-border hover:border-primary-500/40 text-gray-300 hover:text-white transition-all text-sm disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-in fade-in duration-200 ${
            actionNotice.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : actionNotice.type === "warning"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : actionNotice.type === "warning" ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span>{actionNotice.text}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs with live counts */}
      <div className="flex items-center gap-1.5 p-1 bg-surface-card border border-surface-border rounded-xl overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count = counts[tab.countKey] || 0;
          return (
            <button
              key={tab.id}
              id={`admin-complaints-tab-${tab.id}`}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
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

      {/* Filter / Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, location, citizen, or worker..."
            className="w-full pl-9 pr-4 py-2 bg-surface-card border border-surface-border rounded-xl text-xs md:text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-500/50"
          />
        </div>
        <div className="sm:col-span-3">
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="w-full bg-surface-card border border-surface-border rounded-xl px-3 py-2 text-xs md:text-sm text-gray-300 focus:outline-none focus:border-primary-500/50"
          >
            <option value="">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>
        </div>
        <div className="sm:col-span-3">
          <select
            value={selectedWasteType}
            onChange={(e) => setSelectedWasteType(e.target.value)}
            className="w-full bg-surface-card border border-surface-border rounded-xl px-3 py-2 text-xs md:text-sm text-gray-300 focus:outline-none focus:border-primary-500/50"
          >
            <option value="">All Waste Types</option>
            <option value="PLASTIC">Plastic</option>
            <option value="ORGANIC">Organic</option>
            <option value="HAZARDOUS">Hazardous</option>
            <option value="BULK">Bulk / Debris</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="card p-6 border-red-500/30 bg-red-500/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-300 font-medium">{error}</p>
          </div>
          <button
            onClick={fetchComplaints}
            className="px-3.5 py-1.5 rounded-lg border border-red-500/40 text-red-300 text-xs font-semibold hover:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="card p-12 flex flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          <p className="text-sm font-medium text-gray-300">Loading complaints from database…</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && complaints.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-surface-muted border border-surface-border flex items-center justify-center mb-3 text-gray-500">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h3 className="font-display font-semibold text-white text-base mb-1">No complaints found</h3>
          <p className="text-xs text-gray-500 max-w-sm">
            {activeTab === "unassigned"
              ? "All active complaints currently have assigned workers. Great work!"
              : "No complaints match the selected filter criteria."}
          </p>
        </div>
      )}

      {/* Complaints List */}
      {!loading && !error && complaints.length > 0 && (
        <div className="space-y-4">
          {complaints.map((c) => (
            <AdminComplaintCard
              key={c.id}
              complaint={c}
              isAutoAssigning={autoAssigningId === c.id}
              onAutoAssign={() => handleAutoAssign(c.id)}
              onManualAssign={() => setAssigningComplaint(c)}
              onViewLogs={() => setViewingLogsComplaint(c)}
            />
          ))}
        </div>
      )}

      {/* Manual Worker Assignment Modal */}
      {assigningComplaint && (
        <ManualAssignModal
          complaint={assigningComplaint}
          onClose={() => setAssigningComplaint(null)}
          onSuccess={(worker) => {
            setAssigningComplaint(null);
            setActionNotice({
              type: "success",
              text: `Complaint "${assigningComplaint.title}" manually assigned to ${worker.full_name}.`,
            });
            fetchComplaints();
          }}
        />
      )}

      {/* Assignment Audit Logs Modal */}
      {viewingLogsComplaint && (
        <AssignmentLogsModal
          complaint={viewingLogsComplaint}
          onClose={() => setViewingLogsComplaint(null)}
        />
      )}
    </div>
  );
}

// Individual Complaint Card in Admin View
function AdminComplaintCard({
  complaint,
  isAutoAssigning,
  onAutoAssign,
  onManualAssign,
  onViewLogs,
}) {
  const s = STATUS_CONFIG[complaint.status] || STATUS_CONFIG.SUBMITTED;
  const isUnassigned = !complaint.assigned_worker_id;

  const distanceText =
    complaint.assignment_distance_meters != null
      ? complaint.assignment_distance_meters >= 1000
        ? `${(complaint.assignment_distance_meters / 1000).toFixed(1)} km away`
        : `${complaint.assignment_distance_meters} m away`
      : null;

  return (
    <div
      id={`admin-complaint-card-${complaint.id}`}
      className={`card p-4 md:p-5 transition-all duration-200 hover:border-primary-500/30 ${
        isUnassigned ? "border-l-4 border-l-amber-500" : "border-l-4 border-l-primary-500"
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        {/* Left Column: Complaint & Location details */}
        <div className="flex-1 min-w-0 space-y-2.5">
          {/* Header Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold ${s.cls}`}>
              {s.label}
            </span>

            <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold ${SEVERITY_CONFIG[complaint.severity] || SEVERITY_CONFIG.MEDIUM}`}>
              {complaint.severity} Priority
            </span>

            {complaint.waste_type && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold bg-surface-muted text-gray-300 border-surface-border">
                {complaint.waste_type}
              </span>
            )}

            {complaint.assignment_mode === "AUTO_NEAREST" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-primary-500/30 bg-primary-500/10 text-primary-400 text-xs font-bold">
                <Zap className="w-3 h-3" />
                Auto-Nearest
              </span>
            )}

            <span className="font-mono text-xs text-gray-500 ml-auto lg:ml-0">
              #{complaint.id?.split("-")[0]}
            </span>
          </div>

          {/* Title & Description */}
          <div>
            <h3 className="text-base font-display font-semibold text-white">{complaint.title}</h3>
            {complaint.description && (
              <p className="text-gray-400 text-xs md:text-sm mt-1 line-clamp-2">{complaint.description}</p>
            )}
          </div>

          {/* Location & Metadata */}
          <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-gray-400 pt-1">
            <span className="flex items-center gap-1 text-gray-300">
              <MapPin className="w-3.5 h-3.5 text-primary-400 shrink-0" />
              <span className="truncate max-w-sm">
                {complaint.address || `${complaint.latitude?.toFixed(4)}, ${complaint.longitude?.toFixed(4)}`}
              </span>
            </span>

            {(complaint.ward_name || complaint.municipality_name) && (
              <span className="text-gray-500">
                {[complaint.ward_name ? `Ward ${complaint.ward_name}` : null, complaint.municipality_name]
                  .filter(Boolean)
                  .join(" • ")}
              </span>
            )}

            <span className="flex items-center gap-1 text-gray-500">
              <Calendar className="w-3 h-3" />
              {new Date(complaint.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>

            {complaint.citizen_name && (
              <span className="text-gray-500">
                Reported by <span className="text-gray-400">{complaint.citizen_name}</span>
              </span>
            )}
          </div>

          {/* Assigned Worker Info Block */}
          {!isUnassigned ? (
            <div className="p-3 rounded-xl bg-surface-muted border border-surface-border flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary-500/15 border border-primary-500/30 flex items-center justify-center text-primary-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-gray-400">Assigned Worker: </span>
                  <span className="font-semibold text-white">{complaint.worker_name || "Assigned Worker"}</span>
                  {complaint.worker_phone && (
                    <span className="text-gray-500 ml-2">({complaint.worker_phone})</span>
                  )}
                </div>
              </div>

              {distanceText && (
                <span className="inline-flex items-center gap-1 text-primary-400 font-medium">
                  <Navigation className="w-3.5 h-3.5" />
                  {distanceText}
                </span>
              )}

              {/* Worker Acceptance / Offer Status */}
              <div className="w-full pt-1.5 border-t border-surface-border/50 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Offer Status:</span>
                  {complaint.worker_response === "PENDING_ACCEPTANCE" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 font-semibold text-[11px]">
                      <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
                      Offer Pending Acceptance
                    </span>
                  ) : complaint.worker_response === "ACCEPTED" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-semibold text-[11px]">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Accepted by Worker
                    </span>
                  ) : complaint.worker_response === "REJECTED" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-red-500/40 bg-red-500/10 text-red-300 font-semibold text-[11px]">
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                      Rejected
                    </span>
                  ) : (
                    <span className="text-gray-400 text-[11px]">Active</span>
                  )}
                </div>

                {complaint.rejected_worker_ids?.length > 0 && (
                  <span className="text-xs text-amber-400/90 font-medium">
                    ({complaint.rejected_worker_ids.length} previous rejection{complaint.rejected_worker_ids.length > 1 ? "s" : ""})
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-2 text-xs text-amber-300">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>No worker assigned. Ready for automatic spatial dispatch or manual assignment.</span>
                </div>
                {complaint.rejected_worker_ids?.length > 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 font-bold text-[10px] shrink-0">
                    {complaint.rejected_worker_ids.length} rejection{complaint.rejected_worker_ids.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {complaint.rejection_reason && (
                <div className="p-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-200 text-[11px]">
                  <span className="font-bold text-red-300">Last Rejection Reason: </span>
                  <span>{complaint.rejection_reason}</span>
                  {complaint.worker_response_at && (
                    <span className="text-gray-400 ml-2">
                      ({new Date(complaint.worker_response_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Column: Actions */}
        <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-surface-border">
          {isUnassigned ? (
            <>
              <button
                type="button"
                onClick={onAutoAssign}
                disabled={isAutoAssigning}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-500 hover:bg-primary-400 text-white font-semibold text-xs shadow-md transition-all disabled:opacity-50"
                title="Automatically assign nearest eligible worker using PostGIS"
              >
                {isAutoAssigning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                <span>Auto-Assign Nearest</span>
              </button>

              <button
                type="button"
                onClick={onManualAssign}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-muted hover:bg-surface-border border border-surface-border text-gray-200 text-xs font-semibold transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-primary-400" />
                <span>Manual Assign</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onManualAssign}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-muted hover:bg-surface-border border border-surface-border text-gray-200 text-xs font-semibold transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-primary-400" />
              <span>Reassign Worker</span>
            </button>
          )}

          <button
            type="button"
            onClick={onViewLogs}
            className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-300 py-1 transition-colors ml-auto lg:ml-0"
            title="View assignment audit trail"
          >
            <History className="w-3 h-3" />
            <span>Audit History</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal to manually assign or reassign a complaint to a verified active worker
function ManualAssignModal({ complaint, onClose, onSuccess }) {
  const { getToken } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadWorkers() {
      try {
        const token = getToken();
        const res = await fetch(`${API_URL}/admin/workers?status=active`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setWorkers(data.workers || []);
        }
      } catch (e) {
        setError("Failed to load active workers.");
      } finally {
        setLoading(false);
      }
    }
    loadWorkers();
  }, [getToken]);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedWorkerId) return;

    setSubmitting(true);
    setError(null);

    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/admin/complaints/${complaint.id}/assign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workerId: selectedWorkerId,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess(data.worker);
      } else {
        setError(data.message || "Failed to assign complaint.");
      }
    } catch {
      setError("An error occurred during assignment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-400" />
            <div>
              <h3 className="font-display font-semibold text-white text-base">Assign Worker</h3>
              <p className="text-xs text-gray-400 truncate max-w-sm">"{complaint.title}"</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleAssign} className="p-5 space-y-4 flex-1 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2">
              Select Verified Worker in Jurisdiction <span className="text-red-400">*</span>
            </label>

            {loading ? (
              <div className="p-8 flex items-center justify-center gap-2 text-gray-400 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
                <span>Loading available workers…</span>
              </div>
            ) : workers.length === 0 ? (
              <p className="text-xs text-amber-400 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                No active verified workers found in this jurisdiction. Please approve or register workers first.
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {workers.map((w) => {
                  const isSelected = selectedWorkerId === w.id;
                  return (
                    <div
                      key={w.id}
                      onClick={() => setSelectedWorkerId(w.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-primary-500/15 border-primary-500/50 text-white"
                          : "bg-surface-muted border-surface-border text-gray-300 hover:border-gray-600"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{w.full_name}</p>
                          <p className="text-xs text-gray-400">{w.email} • {w.phone_number || "No phone"}</p>
                        </div>
                        {w.assigned_area && (
                          <span className="text-[11px] text-gray-500">{w.assigned_area}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Assignment Note (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g., High priority cleanup near school entrance"
              className="w-full bg-surface-muted border border-surface-border rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-500/50"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-surface-border text-gray-300 hover:text-white text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedWorkerId}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Assignment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal showing full assignment history / audit logs
function AssignmentLogsModal({ complaint, onClose }) {
  const { getToken } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        const token = getToken();
        const res = await fetch(`${API_URL}/admin/complaints/${complaint.id}/logs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs || []);
        }
      } catch (err) {
        console.error("Failed to load logs:", err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, [complaint.id, getToken]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary-400" />
            <div>
              <h3 className="font-display font-semibold text-white text-base">Assignment Audit Trail</h3>
              <p className="text-xs text-gray-400 truncate max-w-sm">"{complaint.title}"</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-96">
          {loading ? (
            <div className="p-8 flex items-center justify-center gap-2 text-gray-400 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
              <span>Loading audit logs…</span>
            </div>
          ) : logs.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-6">No assignment logs recorded for this complaint.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-surface-muted border border-surface-border text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        log.status === "ASSIGNED" || log.status === "OFFERED"
                          ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                          : log.status === "ACCEPTED"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : log.status === "REJECTED"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : log.status === "REASSIGNED"
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {log.status}
                    </span>
                    <span className="text-gray-500 text-[11px]">
                      {new Date(log.created_at).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <p className="text-white font-medium">
                    {log.worker_name ? `Worker: ${log.worker_name}` : "No worker assigned"}
                  </p>

                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    Assigned by:{" "}
                    <span className="text-gray-300">
                      {log.assigned_by === "SYSTEM_AUTO"
                        ? "⚡ Automatic Nearest Spatial Engine"
                        : `Administrator (${log.admin_name || "Admin"})`}
                    </span>
                  </p>

                  {log.distance_meters != null && (
                    <p className="text-primary-400 text-[11px]">
                      Calculated Distance: {log.distance_meters} meters
                    </p>
                  )}

                  {log.notes && <p className="text-gray-400 italic text-[11px] mt-1">"{log.notes}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
