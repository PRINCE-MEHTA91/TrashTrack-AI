import { useState, useEffect } from "react";
import {
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  Navigation,
  MapPin,
  Zap,
  TrendingUp,
  Play,
  Star,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  MOCK_WORKER_STATS,
  MOCK_WORKER_ZONE,
  MOCK_RECENT_ACTIVITY,
  MOCK_ACTIVE_TASK,
} from "../../mocks/workerMockData";

/** ─── Priority badge colours ─── */
const PRIORITY_CONFIG = {
  HIGH:   { label: "High",   className: "bg-red-500/15 text-red-400 border-red-500/30" },
  MEDIUM: { label: "Medium", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  LOW:    { label: "Low",    className: "bg-primary-500/15 text-primary-400 border-primary-500/30" },
};

/** ─── Activity type icons ─── */
const ACTIVITY_ICON = {
  completed: { Icon: CheckCircle2, color: "text-primary-400" },
  assigned:  { Icon: ClipboardList, color: "text-amber-400" },
};

export default function WorkerHomePage() {
  const { user } = useAuth();
  const [stats] = useState(MOCK_WORKER_STATS);        // TODO: replace with real API
  const [zone] = useState(MOCK_WORKER_ZONE);           // TODO: replace with real API
  const [activity] = useState(MOCK_RECENT_ACTIVITY);  // TODO: replace with real API
  const [activeTask] = useState(MOCK_ACTIVE_TASK);    // TODO: replace with real API

  const firstName = user?.full_name?.split(" ")[0] ?? "Worker";
  const greeting  = getGreeting();

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6 space-y-6 max-w-5xl mx-auto">
      {/* ── Welcome Banner ── */}
      <WelcomeBanner
        name={firstName}
        fullName={user?.full_name}
        greeting={greeting}
        zone={zone}
      />

      {/* ── Stats Row ── */}
      <StatsRow stats={stats} />

      {/* ── Active Task Card ── */}
      <ActiveTaskCard task={activeTask} />

      {/* ── Quick Actions + Recent Activity ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <QuickActions />
        <RecentActivity activity={activity} />
      </div>

      {/* ── Performance Summary ── */}
      <PerformanceSummary stats={stats} />
    </div>
  );
}

/* ─────────────────────────────────────────────────── */

function WelcomeBanner({ name, fullName, greeting, zone }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-900/60 via-surface-card to-surface-card border border-primary-500/20 p-6">
      {/* Background glow */}
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-primary-500/10 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-primary-400 text-sm font-semibold mb-1 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            {greeting}
          </p>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-white">
            Welcome back, <span className="text-primary-400">{name}!</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-gray-400 text-sm">
              {zone.name} &bull; {zone.municipality}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
            Worker
          </span>
          <span className="text-xs text-gray-500">{zone.shortCode}</span>
        </div>
      </div>
    </div>
  );
}

function StatsRow({ stats }) {
  const cards = [
    {
      id: "stat-assigned",
      label: "Assigned Today",
      value: stats.todayAssigned,
      icon: ClipboardList,
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      id: "stat-pending",
      label: "Pending",
      value: stats.todayPending,
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      id: "stat-completed",
      label: "Completed",
      value: stats.todayCompleted,
      icon: CheckCircle2,
      color: "text-primary-400",
      bg: "bg-primary-500/10 border-primary-500/20",
    },
    {
      id: "stat-high-priority",
      label: "High Priority",
      value: stats.highPriority,
      icon: AlertTriangle,
      color: "text-red-400",
      bg: "bg-red-500/10 border-red-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {cards.map(({ id, label, value, icon: Icon, color, bg }) => (
        <div key={id} id={id} className="card p-4 flex flex-col gap-3">
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${bg}`}>
            <Icon className={`w-4.5 h-4.5 ${color}`} />
          </div>
          <div>
            <p className="stat-number text-2xl">{value}</p>
            <p className="text-gray-400 text-xs mt-0.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActiveTaskCard({ task }) {
  const priority = PRIORITY_CONFIG[task?.priority] ?? PRIORITY_CONFIG.MEDIUM;

  if (!task) return null;

  return (
    <div className="card p-5 border-l-4 border-l-primary-500">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Active Task</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${priority.className}`}>
              <AlertTriangle className="w-2.5 h-2.5" />
              {priority.label} Priority
            </span>
          </div>
          <h2 className="font-display font-semibold text-white text-lg leading-tight">{task.title}</h2>
        </div>
        <div className="shrink-0 w-10 h-10 rounded-xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary-400" />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mb-4 text-sm">
        <span className="flex items-center gap-1.5 text-gray-400">
          <MapPin className="w-3.5 h-3.5 text-gray-500" />
          {task.location}
        </span>
        <span className="flex items-center gap-1.5 text-gray-400">
          <Clock className="w-3.5 h-3.5 text-gray-500" />
          Est. {task.estimatedDuration}
        </span>
      </div>

      <div className="flex gap-3">
        <button
          id="active-task-start-btn"
          className="btn-primary py-2 text-sm flex-1 justify-center"
        >
          <Play className="w-4 h-4" />
          Start Work
        </button>
        <button
          id="active-task-navigate-btn"
          className="btn-outline py-2 text-sm px-4 justify-center flex items-center gap-2"
        >
          <Navigation className="w-4 h-4" />
          Navigate
        </button>
      </div>
    </div>
  );
}

