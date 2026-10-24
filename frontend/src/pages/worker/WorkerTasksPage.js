import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ClipboardList,
  Clock,
  Play,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  MapPin,
  Calendar,
  ExternalLink,
  ChevronRight,
  Loader2,
  RefreshCw,
  Camera,
  X,
  MessageSquare,
  FileText,
  User,
  Phone,
  Check,
  AlertCircle,
  Sparkles,
  RotateCcw,
  Image as ImageIcon,
  Zap,
  Navigation,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config/api.js";

// Priority badge configuration
const PRIORITY_CONFIG = {
  HIGH:   { label: "High Priority",   badgeCls: "bg-red-500/15 text-red-400 border-red-500/30" },
  MEDIUM: { label: "Medium Priority", badgeCls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  LOW:    { label: "Low Priority",    badgeCls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
};

// Waste category configuration
const WASTE_TYPE_CONFIG = {
  PLASTIC:   { label: "Plastic Waste",   color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
  ORGANIC:   { label: "Organic / Wet",   color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  HAZARDOUS: { label: "Hazardous / Bio", color: "text-red-400 bg-red-500/10 border-red-500/20" },
  BULK:      { label: "Bulk / Debris",   color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  OTHER:     { label: "General Waste",   color: "text-gray-400 bg-gray-500/10 border-gray-500/20" },
};

// Tabs configuration
const TAB_DEFS = [
  { id: "all",         label: "All Tasks",   icon: ClipboardList, countKey: "all" },
  { id: "pending",     label: "Pending",     icon: Clock,         countKey: "pending" },
  { id: "in_progress", label: "In Progress", icon: Play,          countKey: "in_progress" },
  { id: "completed",   label: "Completed",   icon: CheckCircle2,  countKey: "completed" },
];

export default function WorkerTasksPage() {
  const { getToken } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab from URL query param or default to 'all'
  const activeTab = searchParams.get("tab") || "all";

  // Server state
  const [tasks, setTasks] = useState([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, in_progress: 0, completed: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("");
  const [selectedWasteType, setSelectedWasteType] = useState("");

  // Action states
  const [actionLoading, setActionLoading] = useState({});
  const [feedbackMsg, setFeedbackMsg] = useState(null); // { type: 'success' | 'error', text: '' }

  // Modals state
  const [inspectTask, setInspectTask] = useState(null);
  const [completingTask, setCompletingTask] = useState(null);
  const [progressTask, setProgressTask] = useState(null);

  // Set active tab in search params
  const setTab = (tabId) => {
    const next = new URLSearchParams(searchParams);
    if (tabId === "all") {
      next.delete("tab");
    } else {
      next.set("tab", tabId);
    }
    next.set("page", "1");
    setSearchParams(next);
  };

  // Fetch tasks and live counts from PostgreSQL
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      params.set("tab", activeTab);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (selectedSeverity) params.set("severity", selectedSeverity);
      if (selectedWasteType) params.set("waste_type", selectedWasteType);
      params.set("page", searchParams.get("page") || "1");
      params.set("limit", "20");

      const res = await fetch(`${API_URL}/worker/tasks?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Failed to fetch tasks (HTTP ${res.status})`);
      }

      const data = await res.json();
      setTasks(data.tasks || []);
      if (data.counts) {
        setCounts(data.counts);
      }
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken, activeTab, searchQuery, selectedSeverity, selectedWasteType, searchParams]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Flash feedback helper
  const showFeedback = (text, type = "success") => {
    setFeedbackMsg({ text, type });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4500);
  };

  // Start task
  const handleStartTask = async (task) => {
    if (actionLoading[task.id]) return;
    setActionLoading((prev) => ({ ...prev, [task.id]: true }));
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/worker/tasks/${task.id}/start`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || "Failed to start task.");
      }

      showFeedback(`Task "${task.title}" has been started and is now In Progress!`, "success");
      // Immediately refresh task list and counts from PostgreSQL
      await fetchTasks();
      window.dispatchEvent(new Event("task-status-updated"));
    } catch (err) {
      showFeedback(err.message, "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, [task.id]: false }));
    }
  };

  // Complete task
  const handleCompleteSubmit = async (payload) => {
    if (!completingTask) return;
    const taskId = completingTask.id;
    setActionLoading((prev) => ({ ...prev, [taskId]: true }));
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/worker/tasks/${taskId}/complete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || "Failed to mark task as completed.");
      }

      showFeedback(`Task completed and resolved successfully!`, "success");
      setCompletingTask(null);
      await fetchTasks();
      window.dispatchEvent(new Event("task-status-updated"));
    } catch (err) {
      showFeedback(err.message, "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  // Progress note
  const handleProgressSubmit = async (note) => {
    if (!progressTask) return;
    const taskId = progressTask.id;
    setActionLoading((prev) => ({ ...prev, [taskId]: true }));
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/worker/tasks/${taskId}/progress`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ note }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || "Failed to record progress note.");
      }

      showFeedback("Progress note recorded successfully.", "success");
      setProgressTask(null);
      await fetchTasks();
      window.dispatchEvent(new Event("task-status-updated"));
    } catch (err) {
      showFeedback(err.message, "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  return (
    <div id="worker-tasks-page" className="p-4 md:p-6 pb-24 lg:pb-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
            <span className="text-primary-400 text-xs font-semibold uppercase tracking-wider">
              Field Operations
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white mt-1">
            Assigned Tasks
          </h1>
          <p className="text-gray-400 text-xs md:text-sm mt-0.5">
            Manage your daily route assignments, start cleanup runs, and submit resolution proof.
          </p>
        </div>

        <button
          id="refresh-tasks-btn"
          onClick={fetchTasks}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-muted border border-surface-border hover:border-primary-500/40 text-gray-300 hover:text-white text-xs font-medium transition-colors shrink-0 disabled:opacity-50"
          title="Refresh task list"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary-400" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Feedback */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 animate-slide-down ${
            feedbackMsg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span className="text-xs md:text-sm font-medium">{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Status tabs */}
      <div className="border-b border-surface-border/80">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {TAB_DEFS.map(({ id, label, icon: TabIcon, countKey }) => {
            const isActive = activeTab === id;
            const count = counts[countKey] ?? 0;
            return (
              <button
                key={id}
                id={`tab-${id}`}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-primary-500/15 text-primary-400 border border-primary-500/30 shadow-glow-sm"
                    : "text-gray-400 hover:text-gray-200 hover:bg-surface-muted border border-transparent"
                }`}
              >
                <TabIcon className="w-4 h-4" />
                <span>{label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    isActive
                      ? "bg-primary-500 text-white"
                      : "bg-surface-muted text-gray-400 border border-surface-border"
                  }`}
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3 md:p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        {/* Search Input */}
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="task-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks by title, description, or address…"
            className="w-full bg-surface-muted border border-surface-border rounded-xl pl-9.5 pr-4 py-2 text-xs md:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
          />
        </div>

        {/* Severity / Priority Filter */}
        <div className="sm:col-span-3">
          <select
            id="task-severity-select"
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            aria-label="Filter tasks by priority"
            className="w-full bg-surface-muted border border-surface-border rounded-xl px-3 py-2 text-xs md:text-sm text-gray-300 focus:outline-none focus:border-primary-500/50"
          >
            <option value="">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>
        </div>

        {/* Waste Type Filter */}
        <div className="sm:col-span-3">
          <select
            id="task-wastetype-select"
            value={selectedWasteType}
            onChange={(e) => setSelectedWasteType(e.target.value)}
            aria-label="Filter tasks by waste category"
            className="w-full bg-surface-muted border border-surface-border rounded-xl px-3 py-2 text-xs md:text-sm text-gray-300 focus:outline-none focus:border-primary-500/50"
          >
            <option value="">All Categories</option>
            <option value="PLASTIC">Plastic Waste</option>
            <option value="ORGANIC">Organic / Wet</option>
            <option value="HAZARDOUS">Hazardous / Bio</option>
            <option value="BULK">Bulk / Debris</option>
            <option value="OTHER">General Waste</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-5 border border-red-500/30 bg-red-500/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-300">Unable to load tasks from server</p>
              <p className="text-xs text-red-400 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchTasks}
            className="px-3.5 py-1.5 rounded-lg border border-red-500/40 hover:bg-red-500/20 text-red-300 text-xs font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card p-12 flex flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          <p className="text-sm font-medium text-gray-300">Loading authorized worker tasks…</p>
          <p className="text-xs text-gray-500">Querying real-time assignment records from PostgreSQL</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && tasks.length === 0 && (
        <EmptyState
          activeTab={activeTab}
          hasFilters={Boolean(searchQuery || selectedSeverity || selectedWasteType)}
          onClearFilters={() => {
            setSearchQuery("");
            setSelectedSeverity("");
            setSelectedWasteType("");
          }}
        />
      )}

      {/* Tasks list */}
      {!loading && !error && tasks.length > 0 && (
        <div className="space-y-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isActionLoading={Boolean(actionLoading[task.id])}
              onStart={() => handleStartTask(task)}
              onOpenComplete={() => setCompletingTask(task)}
              onOpenProgress={() => setProgressTask(task)}
              onInspect={() => setInspectTask(task)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && pagination.pages > 1 && (
        <div className="flex items-center justify-between px-2 pt-2">
          <span className="text-xs text-gray-400">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} tasks
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set("page", String(pagination.page - 1));
                setSearchParams(next);
              }}
              className="px-3 py-1.5 rounded-lg border border-surface-border text-xs text-gray-300 disabled:opacity-40 hover:bg-surface-muted transition-colors"
            >
              Previous
            </button>
            <span className="text-xs font-semibold text-primary-400 px-2">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set("page", String(pagination.page + 1));
                setSearchParams(next);
              }}
              className="px-3 py-1.5 rounded-lg border border-surface-border text-xs text-gray-300 disabled:opacity-40 hover:bg-surface-muted transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Complete modal */}
      {completingTask && (
        <CompleteTaskModal
          task={completingTask}
          isLoading={Boolean(actionLoading[completingTask.id])}
          onClose={() => setCompletingTask(null)}
          onSubmit={handleCompleteSubmit}
        />
      )}

      {/* Progress modal */}
      {progressTask && (
        <ProgressNoteModal
          task={progressTask}
          isLoading={Boolean(actionLoading[progressTask.id])}
          onClose={() => setProgressTask(null)}
          onSubmit={handleProgressSubmit}
        />
      )}

      {/* Detail modal */}
      {inspectTask && (
        <TaskDetailModal
          task={inspectTask}
          onClose={() => setInspectTask(null)}
          onStart={() => {
            const t = inspectTask;
            setInspectTask(null);
            handleStartTask(t);
          }}
          onOpenComplete={() => {
            const t = inspectTask;
            setInspectTask(null);
            setCompletingTask(t);
          }}
        />
      )}
    </div>
  );
}

// Task card
function TaskCard({ task, isActionLoading, onStart, onOpenComplete, onOpenProgress, onInspect }) {
  const priority = PRIORITY_CONFIG[task.severity] || PRIORITY_CONFIG.MEDIUM;
  const waste = WASTE_TYPE_CONFIG[task.waste_type] || WASTE_TYPE_CONFIG.OTHER;

  // Status mapping
  const isPending = ["PENDING", "SUBMITTED", "ASSIGNED"].includes(task.status);
  const isInProgress = task.status === "IN_PROGRESS";
  const isCompleted = ["RESOLVED", "COMPLETED", "CLOSED", "VERIFIED"].includes(task.status);

  // Status display badge
  const statusBadge = useMemo(() => {
    if (isInProgress) {
      return {
        label: "In Progress",
        cls: "bg-blue-500/15 border-blue-500/30 text-blue-400",
        icon: Play,
      };
    }
    if (isCompleted) {
      return {
        label: "Completed",
        cls: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
        icon: CheckCircle2,
      };
    }
    return {
      label: "Pending Start",
      cls: "bg-amber-500/15 border-amber-500/30 text-amber-400",
      icon: Clock,
    };
  }, [isInProgress, isCompleted]);

  const StatusIcon = statusBadge.icon;
  const shortId = task.id ? task.id.split("-")[0] : "—";
  const mapUrl = task.latitude && task.longitude
    ? `https://www.google.com/maps?q=${task.latitude},${task.longitude}`
    : null;

  // Calculated SLA deadline if not explicitly defined in DB
  const targetDeadline = useMemo(() => {
    if (task.deadline) return new Date(task.deadline);
    const baseTime = task.assigned_at
      ? new Date(task.assigned_at)
      : task.created_at
      ? new Date(task.created_at)
      : null;
    if (!baseTime || isNaN(baseTime.getTime())) return null;
    const hoursToAdd = task.severity === "HIGH" ? 24 : task.severity === "MEDIUM" ? 48 : 72;
    return new Date(baseTime.getTime() + hoursToAdd * 60 * 60 * 1000);
  }, [task.deadline, task.assigned_at, task.created_at, task.severity]);

  return (
    <div
      id={`task-card-${task.id}`}
      className={`card p-4 md:p-5 transition-all duration-200 hover:border-primary-500/30 ${
        isInProgress ? "border-l-4 border-l-blue-400" : isCompleted ? "border-l-4 border-l-emerald-400" : "border-l-4 border-l-amber-400"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        {/* Left Column: Task details */}
        <div className="flex-1 min-w-0 space-y-2.5">
          {/* Header Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-bold ${statusBadge.cls}`}>
              <StatusIcon className="w-3 h-3" />
              {statusBadge.label}
            </span>

            <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold ${priority.badgeCls}`}>
              {priority.label}
            </span>

            <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold ${waste.color}`}>
              {waste.label}
            </span>

            {task.assignment_mode === "AUTO_NEAREST" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-primary-500/30 bg-primary-500/10 text-primary-400 text-xs font-bold">
                <Zap className="w-3 h-3" />
                Auto-Nearest
              </span>
            )}

            {task.assignment_distance_meters != null && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-surface-border bg-surface-muted text-gray-300 text-xs">
                <Navigation className="w-3 h-3 text-primary-400" />
                {task.assignment_distance_meters >= 1000
                  ? `${(task.assignment_distance_meters / 1000).toFixed(1)} km`
                  : `${task.assignment_distance_meters} m`}
              </span>
            )}


            <div className="flex items-center gap-1.5 ml-auto md:ml-0 font-mono text-xs">
              <span className="text-gray-300 bg-surface-muted px-2 py-0.5 rounded border border-surface-border font-medium">
                Task #{shortId}
              </span>
              <span className="text-gray-500 text-[11px]" title={`Full Complaint/Report ID: ${task.id}`}>
                (Report #{shortId})
              </span>
            </div>
          </div>

          {/* Title and Description */}
          <div>
            <h3
              onClick={onInspect}
              className="text-base md:text-lg font-display font-semibold text-white hover:text-primary-400 transition-colors cursor-pointer"
            >
              {task.title}
            </h3>
            {task.description && (
              <p className="text-gray-400 text-xs md:text-sm mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>

          {/* Location & Metadata */}
          <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-gray-400">
            {/* Address */}
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary-400 shrink-0" />
              <span className="truncate max-w-xs text-gray-300">
                {task.address || `${task.latitude?.toFixed(4)}, ${task.longitude?.toFixed(4)}`}
              </span>
            </div>

            {/* Ward / Area */}
            {(task.ward_name || task.municipality_name) && (
              <span className="text-gray-400">
                {[task.ward_name ? `Ward: ${task.ward_name}` : null, task.municipality_name]
                  .filter(Boolean)
                  .join(" • ")}
              </span>
            )}

            {/* Created / Assigned Date */}
            <div className="flex items-center gap-1 text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>
                {task.assigned_at
                  ? `Assigned ${new Date(task.assigned_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                  : task.created_at
                  ? `Created ${new Date(task.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                  : null}
              </span>
            </div>

            {/* Target SLA Deadline */}
            {targetDeadline && (
              <div className="flex items-center gap-1 text-amber-400/90 font-medium" title={`Target SLA Deadline: ${targetDeadline.toLocaleString("en-IN")}`}>
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Due: {targetDeadline.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
              </div>
            )}

            {/* Map Link */}
            {mapUrl && (
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300 font-medium transition-colors"
              >
                <span>Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Completed Resolution Note or Evidence Snapshot */}
          {isCompleted && (
            <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
              <div className="flex items-center justify-between text-emerald-400 font-semibold mb-1">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Resolution Completed
                </span>
                {task.resolved_at && (
                  <span className="text-gray-400 font-normal">
                    {new Date(task.resolved_at).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
              {task.resolution_note && (
                <p className="text-gray-300 whitespace-pre-line text-xs font-sans">
                  {task.resolution_note}
                </p>
              )}
            </div>
          )}

          {/* In Progress ongoing notes */}
          {isInProgress && task.resolution_note && (
            <div className="mt-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs">
              <span className="font-semibold text-blue-400 block mb-0.5">Progress Notes:</span>
              <p className="text-gray-300 whitespace-pre-line text-xs">{task.resolution_note}</p>
            </div>
          )}
        </div>

        {/* Right Column: Photos Thumbnail & Action Buttons */}
        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-3 shrink-0">
          {/* Thumbnail preview if available */}
          {(task.image_url || task.resolution_image_url) && (
            <button
              onClick={onInspect}
              className="relative w-16 h-16 rounded-xl overflow-hidden border border-surface-border bg-surface-muted hover:border-primary-500/50 transition-colors shrink-0 group"
              title="Click to view photo evidence"
            >
              <img
                src={task.resolution_image_url || task.image_url}
                alt="Waste report evidence"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </button>
          )}

          {/* Contextual Action Buttons */}
          <div className="flex items-center gap-2">
            {/* PENDING ACTIONS */}
            {isPending && (
              <button
                id={`start-task-${task.id}`}
                onClick={onStart}
                disabled={isActionLoading}
                className="btn-primary !px-4 !py-2 !text-xs !rounded-xl disabled:opacity-50"
              >
                {isActionLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Starting…</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Task</span>
                  </>
                )}
              </button>
            )}

            {/* IN PROGRESS ACTIONS */}
            {isInProgress && (
              <>
                <button
                  id={`progress-task-${task.id}`}
                  onClick={onOpenProgress}
                  disabled={isActionLoading}
                  className="px-3 py-2 rounded-xl bg-surface-muted hover:bg-surface-border border border-surface-border text-gray-300 hover:text-white text-xs font-semibold transition-colors disabled:opacity-50"
                  title="Add update or progress notes"
                >
                  <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
                  <span>Update</span>
                </button>

                <button
                  id={`complete-task-${task.id}`}
                  onClick={onOpenComplete}
                  disabled={isActionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-glow-sm transition-all hover:-translate-y-0.5 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Complete</span>
                </button>
              </>
            )}

            {/* COMPLETED ACTIONS */}
            {isCompleted && (
              <button
                onClick={onInspect}
                className="px-3 py-2 rounded-xl bg-surface-muted hover:bg-surface-border border border-surface-border text-gray-300 hover:text-white text-xs font-medium transition-colors"
              >
                <span>View Proof</span>
                <ChevronRight className="w-3.5 h-3.5 inline ml-1" />
              </button>
            )}

            {/* Quick Details inspector icon */}
            <button
              onClick={onInspect}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-surface-muted transition-colors"
              title="View full task details"
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty state
function EmptyState({ activeTab, hasFilters, onClearFilters }) {
  const content = hasFilters
    ? {
        title: "No matching tasks found",
        desc: "No tasks match your current search query or filter criteria. Try clearing them to see all assigned tasks.",
      }
    : {
        pending: {
          title: "No pending tasks found",
          desc: "You're all caught up! There are no unstarted tasks waiting in your queue.",
        },
        in_progress: {
          title: "No tasks in progress",
          desc: "You don't have any active tasks running. Start a pending task to begin your cleanup run.",
        },
        completed: {
          title: "No completed tasks yet",
          desc: "Tasks you successfully clean and mark complete will appear here with verification timestamps.",
        },
        all: {
          title: "No tasks assigned",
          desc: "You currently have no tasks assigned to your worker profile in this municipality.",
        },
      }[activeTab] || {
        title: "No tasks found",
        desc: "Try adjusting your search query or filters.",
      };

  return (
    <div className="card p-10 md:p-14 flex flex-col items-center justify-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-surface-muted border border-surface-border flex items-center justify-center mb-4 text-gray-400">
        <ClipboardList className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-display font-semibold text-white mb-1.5">{content.title}</h3>
      <p className="text-gray-400 text-xs md:text-sm max-w-sm leading-relaxed mb-4">
        {content.desc}
      </p>

      {hasFilters && (
        <button
          onClick={onClearFilters}
          className="text-xs text-primary-400 hover:text-primary-300 font-semibold border border-primary-500/30 px-3.5 py-1.5 rounded-lg transition-colors"
        >
          Clear Active Filters
        </button>
      )}
    </div>
  );
}

// ─── Camera capture helper used inside CompleteTaskModal ──────────────────────
function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);

  // Stop any active camera stream
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const startCamera = async () => {
      setCameraError("");
      setCameraReady(false);

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Your browser does not support camera access. Please use Chrome or Safari on your mobile device.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().then(() => setCameraReady(true)).catch(() => {});
          };
        }
      } catch (err) {
        if (cancelled) return;
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setCameraError("Camera permission denied. Please allow camera access in your browser settings and try again.");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setCameraError("No camera found on this device. Please use a device with a rear camera.");
        } else if (err.name === "NotReadableError") {
          setCameraError("Camera is in use by another app. Please close other apps using the camera and try again.");
        } else {
          setCameraError(`Camera error: ${err.message || "Unknown error occurred."}`);
        }
      }
    };

    startCamera();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current || !cameraReady) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

    // Check ≤ 5 MB (base64 overhead: multiply by 0.75)
    const approxBytes = dataUrl.length * 0.75;
    if (approxBytes > 5 * 1024 * 1024) {
      setCameraError("Captured image exceeds 5 MB. Please move to a brighter area or try again.");
      return;
    }

    stopStream();
    onCapture(dataUrl);
  };

  const handleCancel = () => {
    stopStream();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      {/* Camera toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm shrink-0">
        <span className="text-white text-sm font-semibold flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary-400" />
          Take Cleanup Photo
        </span>
        <button
          type="button"
          onClick={handleCancel}
          className="text-gray-300 hover:text-white transition-colors p-1"
          aria-label="Close camera"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Viewfinder or error */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        {cameraError ? (
          <div className="flex flex-col items-center gap-4 p-8 text-center max-w-sm">
            <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-400" />
            </div>
            <p className="text-red-300 text-sm leading-relaxed">{cameraError}</p>
            <button
              type="button"
              onClick={handleCancel}
              className="px-5 py-2.5 rounded-xl bg-surface-card border border-surface-border text-gray-300 text-sm font-medium hover:text-white transition-colors"
            >
              Go Back
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(1)" }}
            />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
              </div>
            )}
            {/* Corner guide brackets */}
            {cameraReady && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-48 relative">
                  <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl" />
                  <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr" />
                  <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl" />
                  <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br" />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Capture button */}
      {!cameraError && (
        <div className="flex items-center justify-center py-6 bg-black/80 backdrop-blur-sm shrink-0">
          <button
            type="button"
            onClick={handleCapture}
            disabled={!cameraReady}
            className="w-16 h-16 rounded-full bg-white disabled:opacity-40 hover:scale-105 active:scale-95 transition-transform shadow-lg flex items-center justify-center"
            aria-label="Capture photo"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Complete task modal ───────────────────────────────────────────────────────
function CompleteTaskModal({ task, isLoading, onClose, onSubmit }) {
  const [resolutionNote, setResolutionNote] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState("");
  const [formError, setFormError] = useState("");
  const [showCamera, setShowCamera] = useState(false);

  // Stop any lingering camera stream when this modal unmounts
  const handleModalClose = () => {
    setShowCamera(false);
    onClose();
  };

  const handleCaptured = (dataUrl) => {
    setShowCamera(false);
    setImagePreview(dataUrl);
    setImageBase64(dataUrl);
    setFormError("");
  };

  const handleRemovePhoto = () => {
    setImagePreview(null);
    setImageBase64("");
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!resolutionNote.trim() || resolutionNote.trim().length < 3) {
      setFormError("Please provide a note describing the resolution (at least 3 characters).");
      return;
    }

    onSubmit({
      resolution_note: resolutionNote.trim(),
      resolution_image_url: imageBase64 || null,
    });
  };

  return (
    <>
      {/* Camera fullscreen overlay */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCaptured}
          onClose={() => setShowCamera(false)}
        />
      )}

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
        <div className="card w-full max-w-lg bg-surface-card border border-surface-border overflow-hidden shadow-2xl animate-scale-up">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-display font-semibold text-white">Mark Task Completed</h2>
                <p className="text-xs text-gray-400">Submit resolution notes and photo evidence</p>
              </div>
            </div>
            <button
              onClick={handleModalClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Form */}
          <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
            <div className="p-3 rounded-xl bg-surface-muted border border-surface-border text-xs">
              <span className="text-gray-400 block mb-0.5">Task:</span>
              <span className="font-semibold text-white">{task.title}</span>
              {task.address && <span className="block text-gray-400 mt-0.5">{task.address}</span>}
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
                {formError}
              </div>
            )}

            {/* Resolution Note */}
            <div>
              <label className="block text-xs font-semibold text-gray-200 mb-1">
                Resolution Note <span className="text-red-400">*</span>
              </label>
              <textarea
                id="resolution-note-input"
                rows={3}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="E.g., Cleared all plastic waste from the roadside, sanitized the spot, and transported waste to sorting station."
                className="w-full bg-surface-muted border border-surface-border rounded-xl p-3 text-xs md:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 resize-none"
              />
            </div>

            {/* Camera-only Photo Evidence */}
            <div>
              <label className="block text-xs font-semibold text-gray-200 mb-1">
                Resolution Photo Evidence <span className="text-gray-500">(Optional)</span>
              </label>

              {imagePreview ? (
                /* ── Preview state ── */
                <div className="relative rounded-xl overflow-hidden border border-surface-border bg-surface-muted">
                  <img
                    src={imagePreview}
                    alt="Cleanup evidence preview"
                    className="w-full max-h-52 object-cover"
                  />
                  {/* Overlay action strip */}
                  <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-3 py-2 bg-black/60 backdrop-blur-sm">
                    <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Photo captured
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCamera(true)}
                        className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Retake
                      </button>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Camera trigger state ── */
                <button
                  type="button"
                  id="open-camera-btn"
                  onClick={() => setShowCamera(true)}
                  className="w-full border-2 border-dashed border-surface-border hover:border-primary-500/50 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all bg-surface-muted/50 text-center group"
                >
                  <div className="w-10 h-10 rounded-full bg-primary-500/15 border border-primary-500/20 flex items-center justify-center mb-2 group-hover:bg-primary-500/25 transition-colors">
                    <Camera className="w-5 h-5 text-primary-400" />
                  </div>
                  <span className="text-xs text-gray-200 font-semibold">Take Cleanup Photo</span>
                  <span className="text-[11px] text-gray-500 mt-0.5">
                    Rear camera • JPEG up to 5 MB
                  </span>
                </button>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleModalClose}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                id="confirm-complete-btn"
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-glow-sm transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting…</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Submit & Complete</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// Progress note modal
function ProgressNoteModal({ task, isLoading, onClose, onSubmit }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!note.trim() || note.trim().length < 2) {
      setError("Please write a short progress update.");
      return;
    }
    onSubmit(note.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-md bg-surface-card border border-surface-border p-6 shadow-2xl animate-scale-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-white text-sm">Add Progress Note</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-xs text-red-400">{error}</p>}
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="E.g., Arrived at location; waste truck on the way; approximately 30 mins remaining."
            className="w-full bg-surface-muted border border-surface-border rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 resize-none"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-xs text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary !px-4 !py-1.5 !text-xs !rounded-xl"
            >
              {isLoading ? "Saving…" : "Save Note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Task detail modal
function TaskDetailModal({ task, onClose, onStart, onOpenComplete }) {
  const isPending = ["PENDING", "SUBMITTED", "ASSIGNED"].includes(task.status);
  const isInProgress = task.status === "IN_PROGRESS";
  const mapUrl = task.latitude && task.longitude
    ? `https://www.google.com/maps?q=${task.latitude},${task.longitude}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-2xl bg-surface-card border border-surface-border max-h-[90vh] flex flex-col shadow-2xl animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div>
            <span className="text-xs font-mono text-gray-400">ID: {task.id}</span>
            <h2 className="text-lg font-display font-bold text-white mt-0.5">{task.title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-surface-muted border border-surface-border">
              <span className="text-[11px] text-gray-400 uppercase font-semibold">Status</span>
              <p className="text-xs font-bold text-primary-400 mt-0.5">{task.status}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-muted border border-surface-border">
              <span className="text-[11px] text-gray-400 uppercase font-semibold">Priority</span>
              <p className="text-xs font-bold text-white mt-0.5">{task.severity}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-muted border border-surface-border">
              <span className="text-[11px] text-gray-400 uppercase font-semibold">Waste Category</span>
              <p className="text-xs font-bold text-white mt-0.5">{task.waste_type}</p>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <span className="text-xs font-semibold text-gray-300 block mb-1">Issue Description</span>
              <p className="text-xs text-gray-400 leading-relaxed p-3 rounded-xl bg-surface-muted border border-surface-border">
                {task.description}
              </p>
            </div>
          )}

          {/* Location Information */}
          <div>
            <span className="text-xs font-semibold text-gray-300 block mb-1">Location Details</span>
            <div className="p-3.5 rounded-xl bg-surface-muted border border-surface-border space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
                <span className="text-white font-medium">{task.address || "No street address recorded"}</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-gray-400 text-[11px] pl-6">
                {task.ward_name && <span>Ward: {task.ward_name} {task.ward_number ? `(#${task.ward_number})` : ""}</span>}
                {task.municipality_name && <span>Municipality: {task.municipality_name}</span>}
                {task.latitude && task.longitude && (
                  <span className="font-mono">
                    {task.latitude.toFixed(6)}, {task.longitude.toFixed(6)}
                  </span>
                )}
                {mapUrl && (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary-400 hover:text-primary-300 font-semibold inline-flex items-center gap-1"
                  >
                    Open in Google Maps <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Citizen Reporter Info if present */}
          {task.citizen_name && (
            <div>
              <span className="text-xs font-semibold text-gray-300 block mb-1">Reported By</span>
              <div className="p-3 rounded-xl bg-surface-muted border border-surface-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-primary-400" />
                  <span className="text-white font-medium">{task.citizen_name}</span>
                </div>
                {task.citizen_phone && (
                  <a
                    href={`tel:${task.citizen_phone}`}
                    className="text-gray-400 hover:text-primary-400 flex items-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{task.citizen_phone}</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Photo Evidence (Before & After comparison) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {task.image_url && (
              <div>
                <span className="text-xs font-semibold text-gray-300 block mb-1">
                  Initial Report Photo (Before)
                </span>
                <div className="rounded-xl overflow-hidden border border-surface-border bg-surface-muted h-48">
                  <img src={task.image_url} alt="Report Photo" className="w-full h-full object-cover" />
                </div>
              </div>
            )}

            {task.resolution_image_url && (
              <div>
                <span className="text-xs font-semibold text-emerald-400 block mb-1">
                  Resolution Proof Photo (After)
                </span>
                <div className="rounded-xl overflow-hidden border border-emerald-500/30 bg-surface-muted h-48">
                  <img src={task.resolution_image_url} alt="Resolution Proof" className="w-full h-full object-cover" />
                </div>
              </div>
            )}
          </div>

          {/* Resolution notes */}
          {task.resolution_note && (
            <div>
              <span className="text-xs font-semibold text-gray-300 block mb-1">Activity & Resolution Log</span>
              <div className="p-3 rounded-xl bg-surface-muted border border-surface-border text-xs text-gray-300 whitespace-pre-line font-mono">
                {task.resolution_note}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-border bg-surface-muted/30">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white">
            Close
          </button>
          <div className="flex items-center gap-2">
            {isPending && (
              <button onClick={onStart} className="btn-primary !px-4 !py-2 !text-xs !rounded-xl">
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start This Task</span>
              </button>
            )}
            {isInProgress && (
              <button
                onClick={onOpenComplete}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                <Check className="w-3.5 h-3.5 inline mr-1" />
                <span>Complete Task</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
