import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate, Outlet, useLocation as useRouterLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Landmark,
  BarChart3,
  Settings,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Bell,
  Trash2,
  Building2,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config/api.js";

// ── Navigation structure ──────────────────────────────────────
const NAV_GROUPS = [
  {
    id: "overview",
    icon: LayoutDashboard,
    label: "Overview",
    to: "/admin/home",
    single: true,
  },
  {
    id: "complaints",
    icon: ClipboardList,
    label: "Community Complaints",
    to: "/admin/complaints",
    children: [
      { label: "Community Feed", to: "/admin/complaints" },
      { label: "Pending", to: "/admin/complaints?status=pending" },
      { label: "In Progress", to: "/admin/complaints?status=in_progress" },
      { label: "Resolved", to: "/admin/complaints?status=resolved" },
      { label: "Task Assignment", to: "/admin/complaints?tab=assignment" },
    ],
  },
  {
    id: "workforce",
    icon: Users,
    label: "Workforce",
    to: "/admin/workforce",
    children: [
      { label: "All Workers", to: "/admin/workforce" },
      { label: "Pending Approvals", to: "/admin/workforce?tab=approvals" },
      { label: "Availability", to: "/admin/workforce?tab=availability" },
      { label: "Workload", to: "/admin/workforce?tab=workload" },
      { label: "Performance", to: "/admin/workforce?tab=performance" },
    ],
  },
  {
    id: "municipal",
    icon: Landmark,
    label: "Municipal Operations",
    to: "/admin/municipal",
    children: [
      { label: "Waste Collection Map", to: "/admin/municipal" },
      { label: "Municipal Zones/Wards", to: "/admin/municipal?tab=zones" },
      { label: "Collection Monitoring", to: "/admin/municipal?tab=monitoring" },
      { label: "Waste Categories", to: "/admin/municipal?tab=categories" },
    ],
  },
  {
    id: "reports",
    icon: BarChart3,
    label: "Reports & Analytics",
    to: "/admin/reports",
    children: [
      { label: "Complaint Trends", to: "/admin/reports" },
      { label: "Resolution Rates", to: "/admin/reports?tab=resolution" },
      { label: "Waste Statistics", to: "/admin/reports?tab=waste" },
      { label: "Worker Performance", to: "/admin/reports?tab=worker-perf" },
    ],
  },
  {
    id: "settings",
    icon: Settings,
    label: "Settings & Profile",
    to: "/admin/settings",
    children: [
      { label: "My Profile", to: "/admin/settings" },
      { label: "Account Security", to: "/admin/settings?tab=security" },
      { label: "Notification Preferences", to: "/admin/settings?tab=notifications" },
      { label: "Municipal Configuration", to: "/admin/settings?tab=municipal" },
    ],
  },
];

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function Avatar({ initials, size = "sm" }) {
  const sizeClasses = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <div
      className={`${sizeClasses} rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center font-bold text-white shrink-0 ring-2 ring-primary-500/30`}
    >
      {initials}
    </div>
  );
}

