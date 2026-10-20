import { useState, useEffect, useCallback } from "react";
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
  Star,
  Loader2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "../../context/LocationContext";
import { LocationStatus, LocationSavedBadge } from "../../components/common/LocationStatus";
import { LocationMap } from "../../components/common/LocationMap";
import { API_URL } from "../../config/api.js";

// Priority badge colours
const PRIORITY_CONFIG = {
  HIGH:   { label: "High",   className: "bg-red-500/15 text-red-400 border-red-500/30" },
  MEDIUM: { label: "Medium", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  LOW:    { label: "Low",    className: "bg-primary-500/15 text-primary-400 border-primary-500/30" },
};

export default function WorkerHomePage() {
  const { user, getToken } = useAuth();
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    status: locStatus,
    location: userLocation,
    showPrompt,
    errorMessage: locError,
    requestLocation,
    refreshLocation,
    retry: retryLocation,
  } = useLocation();

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) { setLoading(false); return; }
      const res = await fetch(`${API_URL}/worker/availability`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to load worker dashboard.");
      }
      const json = await res.json();
      setDashData(json);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const firstName = user?.full_name?.split(" ")[0] ?? "Worker";
  const greeting  = getGreeting();

  const stats = dashData ? {
    isActive:      dashData.is_active ?? false,
    todaySessions: dashData.today_summary?.session_count ?? 0,
    todayDuration: dashData.today_summary?.total_formatted ?? "0 mins",
    verStatus:     dashData.verification_status ?? "—",
  } : null;

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6 space-y-6 max-w-5xl mx-auto">
      <WelcomeBanner
        name={firstName}
        greeting={greeting}
        location={userLocation}
        locationSaved={locStatus === "saved"}
        onRequestLocation={requestLocation}
        isActive={stats?.isActive}
      />

      <LocationStatus
        status={locStatus}
        errorMessage={locError}
        showPrompt={showPrompt}
        onAllow={requestLocation}
        onRetry={retryLocation}
        accentClass="bg-primary-500 hover:bg-primary-400"
      />

      <div id="worker-location-map" className="card overflow-hidden">
        <div className="flex items-center gap-2 px-5 pt-5 pb-3">
          <MapPin className="w-4 h-4 text-primary-400" />
          <h3 className="font-display font-semibold text-white text-sm">Your Location</h3>
        </div>
        <div className="px-3 pb-3">
          <LocationMap
            status={locStatus}
            location={userLocation}
            errorMessage={locError}
            showPrompt={showPrompt}
            onAllow={requestLocation}
            onRetry={retryLocation}
            onRefresh={refreshLocation}
            accentClass="bg-primary-500 hover:bg-primary-400"
            title="You are here"
            className="h-56 md:h-64"
          />
        </div>
      </div>

      {loading && (
        <div className="card p-8 flex items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
          <span className="text-gray-400 text-sm">Loading your dashboard…</span>
        </div>
      )}

      {!loading && error && (
        <div className="card p-5 border border-red-500/30 bg-red-500/10 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-300">Unable to load dashboard</p>
            <p className="text-xs text-red-400 mt-0.5">{error}</p>
          </div>
          <button
            onClick={fetchDashboard}
            className="text-xs text-primary-400 hover:text-primary-300 font-medium border border-primary-500/30 px-3 py-1.5 rounded-lg"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && stats && <DutyStatsRow stats={stats} dashData={dashData} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <QuickActions />
        <AvailabilitySummary dashData={dashData} loading={loading} />
      </div>

      {!loading && !error && dashData && <AvailabilityDetails dashData={dashData} />}
    </div>
  );
}

