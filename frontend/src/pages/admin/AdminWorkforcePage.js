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
  Phone,
  MapPin,
  Check,
  X,
  XCircle,
  Eye,
  Building2,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Info,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config/api.js";
import AdminWorkerAvailabilityTable from "../../components/admin/AdminWorkerAvailabilityTable";

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

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function ComingSoonSection({ label }) {
  return (
    <div className="card p-10 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4">
        <Users className="w-7 h-7 text-primary-400" />
      </div>
      <h3 className="font-display font-semibold text-white text-lg mb-2">{label}</h3>
      <p className="text-gray-400 text-sm max-w-sm leading-relaxed">
        This section is reserved for automated scheduling, shift allocation, and real-time telematics.
      </p>
      <span className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-400 text-xs font-bold">
        Module Under Development
      </span>
    </div>
  );
}

export default function AdminWorkforcePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { getToken } = useAuth();

  // Tab & Data State
  const tabParam = searchParams.get("tab") || "all";
  const activeTab = TABS.find(t => t.id === tabParam)?.id || "all";

  const [workers, setWorkers] = useState([]);
  const [pendingWorkers, setPendingWorkers] = useState([]);
  const [adminMuni, setAdminMuni] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionAlert, setActionAlert] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals state
  const [detailWorker, setDetailWorker] = useState(null);
  const [approveConfirmWorker, setApproveConfirmWorker] = useState(null);
  const [rejectConfirmWorker, setRejectConfirmWorker] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Fetch pending approvals
  const fetchPendingApprovals = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/admin/workers/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingWorkers(data.workers || []);
        if (data.admin_municipality) {
          setAdminMuni(data.admin_municipality);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Could not fetch pending approvals.");
      }
    } catch {
      setError("Failed to connect to the server.");
    }
  }, [getToken]);

  // Fetch all workers
  const fetchAllWorkers = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/admin/workers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWorkers(data.workers || []);
        if (data.admin_municipality) {
          setAdminMuni(data.admin_municipality);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Could not fetch workforce list.");
      }
    } catch {
      setError("Failed to connect to the server.");
    }
  }, [getToken]);

  // Load data based on active tab
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "approvals") {
        await fetchPendingApprovals();
      } else if (activeTab === "all") {
        await Promise.all([fetchAllWorkers(), fetchPendingApprovals()]);
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, fetchPendingApprovals, fetchAllWorkers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for workforce updates from other triggers
  useEffect(() => {
    function handleUpdate() {
      loadData();
    }
    window.addEventListener("tt:workforce-updated", handleUpdate);
    return () => window.removeEventListener("tt:workforce-updated", handleUpdate);
  }, [loadData]);

  function setTab(id) {
    if (id === "all") setSearchParams({});
    else setSearchParams({ tab: id });
    setActionAlert(null);
  }

  // ── Actions ──────────────────────────────────────────────────
  async function handleApproveSubmit() {
    if (!approveConfirmWorker) return;
    setSubmittingAction(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/admin/workers/${approveConfirmWorker.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (res.ok) {
        setActionAlert({
          type: "success",
          message: data.message || `Worker ${approveConfirmWorker.full_name} approved successfully!`,
        });
        setApproveConfirmWorker(null);
        if (detailWorker?.id === approveConfirmWorker.id) setDetailWorker(null);
        // Refresh local data & global badge
        await loadData();
        window.dispatchEvent(new CustomEvent("tt:workforce-updated"));
      } else {
        setActionAlert({
          type: "error",
          message: data.message || "Failed to approve worker. Please check zone authorization.",
        });
      }
    } catch {
      setActionAlert({
        type: "error",
        message: "An error occurred while approving worker.",
      });
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleRejectSubmit() {
    if (!rejectConfirmWorker) return;
    if (!rejectionReason.trim() || rejectionReason.trim().length < 3) {
      alert("Please enter a valid rejection reason (at least 3 characters).");
      return;
    }

    setSubmittingAction(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/admin/workers/${rejectConfirmWorker.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectionReason.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionAlert({
          type: "info",
          message: data.message || `Worker ${rejectConfirmWorker.full_name} rejected.`,
        });
        setRejectConfirmWorker(null);
        setRejectionReason("");
        if (detailWorker?.id === rejectConfirmWorker.id) setDetailWorker(null);
        // Refresh local data & global badge
        await loadData();
        window.dispatchEvent(new CustomEvent("tt:workforce-updated"));
      } else {
        setActionAlert({
          type: "error",
          message: data.message || "Failed to reject worker registration.",
        });
      }
    } catch {
      setActionAlert({
        type: "error",
        message: "An error occurred while rejecting worker.",
      });
    } finally {
      setSubmittingAction(false);
    }
  }

  // ── Filters & Search ──────────────────────────────────────────
  const filteredPending = pendingWorkers.filter(w => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      w.full_name?.toLowerCase().includes(q) ||
      w.email?.toLowerCase().includes(q) ||
      w.phone_number?.toLowerCase().includes(q) ||
      w.requested_area?.name?.toLowerCase().includes(q) ||
      w.address?.toLowerCase().includes(q)
    );
  });

  const filteredAll = workers.filter((w) => {
    const isWorkerActive = w.status === "active" && w.verification_status !== "REJECTED" && w.verification_status !== "PENDING_VERIFICATION";
    const isWorkerRejected = w.status === "rejected" || w.verification_status === "REJECTED";
    const isWorkerPending = !isWorkerActive && !isWorkerRejected;

    if (statusFilter === "active" && !isWorkerActive) return false;
    if (statusFilter === "pending_verification" && !isWorkerPending) return false;
    if (statusFilter === "rejected" && !isWorkerRejected) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      w.full_name?.toLowerCase().includes(q) ||
      w.email?.toLowerCase().includes(q) ||
      w.phone_number?.toLowerCase().includes(q) ||
      w.municipality_name?.toLowerCase().includes(q) ||
      w.requested_municipality_name?.toLowerCase().includes(q) ||
      w.assigned_area?.toLowerCase().includes(q) ||
      w.address?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 id="admin-workforce-title" className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-400" />
            Workforce Management
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Manage field operators, process verification requests, and maintain jurisdiction coverage.
          </p>
          {adminMuni && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-card border border-surface-border text-xs text-gray-300">
              <Building2 className="w-3.5 h-3.5 text-primary-400" />
              <span>Jurisdiction:</span>
              <span className="font-semibold text-white">{adminMuni.name}</span>
              <span className="text-gray-500">({adminMuni.state})</span>
            </div>
          )}
        </div>

        <button
          id="admin-workforce-refresh-btn"
          onClick={loadData}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-card border border-surface-border hover:border-primary-500/40 text-gray-300 hover:text-white transition-all text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary-400" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Feedback Banner ── */}
      {actionAlert && (
        <div
          role="alert"
          className={`px-4 py-3 rounded-xl border flex items-center justify-between gap-3 text-sm animate-slide-down ${
            actionAlert.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : actionAlert.type === "error"
              ? "bg-red-500/10 border-red-500/30 text-red-400"
              : "bg-blue-500/10 border-blue-500/30 text-blue-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionAlert.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : actionAlert.type === "error" ? (
              <XCircle className="w-4 h-4 shrink-0" />
            ) : (
              <Info className="w-4 h-4 shrink-0" />
            )}
            <span>{actionAlert.message}</span>
          </div>
          <button
            onClick={() => setActionAlert(null)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center gap-1 p-1 bg-surface-card border border-surface-border rounded-xl overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isApprovals = tab.id === "approvals";
          const pendingCount = pendingWorkers.length;

          return (
            <button
              key={tab.id}
              id={`admin-workforce-tab-${tab.id}`}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? "bg-primary-500/20 text-primary-400 border border-primary-500/30 shadow-glow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {isApprovals && pendingCount > 0 && (
                <span
                  id="admin-workforce-tab-approvals-badge"
                  className="px-1.5 py-0.2 rounded-full bg-amber-500/25 text-amber-300 text-[10px] font-bold border border-amber-500/40"
                >
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Search Bar ── */}
      {(activeTab === "approvals" || activeTab === "all") && (
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              id="admin-workforce-search"
              type="text"
              placeholder="Search by worker name, phone, area, or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-card border border-surface-border rounded-xl text-white placeholder-gray-500 text-xs focus:outline-none focus:border-primary-500/50"
            />
          </div>

          {activeTab === "all" && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filter:
              </span>
              {["all", "active", "pending_verification", "rejected"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === s
                      ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                      : "text-gray-400 hover:text-gray-200 bg-surface-card border border-surface-border"
                  }`}
                >
                  {s === "all" ? "All" : s === "active" ? "Active" : s === "rejected" ? "Rejected" : "Pending"}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Main Tab Content ── */}
      {activeTab === "availability" ? (
        <AdminWorkerAvailabilityTable />
      ) : activeTab === "workload" ? (
        <ComingSoonSection label="Workload & Shift Distribution" />
      ) : activeTab === "performance" ? (
        <ComingSoonSection label="Worker Performance & Cleanliness Ratings" />
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          <p className="text-gray-400 text-sm">Loading workforce records…</p>
        </div>
      ) : error ? (
        <div className="card p-10 flex flex-col items-center text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mb-4" />
          <h3 className="font-semibold text-white mb-2">Workforce data unavailable</h3>
          <p className="text-gray-400 text-sm max-w-sm">{error}</p>
        </div>
      ) : activeTab === "approvals" ? (
        /* ══════════════════════════════════════════════════════════
           TAB 2: PENDING APPROVALS
        ══════════════════════════════════════════════════════════ */
        <div className="space-y-4">
          {/* Section banner */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Pending Worker Registrations ({filteredPending.length})
                </h2>
                <p className="text-xs text-gray-400">
                  Workers awaiting identity verification and area allocation. Approved workers immediately gain duty access.
                </p>
              </div>
            </div>
            {adminMuni ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Zone: {adminMuni.name}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                <ShieldAlert className="w-3.5 h-3.5" />
                Setup Municipal Area
              </span>
            )}
          </div>

          {filteredPending.length === 0 ? (
            <div className="card p-12 flex flex-col items-center text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3" />
              <h3 className="font-semibold text-white text-base mb-1">No Pending Approvals</h3>
              <p className="text-gray-400 text-xs max-w-md">
                {searchQuery
                  ? "No pending approvals match your search criteria."
                  : "All worker registration requests within your jurisdiction have been reviewed and processed."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPending.map((worker) => {
                const initials = getInitials(worker.full_name);
                const regDate = formatDate(worker.requested_at || worker.created_at);
                const isNeedsAreaAdmin = worker.needs_area_admin_assignment;

                return (
                  <div
                    key={worker.id}
                    id={`pending-worker-card-${worker.id}`}
                    className="card p-5 hover:border-primary-500/30 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-bold text-white text-sm shrink-0 ring-2 ring-amber-500/20 shadow-md">
                        {initials}
                      </div>

                      {/* Worker Info */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-white text-base leading-snug">
                            {worker.full_name}
                          </h3>
                          {/* Verification status pill */}
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-semibold">
                            <Clock className="w-3 h-3" />
                            PENDING VERIFICATION
                          </span>

                          {/* Requested Area Badge */}
                          {worker.requested_area ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-300 text-[11px] font-medium">
                              <MapPin className="w-3 h-3 text-primary-400" />
                              {worker.requested_area.name}, {worker.requested_area.district || worker.requested_area.state}
                            </span>
                          ) : isNeedsAreaAdmin ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-medium">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              Needs Area-Admin Assignment
                            </span>
                          ) : null}
                        </div>

                        {/* Contact details */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                          <span className="flex items-center gap-1 text-gray-300">
                            <Mail className="w-3.5 h-3.5 text-gray-500" />
                            {worker.email}
                          </span>
                          <span className="flex items-center gap-1 text-gray-300">
                            <Phone className="w-3.5 h-3.5 text-gray-500" />
                            {worker.phone_number}
                          </span>
                          <span className="flex items-center gap-1 text-gray-400">
                            <Calendar className="w-3.5 h-3.5 text-gray-500" />
                            Registered {regDate}
                          </span>
                        </div>

                        {/* Base address */}
                        {worker.address && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 shrink-0 text-gray-600" />
                            Base / Address: {worker.address}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        id={`btn-worker-view-${worker.id}`}
                        onClick={() => setDetailWorker(worker)}
                        className="px-3 py-1.5 rounded-lg bg-surface-muted hover:bg-surface-border border border-surface-border text-gray-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>

                      <button
                        id={`btn-worker-approve-${worker.id}`}
                        onClick={() => setApproveConfirmWorker(worker)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 transition-all text-xs font-semibold flex items-center gap-1.5 shadow-glow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </button>

                      <button
                        id={`btn-worker-reject-${worker.id}`}
                        onClick={() => {
                          setRejectConfirmWorker(worker);
                          setRejectionReason("");
                        }}
                        className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 transition-all text-xs font-semibold flex items-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════
           TAB 1: ALL WORKERS
        ══════════════════════════════════════════════════════════ */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Showing {filteredAll.length} workers</span>
            {pendingWorkers.length > 0 && (
              <button
                onClick={() => setTab("approvals")}
                className="text-amber-400 hover:underline flex items-center gap-1"
              >
                <AlertTriangle className="w-3 h-3" />
                {pendingWorkers.length} pending registration(s) await your approval
              </button>
            )}
          </div>

          {filteredAll.length === 0 ? (
            <div className="card p-12 flex flex-col items-center text-center">
              <Users className="w-12 h-12 text-gray-600 mb-3" />
              <h3 className="font-semibold text-white text-base mb-1">No Workers Found</h3>
              <p className="text-gray-400 text-xs">
                {searchQuery
                  ? "No workers match your search query."
                  : "No workforce profiles registered in this section."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAll.map((w) => {
                const initials = getInitials(w.full_name);
                const isActive = w.status === "active" && w.verification_status !== "REJECTED" && w.verification_status !== "PENDING_VERIFICATION";
                const isRejected = w.status === "rejected" || w.verification_status === "REJECTED";
                const isPending = !isActive && !isRejected;

                return (
                  <div
                    key={w.id}
                    id={`all-worker-card-${w.id}`}
                    className="card p-5 hover:border-primary-500/25 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-md ${
                        isActive
                          ? "bg-gradient-to-br from-emerald-500 to-emerald-700 ring-2 ring-emerald-500/20"
                          : isRejected
                          ? "bg-gradient-to-br from-red-500 to-red-700 ring-2 ring-red-500/20"
                          : "bg-gradient-to-br from-amber-500 to-amber-700 ring-2 ring-amber-500/20"
                      }`}>
                        {initials}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-white text-sm truncate">{w.full_name}</h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                            isActive
                              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                              : isRejected
                              ? "bg-red-500/15 border-red-500/30 text-red-400"
                              : "bg-amber-500/15 border-amber-500/30 text-amber-400"
                          }`}>
                            {isActive ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : isRejected ? (
                              <XCircle className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {isActive ? "Active Duty" : isRejected ? "Rejected" : "Pending Verification"}
                          </span>
                        </div>

                        <div className="space-y-0.5 text-xs text-gray-400">
                          <p className="flex items-center gap-1.5 truncate">
                            <Mail className="w-3 h-3 text-gray-500 shrink-0" />
                            {w.email}
                          </p>
                          <p className="flex items-center gap-1.5 truncate">
                            <Phone className="w-3 h-3 text-gray-500 shrink-0" />
                            {w.phone_number || "No phone provided"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Area assignment & metadata */}
                    <div className="pt-3 border-t border-surface-border text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-gray-400">
                        <span className="flex items-center gap-1 text-gray-500">
                          <Building2 className="w-3 h-3" /> Area:
                        </span>
                        <span className="font-medium text-gray-300">
                          {w.assigned_area || w.requested_area || "Unassigned"}
                        </span>
                      </div>

                      {/* Rejection reason callout */}
                      {isRejected && w.rejection_reason && (
                        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-[11px] leading-relaxed">
                          <span className="font-semibold text-red-400">Rejection Reason:</span> {w.rejection_reason}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-gray-500">
                          Joined {formatDate(w.created_at)}
                        </span>
                        <button
                          onClick={() => setDetailWorker(w)}
                          className="text-primary-400 hover:text-primary-300 text-xs font-semibold flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> View Detail
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
         MODAL 1: WORKER DETAIL VIEW
      ════════════════════════════════════════════════════════════ */}
      {detailWorker && (
        <div
          id="worker-detail-modal"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setDetailWorker(null)}
        >
          <div
            className="w-full max-w-lg bg-surface-card border border-surface-border rounded-2xl shadow-2xl overflow-hidden p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center font-bold text-white text-base">
                  {getInitials(detailWorker.full_name)}
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-lg">
                    {detailWorker.full_name}
                  </h3>
                  <p className="text-xs text-gray-400">Field Worker Profile</p>
                </div>
              </div>
              <button
                id="btn-close-worker-detail"
                onClick={() => setDetailWorker(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-surface-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-muted space-y-1">
                <span className="text-gray-500 block">Email Address</span>
                <span className="text-white font-medium flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-primary-400" />
                  {detailWorker.email}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-muted space-y-1">
                <span className="text-gray-500 block">Phone Number</span>
                <span className="text-white font-medium flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-primary-400" />
                  {detailWorker.phone_number || "Not provided"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-muted space-y-1">
                <span className="text-gray-500 block">Status</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  detailWorker.status === "active"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : detailWorker.status === "rejected" || detailWorker.verification_status === "REJECTED"
                    ? "bg-red-500/15 text-red-400"
                    : "bg-amber-500/15 text-amber-400"
                }`}>
                  {detailWorker.status === "active"
                    ? "Active & Duty Eligible"
                    : detailWorker.status === "rejected" || detailWorker.verification_status === "REJECTED"
                    ? "Rejected / Ineligible"
                    : "Pending Verification"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-muted space-y-1">
                <span className="text-gray-500 block">Requested / Assigned Area</span>
                <span className="text-white font-medium flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-primary-400" />
                  {detailWorker.assigned_area ||
                    (typeof detailWorker.requested_area === "object"
                      ? detailWorker.requested_area?.name
                      : detailWorker.requested_area) ||
                    detailWorker.municipality_name ||
                    detailWorker.requested_municipality_name ||
                    "Needs Assignment"}
                </span>
              </div>
            </div>

            {/* Residential base address */}
            {detailWorker.address && (
              <div className="p-3 rounded-xl bg-surface-muted text-xs space-y-1">
                <span className="text-gray-500 block">Residential Address</span>
                <p className="text-white font-medium flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary-400 mt-0.5 shrink-0" />
                  {detailWorker.address}
                </p>
              </div>
            )}

            {/* Rejection reason if applicable */}
            {detailWorker.rejection_reason && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs space-y-1">
                <span className="text-red-400 font-semibold block">Rejection Audit Log</span>
                <p className="text-red-300">{detailWorker.rejection_reason}</p>
              </div>
            )}

            {/* Registration timestamp */}
            <p className="text-[11px] text-gray-500 text-center">
              Account created on {formatDate(detailWorker.created_at)}
            </p>

            {/* Actions if worker is pending */}
            {detailWorker.status !== "active" && (
              <div className="flex items-center gap-3 pt-2 border-t border-surface-border">
                <button
                  onClick={() => {
                    setApproveConfirmWorker(detailWorker);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Approve Registration
                </button>
                <button
                  onClick={() => {
                    setRejectConfirmWorker(detailWorker);
                    setRejectionReason("");
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  Reject Registration
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
         MODAL 2: APPROVE CONFIRMATION
      ════════════════════════════════════════════════════════════ */}
      {approveConfirmWorker && (
        <div
          id="worker-approve-confirm-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !submittingAction && setApproveConfirmWorker(null)}
        >
          <div
            className="w-full max-w-md bg-surface-card border border-surface-border rounded-2xl shadow-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-display font-bold text-white text-lg">
                Approve Worker Registration?
              </h3>
              <p className="text-gray-300 text-xs">
                You are about to authorize <span className="font-bold text-white">{approveConfirmWorker.full_name}</span> for active duty.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-muted text-xs space-y-2 text-gray-300">
              <div className="flex justify-between">
                <span className="text-gray-500">Target Area:</span>
                <span className="font-semibold text-white">
                  {adminMuni?.name || approveConfirmWorker.requested_area?.name || "Configured Municipal Zone"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Contact:</span>
                <span className="font-semibold text-white">{approveConfirmWorker.email}</span>
              </div>
              <p className="text-[11px] text-emerald-400/90 pt-1 border-t border-surface-border">
                ✓ Worker status will be set to active transactionally.
                <br />
                ✓ Worker will immediately become eligible to receive task and collection assignments.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={submittingAction}
                onClick={() => setApproveConfirmWorker(null)}
                className="flex-1 py-2.5 rounded-xl bg-surface-muted hover:bg-surface-border text-gray-300 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-approve-worker"
                type="button"
                disabled={submittingAction}
                onClick={handleApproveSubmit}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-glow-sm"
              >
                {submittingAction ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Approving…
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirm Approval
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
         MODAL 3: REJECT CONFIRMATION WITH REASON
      ════════════════════════════════════════════════════════════ */}
      {rejectConfirmWorker && (
        <div
          id="worker-reject-confirm-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !submittingAction && setRejectConfirmWorker(null)}
        >
          <div
            className="w-full max-w-md bg-surface-card border border-surface-border rounded-2xl shadow-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-display font-bold text-white text-lg">
                Reject Worker Registration
              </h3>
              <p className="text-gray-300 text-xs">
                Rejecting registration for <span className="font-bold text-white">{rejectConfirmWorker.full_name}</span>.
                The worker will remain ineligible for work assignments.
              </p>
            </div>

            {/* Rejection reason textarea */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300">
                Reason for Rejection <span className="text-red-400">*</span>
              </label>
              <textarea
                id="worker-rejection-reason-input"
                rows={3}
                placeholder="Specify the reason (e.g. Identity documents unverified, residential address outside operational ward limits, duplicate application)…"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                disabled={submittingAction}
                className="w-full p-3 bg-surface-card border border-surface-border rounded-xl text-white placeholder-gray-500 text-xs focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/40"
              />
              <p className="text-[11px] text-gray-500">
                This reason will be recorded in PostgreSQL audit history.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={submittingAction}
                onClick={() => setRejectConfirmWorker(null)}
                className="flex-1 py-2.5 rounded-xl bg-surface-muted hover:bg-surface-border text-gray-300 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-reject-worker"
                type="button"
                disabled={submittingAction || rejectionReason.trim().length < 3}
                onClick={handleRejectSubmit}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                {submittingAction ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Rejecting…
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    Confirm Rejection
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