function NavGroup({ group, onClose, pendingCount }) {
  const routerLocation = useRouterLocation();
  const isGroupActive = routerLocation.pathname.startsWith(group.to);
  const [expanded, setExpanded] = useState(isGroupActive);

  // Auto-expand when navigating into this group
  useEffect(() => {
    if (isGroupActive) setExpanded(true);
  }, [isGroupActive]);

  if (group.single) {
    return (
      <NavLink
        to={group.to}
        end
        onClick={onClose}
        className={({ isActive }) =>
          `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            isActive
              ? "bg-primary-500/15 text-primary-400 border border-primary-500/30"
              : "text-gray-400 hover:bg-surface-muted hover:text-white border border-transparent"
          }`
        }
      >
        <group.icon className="w-4.5 h-4.5 shrink-0" />
        <span>{group.label}</span>
      </NavLink>
    );
  }

  const isWorkforce = group.id === "workforce";

  return (
    <div>
      {/* Group header button */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
          isGroupActive
            ? "bg-primary-500/10 text-primary-400 border-primary-500/20"
            : "text-gray-400 hover:bg-surface-muted hover:text-white border-transparent"
        }`}
      >
        <group.icon className="w-4.5 h-4.5 shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        {isWorkforce && pendingCount > 0 && (
          <span
            id="admin-sidebar-workforce-count"
            className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30 mr-1"
          >
            {pendingCount}
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Children */}
      {expanded && (
        <div className="mt-0.5 ml-4 pl-3 border-l border-surface-border space-y-0.5">
          {group.children.map((child) => {
            // For query-param based children, check if base path matches
            const basePath = child.to.split("?")[0];
            const params = child.to.includes("?") ? child.to.split("?")[1] : null;
            const isChildActive =
              routerLocation.pathname === basePath &&
              (params ? routerLocation.search === `?${params}` : !routerLocation.search || routerLocation.search === "");

            const isPendingApprovals = child.to.includes("tab=approvals");

            return (
              <NavLink
                key={child.to}
                to={child.to}
                onClick={onClose}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isChildActive
                    ? "bg-primary-500/15 text-primary-400"
                    : "text-gray-500 hover:text-white hover:bg-surface-muted"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isChildActive ? "bg-primary-400" : "bg-gray-600"}`} />
                <span className="flex-1 truncate">{child.label}</span>
                {isPendingApprovals && pendingCount > 0 && (
                  <span
                    id="admin-sidebar-approvals-child-count"
                    className="ml-auto px-1.5 py-0.2 rounded-full bg-amber-500/25 text-amber-400 text-[10px] font-bold border border-amber-500/35"
                  >
                    {pendingCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SidebarContent({ onClose, pendingCount = 0 }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = getInitials(user?.full_name);

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-surface-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center shrink-0">
          <Trash2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="font-display font-bold text-white text-sm leading-none">TrashTrack</span>
          <span className="block text-primary-400 text-xs font-semibold">AI · Admin</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto text-gray-400 hover:text-white transition-colors lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <NavGroup
            key={group.id}
            group={group}
            onClose={onClose}
            pendingCount={pendingCount}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-surface-border shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-muted">
          <Avatar initials={initials} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.full_name}</p>
            <p className="text-primary-400 text-xs">Administrator</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="text-gray-500 hover:text-red-400 transition-colors p-1"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}

export default function AdminLayout() {
  const { user, logout, getToken } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [muniName, setMuniName] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const profileRef = useRef(null);

  const initials = getInitials(user?.full_name);

  // Fetch Admin's assigned municipality
  useEffect(() => {
    async function fetchMuni() {
      try {
        const token = getToken();
        if (!token) return;
        const res = await fetch(`${API_URL}/municipalities/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.municipality?.name) {
            setMuniName(data.municipality.name);
          }
        }
      } catch (err) {}
    }
    fetchMuni();
  }, [getToken]);

  // Fetch pending worker approvals count and listen for real-time refresh events
  useEffect(() => {
    let isMounted = true;
    async function fetchPendingCount() {
      try {
        const token = getToken();
        if (!token) return;
        const res = await fetch(`${API_URL}/admin/workers/pending-count`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          setPendingCount(data.count || 0);
        }
      } catch (err) {}
    }
    fetchPendingCount();

    function handleWorkforceUpdate() {
      fetchPendingCount();
    }
    window.addEventListener("tt:workforce-updated", handleWorkforceUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("tt:workforce-updated", handleWorkforceUpdate);
    };
  }, [getToken]);

  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-surface flex">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-64 bg-surface-card border-r border-surface-border shrink-0 fixed inset-y-0 left-0 z-30">
        <SidebarContent pendingCount={pendingCount} />
      </aside>

      {/* ── Mobile Overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 bg-surface-card border-r border-surface-border z-50 flex flex-col transform transition-transform duration-300 ease-out lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent onClose={() => setSidebarOpen(false)} pendingCount={pendingCount} />
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* ── Top Header ── */}
        <header className="sticky top-0 z-20 bg-surface-card/80 backdrop-blur-md border-b border-surface-border h-16 flex items-center px-4 md:px-6 gap-3 md:gap-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-400 hover:text-white transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-7 h-7 rounded-md bg-primary-500 flex items-center justify-center">
              <Trash2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-display font-bold text-white text-sm">TrashTrack AI</span>
          </div>

          {/* Admin badge (desktop) */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-400 text-xs font-bold">
              <Building2 className="w-3 h-3" />
              Admin Console
            </span>
            {muniName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-muted border border-surface-border text-gray-300 text-xs font-medium">
                <MapPin className="w-3 h-3 text-gray-400" />
                {muniName}
              </span>
            )}
          </div>

          <div className="flex-1" />

          {/* Pending Approvals Header Badge */}
          {pendingCount > 0 && (
            <NavLink
              to="/admin/workforce?tab=approvals"
              id="admin-header-pending-approvals-pill"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 transition-all text-xs font-semibold shadow-glow-sm"
              title={`${pendingCount} worker registration${pendingCount > 1 ? "s" : ""} pending approval`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{pendingCount} Pending Approvals</span>
              <span className="sm:hidden">{pendingCount} Pending</span>
            </NavLink>
          )}

          {/* Notifications */}
          <button
            id="admin-notifications-btn"
            className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-surface-muted transition-all duration-200"
            aria-label="Notifications"
            onClick={() => navigate("/admin/settings?tab=notifications")}
          >
            <Bell className="w-5 h-5" />
          </button>

          {/* Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              id="admin-profile-btn"
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-surface-muted transition-all duration-200"
              aria-expanded={profileOpen}
              aria-haspopup="true"
            >
              <Avatar initials={initials} size="sm" />
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-white leading-none">{user?.full_name}</p>
                <p className="text-xs text-primary-400 mt-0.5">Administrator</p>
              </div>
              <ChevronDown
                className={`hidden sm:block w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${
                  profileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-surface-card border border-surface-border rounded-xl shadow-card py-1 animate-slide-down z-50">
                <div className="px-4 py-3 border-b border-surface-border">
                  <p className="text-sm font-semibold text-white">{user?.full_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{user?.email}</p>
                  <span className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-400 text-xs font-semibold">
                    Admin
                  </span>
                </div>
                <NavLink
                  to="/admin/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-surface-muted transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings & Profile
                </NavLink>
                <div className="border-t border-surface-border mt-1 pt-1">
                  <button
                    id="admin-logout-btn"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
