import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  CheckCheck,
  ExternalLink,
  Loader2,
  MessageSquare,
  Users,
  Zap,
  Check,
} from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";

// Map notification types to corresponding visual config
const TYPE_CONFIG = {
  COMPLAINT_SUBMITTED: { icon: FileText, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  NEW_COMPLAINT:       { icon: FileText, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  COMPLAINT_ASSIGNED:  { icon: UserCheck, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  TASK_OFFER:          { icon: UserCheck, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  TASK_ACCEPTED:       { icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  TASK_REJECTED:       { icon: AlertTriangle, color: "text-red-400 bg-red-500/10 border-red-500/20" },
  TASK_STARTED:        { icon: Clock, color: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
  PROGRESS_UPDATE:     { icon: MessageSquare, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  TASK_COMPLETED:      { icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  COMPLAINT_VERIFIED:  { icon: ShieldCheck, color: "text-teal-400 bg-teal-500/10 border-teal-500/20" },
  REWORK_REQUESTED:    { icon: RotateCcw, color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  INCOMPLETE_REPORT:   { icon: AlertTriangle, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  COMMENT_ADDED:       { icon: MessageSquare, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
  WORKER_REGISTERED:   { icon: Users, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  WORKER_APPROVED:     { icon: ShieldCheck, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  WORKER_REJECTED:     { icon: AlertTriangle, color: "text-red-400 bg-red-500/10 border-red-500/20" },
  AVAILABILITY_CHANGED:{ icon: Zap, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  UNASSIGNED_COMPLAINT:{ icon: AlertTriangle, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
};

function formatTimestamp(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotificationsFeed({ role = "citizen" }) {
  const navigate = useNavigate();
  const {
    unreadCount,
    notifications,
    counts,
    pagination,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Reload when tab or page changes
  useEffect(() => {
    fetchNotifications({ tab: activeTab, page: currentPage, limit: 20 });
  }, [activeTab, currentPage, fetchNotifications]);

  const handleOpenRecord = async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const roleAccentColor =
    role === "worker"
      ? "text-primary-400 border-primary-500/30 bg-primary-500/10"
      : role === "admin"
      ? "text-primary-400 border-primary-500/30 bg-primary-500/10"
      : "text-citizen-400 border-citizen-500/30 bg-citizen-500/10";

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 pb-24 lg:pb-8 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${roleAccentColor}`}>
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-gray-400 text-xs md:text-sm mt-1">
            Real-time updates, complaint assignments, and operational alerts
          </p>
        </div>

        {/* Mark all as read action */}
        {unreadCount > 0 && (
          <button
            id="mark-all-notifications-read-btn"
            onClick={markAllAsRead}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-surface-muted hover:bg-surface-border text-gray-300 hover:text-white text-xs font-semibold border border-surface-border transition-all duration-200 cursor-pointer shadow-sm"
          >
            <CheckCheck className="w-4 h-4 text-emerald-400" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex items-center gap-2 border-b border-surface-border/60 pb-3">
        {[
          { id: "all", label: "All", count: counts.all },
          { id: "unread", label: "Unread", count: counts.unread },
          { id: "read", label: "Read", count: counts.read },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? "bg-surface-card text-white border border-surface-border shadow-sm"
                  : "text-gray-400 hover:text-gray-200 hover:bg-surface-muted border border-transparent"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? "bg-surface-muted text-gray-200" : "bg-surface-border/50 text-gray-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Notifications List / States ── */}
      {loading && notifications.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          <p className="text-gray-400 text-sm">Loading notifications…</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center space-y-4 border border-surface-border">
          <div className="w-16 h-16 rounded-2xl bg-surface-muted border border-surface-border flex items-center justify-center text-gray-400">
            <Bell className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-white text-base">All caught up!</h3>
            <p className="text-gray-400 text-xs md:text-sm mt-1 max-w-sm">
              {activeTab === "unread"
                ? "You have no unread notifications right now."
                : "No notifications found in this view. Updates will appear here in real time."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => {
            const typeInfo = TYPE_CONFIG[notif.type] || {
              icon: Bell,
              color: "text-gray-400 bg-gray-500/10 border-gray-500/20",
            };
            const Icon = typeInfo.icon;
            const isUnread = !notif.is_read;

            return (
              <div
                key={notif.id}
                className={`group relative rounded-2xl p-4 md:p-5 transition-all duration-200 border ${
                  isUnread
                    ? "bg-surface-card border-surface-border hover:border-surface-border/80 shadow-md"
                    : "bg-surface-card/40 border-surface-border/40 hover:bg-surface-card/70"
                }`}
              >
                <div className="flex items-start gap-3.5 md:gap-4">
                  {/* Icon badge */}
                  <div
                    className={`w-10 h-10 md:w-11 md:h-11 rounded-xl shrink-0 flex items-center justify-center border ${typeInfo.color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {isUnread && (
                          <span
                            className="w-2 h-2 rounded-full bg-primary-400 shrink-0 ring-4 ring-primary-400/20"
                            title="Unread"
                          />
                        )}
                        <h4
                          className={`text-sm md:text-base font-semibold leading-snug truncate ${
                            isUnread ? "text-white font-bold" : "text-gray-300"
                          }`}
                        >
                          {notif.title}
                        </h4>
                      </div>

                      <span className="text-[11px] md:text-xs text-gray-500 font-medium shrink-0">
                        {formatTimestamp(notif.created_at)}
                      </span>
                    </div>

                    <p className="text-xs md:text-sm text-gray-300 leading-relaxed break-words">
                      {notif.message}
                    </p>

                    {/* Metadata & Actions */}
                    <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface-muted text-gray-400 border border-surface-border">
                          {notif.category || "GENERAL"}
                        </span>
                        {notif.related_entity_type && (
                          <span className="text-[10px] text-gray-500 font-medium">
                            • {notif.related_entity_type}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isUnread && (
                          <button
                            onClick={() => markAsRead(notif.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-surface-muted transition-colors cursor-pointer"
                            title="Mark as read"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Mark read</span>
                          </button>
                        )}

                        {notif.action_url && (
                          <button
                            onClick={() => handleOpenRecord(notif)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-surface-muted hover:bg-surface-border text-gray-200 hover:text-white border border-surface-border transition-all cursor-pointer shadow-sm"
                          >
                            <span>Open Record</span>
                            <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-white" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-surface-border text-xs text-gray-400">
          <span>
            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded-lg bg-surface-card border border-surface-border hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed text-white"
            >
              Previous
            </button>
            <button
              disabled={currentPage >= pagination.pages}
              onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
              className="px-3 py-1 rounded-lg bg-surface-card border border-surface-border hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed text-white"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