function QuickActions() {
  const actions = [
    {
      id: "qa-view-tasks",
      label: "View All Tasks",
      desc: "See your assigned task list",
      icon: ClipboardList,
      href: "/worker/tasks",
      color: "from-blue-500/20 to-blue-600/10 border-blue-500/20 hover:border-blue-500/40",
      iconColor: "text-blue-400",
    },
    {
      id: "qa-open-map",
      label: "Open Map",
      desc: "Navigate to task locations",
      icon: MapPin,
      href: "/worker/map",
      color: "from-amber-500/20 to-amber-600/10 border-amber-500/20 hover:border-amber-500/40",
      iconColor: "text-amber-400",
    },
    {
      id: "qa-view-profile",
      label: "My Profile",
      desc: "Update your information",
      icon: Star,
      href: "/worker/profile",
      color: "from-primary-500/20 to-primary-600/10 border-primary-500/20 hover:border-primary-500/40",
      iconColor: "text-primary-400",
    },
  ];

  return (
    <div className="card p-5">
      <h3 className="font-display font-semibold text-white text-sm mb-4 flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary-400" />
        Quick Actions
      </h3>
      <div className="space-y-2.5">
        {actions.map(({ id, label, desc, icon: Icon, href, color, iconColor }) => (
          <a
            key={id}
            id={id}
            href={href}
            className={`flex items-center gap-3.5 p-3 rounded-xl bg-gradient-to-r border transition-all duration-200 hover:-translate-y-0.5 group ${color}`}
          >
            <div className={`w-8 h-8 rounded-lg bg-surface-card flex items-center justify-center shrink-0`}>
              <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{label}</p>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}

function RecentActivity({ activity }) {
  return (
    <div className="card p-5">
      <h3 className="font-display font-semibold text-white text-sm mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary-400" />
        Recent Activity
      </h3>
      {activity.length === 0 ? (
        <div className="py-8 text-center text-gray-500 text-sm">No recent activity.</div>
      ) : (
        <div className="space-y-3">
          {activity.map(({ id, type, description, time, priority }) => {
            const { Icon, color } = ACTIVITY_ICON[type] ?? ACTIVITY_ICON.assigned;
            const p = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.LOW;
            return (
              <div key={id} className="flex gap-3 group">
                <div className={`w-7 h-7 rounded-full bg-surface-muted border border-surface-border flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-300 leading-relaxed">{description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{time}</span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold border ${p.className}`}>
                      {p.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PerformanceSummary({ stats }) {
  const completionRate = stats.todayAssigned > 0
    ? Math.round((stats.todayCompleted / stats.todayAssigned) * 100)
    : 0;

  return (
    <div className="card p-5">
      <h3 className="font-display font-semibold text-white text-sm mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary-400" />
        Today's Performance
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MiniStat label="This Week Completed" value={stats.thisWeekCompleted} suffix="tasks" />
        <MiniStat label="Avg. Resolution Time" value={stats.averageResolutionMin} suffix="min" />
        <MiniStat label="Today's Completion" value={`${completionRate}%`} />
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>Daily progress</span>
          <span>{stats.todayCompleted}/{stats.todayAssigned} tasks</span>
        </div>
        <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all duration-700"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, suffix }) {
  return (
    <div className="bg-surface-muted rounded-xl p-3 border border-surface-border">
      <p className="stat-number text-xl">{value}</p>
      {suffix && <p className="text-primary-400 text-xs font-medium">{suffix}</p>}
      <p className="text-gray-500 text-xs mt-1 leading-tight">{label}</p>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
