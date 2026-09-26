import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  MapPin,
  ChevronRight,
  Bell,
  TrendingUp,
  Leaf,
  ArrowRight,
  Plus,
  Map,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  MOCK_CITIZEN_STATS,
  MOCK_CITIZEN_ZONE,
  MOCK_RECENT_REPORTS,
  MOCK_CITIZEN_NOTIFICATIONS,
} from "../../mocks/citizenMockData";

const STATUS_CONFIG = {
  RESOLVED:    { label: "Resolved",    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  IN_PROGRESS: { label: "In Progress", className: "bg-blue-500/15 text-blue-400 border-blue-500/30",          icon: Clock },
  PENDING:     { label: "Pending",     className: "bg-amber-500/15 text-amber-400 border-amber-500/30",       icon: Clock },
  SUBMITTED:   { label: "Submitted",   className: "bg-gray-500/15 text-gray-400 border-gray-500/30",          icon: FileText },
};

const NOTIFICATION_TYPE_CONFIG = {
  success: { dot: "bg-emerald-400" },
  info:    { dot: "bg-blue-400" },
  warning: { dot: "bg-amber-400" },
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function CitizenHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats]         = useState(MOCK_CITIZEN_STATS);        // TODO: replace with real API
  const [zone]          = useState(MOCK_CITIZEN_ZONE);          // TODO: replace with real API
  const [recentReports] = useState(MOCK_RECENT_REPORTS);       // TODO: replace with real API
  const [notifications] = useState(MOCK_CITIZEN_NOTIFICATIONS); // TODO: replace with real API
  const [showLocationPopup, setShowLocationPopup] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // Check location permission on mount
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        if (result.state === "prompt") {
          setShowLocationPopup(true);
        } else if (result.state === "granted") {
          fetchLocation();
        }
      });
    } else {
      setShowLocationPopup(true); // Fallback if permissions API is not supported
    }
  }, []);

  const fetchLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setShowLocationPopup(false);
        },
        (error) => {
          console.error("Error fetching location:", error);
          setShowLocationPopup(false);
        }
      );
    }
  };

  const firstName = user?.full_name?.split(" ")[0] ?? "Citizen";
  const greeting  = getGreeting();

  return (
    <div className="p-4 md:p-6 pb-28 lg:pb-6 space-y-6 max-w-5xl mx-auto">
      {/* ── Welcome Banner ── */}
      <WelcomeBanner
        name={firstName}
        greeting={greeting}
        zone={zone}
        onReport={() => navigate("/citizen/report")}
      />

      {/* ── Stats Row ── */}
      <StatsRow stats={stats} />

      {/* ── Report Waste CTA (mobile-prominent) ── */}
      <ReportWasteCTA onReport={() => navigate("/citizen/report")} />

      {/* ── Recent Reports + Notification Preview ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentReports reports={recentReports} onViewAll={() => navigate("/citizen/complaints")} />
        <NotificationPreview notifications={notifications} onViewAll={() => navigate("/citizen/notifications")} />
      </div>
      
      {/* ── Location Permission Popup ── */}
      {showLocationPopup && (
        <LocationPermissionPopup 
          onAllow={fetchLocation} 
          onDeny={() => setShowLocationPopup(false)} 
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */

function WelcomeBanner({ name, greeting, zone, onReport }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-citizen-900/60 via-surface-card to-surface-card border border-citizen-500/20 p-6">
      {/* Background glow */}
      <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-citizen-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-citizen-500/5 blur-2xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <p className="text-citizen-400 text-sm font-semibold mb-1 flex items-center gap-1.5">
            <Leaf className="w-3.5 h-3.5" />
            {greeting}
          </p>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-white">
            Welcome, <span className="text-citizen-400">{name}!</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-gray-400 text-sm">
              {zone.name} &bull; {zone.municipality}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-citizen-500/15 border border-citizen-500/30 text-citizen-400 text-xs font-bold">
            Citizen
          </span>
          <button
            id="citizen-home-report-btn"
            onClick={onReport}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-citizen-500 hover:bg-citizen-400 text-white font-semibold text-sm transition-all duration-200 shadow-lg hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            Report Waste
          </button>
        </div>
      </div>
    </div>
  );
}

function StatsRow({ stats }) {
  const cards = [
    {
      id: "citizen-stat-total",
      label: "Total Reports",
      value: stats.totalReports,
      icon: FileText,
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      id: "citizen-stat-pending",
      label: "Pending",
      value: stats.pendingReports,
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      id: "citizen-stat-inprogress",
      label: "In Progress",
      value: stats.inProgressReports,
      icon: TrendingUp,
      color: "text-citizen-400",
      bg: "bg-citizen-500/10 border-citizen-500/20",
    },
    {
      id: "citizen-stat-resolved",
      label: "Resolved",
      value: stats.resolvedReports,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
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
            <p className="stat-number text-2xl">{value}</p>
            <p className="text-gray-400 text-xs mt-0.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportWasteCTA({ onReport }) {
  return (
    <div className="card p-5 border-l-4 border-l-citizen-500 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-center gap-4 flex-1">
        <div className="w-12 h-12 rounded-2xl bg-citizen-500/15 border border-citizen-500/30 flex items-center justify-center shrink-0">
          <AlertCircle className="w-6 h-6 text-citizen-400" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-white text-base">See waste in your area?</h2>
          <p className="text-gray-400 text-sm mt-0.5">
            Report it quickly and we'll get a worker assigned right away.
          </p>
        </div>
      </div>
      <button
        id="citizen-cta-report-btn"
        onClick={onReport}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-citizen-500 hover:bg-citizen-400 text-white font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5 shadow-lg shrink-0"
      >
        Report Now
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function RecentReports({ reports, onViewAll }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-white text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-citizen-400" />
          Recent Reports
        </h3>
        <button
          id="citizen-view-all-reports-btn"
          onClick={onViewAll}
          className="text-xs text-citizen-400 hover:text-citizen-300 font-medium flex items-center gap-1 transition-colors"
        >
          View all
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="py-10 text-center">
          <FileText className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No reports yet.</p>
          <p className="text-gray-600 text-xs mt-1">Your submitted reports will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const status = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.SUBMITTED;
            const StatusIcon = status.icon;
            return (
              <div
                key={report.id}
                id={`citizen-report-${report.id}`}
                className="flex gap-3 p-3 rounded-xl bg-surface-muted border border-surface-border hover:border-citizen-500/30 transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-surface-card border border-surface-border flex items-center justify-center shrink-0 mt-0.5">
                  <StatusIcon className={`w-3.5 h-3.5 ${status.className.split(" ")[1]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-white leading-tight truncate">{report.title}</p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold shrink-0 ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3 h-3 text-gray-500 shrink-0" />
                    <p className="text-xs text-gray-400 truncate">{report.location}</p>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{report.id}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NotificationPreview({ notifications, onViewAll }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-white text-sm flex items-center gap-2">
          <Bell className="w-4 h-4 text-citizen-400" />
          Notifications
        </h3>
        <button
          id="citizen-view-all-notifs-btn"
          onClick={onViewAll}
          className="text-xs text-citizen-400 hover:text-citizen-300 font-medium flex items-center gap-1 transition-colors"
        >
          View all
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="py-10 text-center">
          <Bell className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No notifications.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => {
            const typeConf = NOTIFICATION_TYPE_CONFIG[notif.type] ?? NOTIFICATION_TYPE_CONFIG.info;
            return (
              <div
                key={notif.id}
                id={`citizen-notif-${notif.id}`}
                className={`flex gap-3 p-3 rounded-xl border transition-colors ${
                  notif.read
                    ? "bg-surface-muted border-surface-border"
                    : "bg-citizen-500/5 border-citizen-500/20"
                }`}
              >
                <div className="relative shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full">
                    {!notif.read && (
                      <span className={`block w-2 h-2 rounded-full ${typeConf.dot}`} />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold leading-tight ${notif.read ? "text-gray-300" : "text-white"}`}>
                    {notif.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{notif.message}</p>
                  <p className="text-xs text-gray-600 mt-1">{notif.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LocationPermissionPopup({ onAllow, onDeny }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="w-12 h-12 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center mb-4">
          <Map className="w-6 h-6 text-blue-400" />
        </div>
        <h3 className="text-xl font-display font-bold text-white mb-2">Allow Location Access</h3>
        <p className="text-sm text-gray-400 mb-6">
          We need your location to automatically detect your zone and show relevant waste reports in your area.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onAllow}
            className="w-full py-2.5 rounded-xl bg-citizen-500 hover:bg-citizen-400 text-white font-semibold text-sm transition-colors"
          >
            Allow Access
          </button>
          <button
            onClick={onDeny}
            className="w-full py-2.5 rounded-xl bg-surface-muted hover:bg-surface-border text-gray-300 font-semibold text-sm transition-colors"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}
