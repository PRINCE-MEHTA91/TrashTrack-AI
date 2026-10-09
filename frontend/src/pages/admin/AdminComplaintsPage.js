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
  Filter,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config/api.js";

const TABS = [
  { id: "all",        label: "All Complaints",  icon: ClipboardList },
  { id: "pending",    label: "Pending",          icon: Clock },
  { id: "in_progress",label: "In Progress",      icon: AlertCircle },
  { id: "resolved",   label: "Resolved",         icon: CheckCircle2 },
  { id: "assignment", label: "Task Assignment",  icon: Users },
];

const STATUS_CONFIG = {
  SUBMITTED:   { label: "Submitted",   cls: "bg-gray-500/15 text-gray-400 border-gray-500/30",          icon: FileText },
  PENDING:     { label: "Pending",     cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",        icon: Clock },
  IN_PROGRESS: { label: "In Progress", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30",           icon: AlertCircle },
  RESOLVED:    { label: "Resolved",    cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",  icon: CheckCircle2 },
  CLOSED:      { label: "Closed",      cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",  icon: CheckCircle2 },
  VERIFIED:    { label: "Verified",    cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",  icon: CheckCircle2 },
};

const SEVERITY_CONFIG = {
  LOW:    "bg-gray-500/15 text-gray-400 border-gray-500/30",
  MEDIUM: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  HIGH:   "bg-red-500/15   text-red-400   border-red-500/30",
};

function ComplaintRow({ complaint }) {
  const s = STATUS_CONFIG[complaint.status] || STATUS_CONFIG.SUBMITTED;
  const SIcon = s.icon;
  return (
    <div className="card px-5 py-4 hover:border-primary-500/20 transition-colors">
      <div className="flex items-start gap-4">
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${s.cls.split(" ")[0]} ${s.cls.split(" ")[2]}`}>
          <SIcon className={`w-4 h-4 ${s.cls.split(" ")[1]}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-white text-sm leading-tight">{complaint.title}</h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold ${SEVERITY_CONFIG[complaint.severity] || SEVERITY_CONFIG.MEDIUM}`}>
                {complaint.severity}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold ${s.cls}`}>
                {s.label}
              </span>
            </div>
          </div>
          {complaint.description && (
            <p className="text-gray-400 text-xs line-clamp-1 mb-2">{complaint.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {complaint.address || `${complaint.latitude?.toFixed(4)}, ${complaint.longitude?.toFixed(4)}`}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(complaint.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <span className="font-mono text-gray-600">#{complaint.id?.split("-")[0]}</span>
            {complaint.waste_type && (
              <span className="uppercase text-gray-600">{complaint.waste_type}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AssignmentView() {
  return (
    <div className="card p-10 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4">
        <Users className="w-7 h-7 text-primary-400" />
      </div>
      <h3 className="font-display font-semibold text-white text-lg mb-2">Task Assignment</h3>
      <p className="text-gray-400 text-sm max-w-sm leading-relaxed">
        Worker–complaint assignment management will be available once the assignment API endpoint is live. Workers and complaints will appear here for drag-and-drop or manual assignment.
      </p>
      <span className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-400 text-xs font-bold">
        API Pending
      </span>
    </div>
  );
}

export default function AdminComplaintsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { getToken } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Determine active tab from URL
  const statusParam = searchParams.get("status");
  const tabParam    = searchParams.get("tab");
  let activeTab = "all";
  if (tabParam === "assignment") activeTab = "assignment";
  else if (statusParam === "pending") activeTab = "pending";
  else if (statusParam === "in_progress") activeTab = "in_progress";
  else if (statusParam === "resolved") activeTab = "resolved";

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) return;
      // Use citizen complaints endpoint for now (admin endpoint to be added)
      const res = await fetch(`${API_URL}/complaints/me?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints || []);
      } else {
        setError("Unable to load complaints. Admin complaints API coming soon.");
        setComplaints([]);
      }
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  function setTab(tabId) {
    if (tabId === "all") setSearchParams({});
    else if (tabId === "assignment") setSearchParams({ tab: "assignment" });
    else setSearchParams({ status: tabId });
  }

  // Filter complaints based on active tab
  const filtered = complaints.filter((c) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending")     return c.status === "PENDING" || c.status === "SUBMITTED";
    if (activeTab === "in_progress") return c.status === "IN_PROGRESS";
    if (activeTab === "resolved")    return ["RESOLVED", "CLOSED", "VERIFIED"].includes(c.status);
    return true;
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 id="admin-complaints-title" className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary-400" />
            Complaints & Tasks
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Monitor and manage all citizen complaints across your municipality
          </p>
        </div>
        <button
          id="admin-complaints-refresh-btn"
          onClick={fetchComplaints}
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
              id={`admin-complaints-tab-${tab.id}`}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.id !== "assignment" && complaints.length > 0 && (() => {
                let count = complaints.length;
                if (tab.id === "pending")     count = complaints.filter(c => c.status === "PENDING" || c.status === "SUBMITTED").length;
                if (tab.id === "in_progress") count = complaints.filter(c => c.status === "IN_PROGRESS").length;
                if (tab.id === "resolved")    count = complaints.filter(c => ["RESOLVED","CLOSED","VERIFIED"].includes(c.status)).length;
                return count > 0 ? (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-surface-muted text-gray-400 text-xs">{count}</span>
                ) : null;
              })()}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === "assignment" ? (
        <AssignmentView />
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          <p className="text-gray-400 text-sm">Loading complaints…</p>
        </div>
      ) : error ? (
        <div className="card p-10 flex flex-col items-center text-center">
          <AlertCircle className="w-10 h-10 text-amber-400 mb-4" />
          <h3 className="font-semibold text-white mb-2">Could not load complaints</h3>
          <p className="text-gray-400 text-sm max-w-sm">{error}</p>
          <span className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
            Admin API Endpoint Coming Soon
          </span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 flex flex-col items-center text-center">
          <Filter className="w-10 h-10 text-gray-600 mb-4" />
          <h3 className="font-semibold text-white mb-2">No complaints found</h3>
          <p className="text-gray-400 text-sm">No complaints match the current filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <ComplaintRow key={c.id} complaint={c} />
          ))}
        </div>
      )}
    </div>
  );
}