function WelcomeBanner({ name, greeting, location, locationSaved, onRequestLocation, isActive }) {
  const locationLabel = location
    ? `${location.latitude.toFixed(4)}°N, ${location.longitude.toFixed(4)}°E`
    : "Current Location";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-900/60 via-surface-card to-surface-card border border-primary-500/20 p-6">
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
          <button
            id="worker-home-location-btn"
            onClick={onRequestLocation}
            title="Click to refresh your location"
            className="flex items-center gap-2 mt-2 cursor-pointer hover:bg-white/5 px-1 py-0.5 -ml-1 rounded-lg transition-colors"
          >
            <Navigation className="w-3.5 h-3.5 text-primary-400 shrink-0" />
            <span className="text-gray-400 text-sm font-mono">{locationLabel}</span>
          </button>
          <div className="mt-1"><LocationSavedBadge visible={locationSaved} /></div>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
            Worker
          </span>
          {isActive !== undefined && (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
              isActive
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                : "bg-surface-muted border-surface-border text-gray-400"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-400 animate-ping" : "bg-gray-500"}`} />
              {isActive ? "On Duty" : "Off Duty"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function DutyStatsRow({ stats, dashData }) {
  const cards = [
    {
      id: "stat-duty-status",
      label: "Duty Status",
      value: stats.isActive ? "Active" : "Inactive",
      icon: Zap,
      color: stats.isActive ? "text-emerald-400" : "text-gray-400",
      bg: stats.isActive ? "bg-emerald-500/10 border-emerald-500/20" : "bg-surface-muted border-surface-border",
    },
    {
      id: "stat-sessions-today",
      label: "Sessions Today",
      value: stats.todaySessions,
      icon: ClipboardList,
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      id: "stat-time-today",
      label: "Active Time Today",
      value: stats.todayDuration,
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      id: "stat-verification",
      label: "Verification",
      value: dashData?.verification_status ?? "—",
      icon: CheckCircle2,
      color: dashData?.verification_status === "APPROVED" ? "text-primary-400" : "text-amber-400",
      bg: dashData?.verification_status === "APPROVED"
        ? "bg-primary-500/10 border-primary-500/20"
        : "bg-amber-500/10 border-amber-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {cards.map(({ id, label, value, icon: Icon, color, bg }) => (
        <div key={id} id={id} className="card p-4 flex flex-col gap-3">
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${bg}`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <div>
            <p className="font-bold text-xl text-white">{value}</p>
            <p className="text-gray-400 text-xs mt-0.5">{label}</p>
          </div>
        </div>
      ))}
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
            <div className="w-8 h-8 rounded-lg bg-surface-card flex items-center justify-center shrink-0">
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

function AvailabilitySummary({ dashData, loading }) {
  if (loading) {
    return (
      <div className="card p-5 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
      </div>
    );
  }
  const session = dashData?.current_session;
  return (
    <div className="card p-5">
      <h3 className="font-display font-semibold text-white text-sm mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary-400" />
        Current Session
      </h3>
      {session ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Session started</span>
            <span className="text-white font-mono font-semibold">{session.started_at_formatted}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Elapsed time</span>
            <span className="text-emerald-400 font-mono font-semibold">{session.elapsed_formatted}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Municipality</span>
            <span className="text-white text-xs">{dashData?.municipality_name ?? "—"}</span>
          </div>
        </div>
      ) : (
        <div className="py-6 text-center">
          <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No active session.</p>
          <p className="text-gray-600 text-xs mt-1">Go active to start tracking your duty hours.</p>
        </div>
      )}
    </div>
  );
}

function AvailabilityDetails({ dashData }) {
  const summary = dashData?.today_summary;
  if (!summary) return null;
  return (
    <div className="card p-5">
      <h3 className="font-display font-semibold text-white text-sm mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary-400" />
        Today's Duty Summary
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MiniStat label="Sessions Today" value={summary.session_count} suffix="sessions" />
        <MiniStat label="Total Active Time" value={summary.total_formatted} />
        <MiniStat label="Verification Status" value={dashData?.verification_status ?? "—"} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, suffix }) {
  return (
    <div className="bg-surface-muted rounded-xl p-3 border border-surface-border">
      <p className="font-bold text-xl text-white">{value}</p>
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
