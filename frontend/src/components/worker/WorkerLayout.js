import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import {
  Home,
  ClipboardList,
  Map,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Trash2,
  Zap,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { MOCK_UNREAD_NOTIFICATIONS } from "../../mocks/workerMockData";

const NAV_ITEMS = [
  { to: "/worker/home", icon: Home, label: "Home" },
  { to: "/worker/tasks", icon: ClipboardList, label: "Tasks" },
  { to: "/worker/map", icon: Map, label: "Map" },
  { to: "/worker/notifications", icon: Bell, label: "Notifications", badge: MOCK_UNREAD_NOTIFICATIONS },
  { to: "/worker/profile", icon: User, label: "Profile" },
];

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function WorkerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const initials = getInitials(user?.full_name);

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
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-surface-border">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center shrink-0">
            <Trash2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-display font-bold text-white text-sm leading-none">TrashTrack</span>
            <span className="block text-primary-400 text-xs font-semibold">AI</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                  isActive
                    ? "bg-primary-500/15 text-primary-400 border border-primary-500/30"
                    : "text-gray-400 hover:bg-surface-muted hover:text-white border border-transparent"
                }`
              }
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              <span>{label}</span>
              {badge > 0 && (
                <span className="ml-auto w-5 h-5 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center font-bold">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar footer – user mini profile */}
        <div className="px-3 py-4 border-t border-surface-border">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-muted">
            <Avatar initials={initials} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.full_name}</p>
              <p className="text-primary-400 text-xs">Worker</p>
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
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Mobile Sidebar Drawer ── */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 bg-surface-card border-r border-surface-border z-50 transform transition-transform duration-300 ease-out lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 h-16 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-display font-bold text-white text-sm">TrashTrack</span>
              <span className="text-primary-400 text-xs font-semibold ml-1">AI</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary-500/15 text-primary-400 border border-primary-500/30"
                    : "text-gray-400 hover:bg-surface-muted hover:text-white border border-transparent"
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{label}</span>
              {badge > 0 && (
                <span className="ml-auto w-5 h-5 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center font-bold">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 px-3 py-4 border-t border-surface-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col lg:pl-64">
        {/* ── Top Navigation Bar ── */}
        <header className="sticky top-0 z-20 bg-surface-card/80 backdrop-blur-md border-b border-surface-border h-16 flex items-center px-4 md:px-6 gap-4">
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

          {/* Zone badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-muted border border-surface-border">
            <Zap className="w-3.5 h-3.5 text-primary-400" />
            <span className="text-xs font-medium text-gray-300">Ward 14 – Andheri West</span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Notifications */}
          <button
            id="worker-notifications-btn"
            className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-surface-muted transition-all duration-200"
            aria-label="Notifications"
            onClick={() => navigate("/worker/notifications")}
          >
            <Bell className="w-5 h-5" />
            {MOCK_UNREAD_NOTIFICATIONS > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center font-bold leading-none">
                {MOCK_UNREAD_NOTIFICATIONS > 9 ? "9+" : MOCK_UNREAD_NOTIFICATIONS}
              </span>
            )}
          </button>

          {/* Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              id="worker-profile-btn"
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-surface-muted transition-all duration-200 group"
              aria-expanded={profileOpen}
              aria-haspopup="true"
            >
              <Avatar initials={initials} size="sm" />
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-white leading-none">{user?.full_name}</p>
                <p className="text-xs text-primary-400 mt-0.5">Worker</p>
              </div>
              <ChevronDown
                className={`hidden sm:block w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${
                  profileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown */}
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-surface-card border border-surface-border rounded-xl shadow-card py-1 animate-slide-down z-50">
                <div className="px-4 py-3 border-b border-surface-border">
                  <p className="text-sm font-semibold text-white">{user?.full_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{user?.email}</p>
                  <span className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                    Worker
                  </span>
                </div>
                <NavLink
                  to="/worker/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-surface-muted transition-colors"
                >
                  <User className="w-4 h-4" />
                  My Profile
                </NavLink>
                <NavLink
                  to="/worker/notifications"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-surface-muted transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  Notifications
                </NavLink>
                <div className="border-t border-surface-border mt-1 pt-1">
                  <button
                    id="worker-logout-btn"
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

        {/* ── Page content ── */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

        {/* ── Mobile Bottom Navigation ── */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-surface-card/95 backdrop-blur-md border-t border-surface-border px-2 pb-safe">
          <div className="flex items-center justify-around py-2">
            {NAV_ITEMS.map(({ to, icon: Icon, label, badge }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 relative ${
                    isActive ? "text-primary-400" : "text-gray-500"
                  }`
                }
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center font-bold">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium">{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
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
