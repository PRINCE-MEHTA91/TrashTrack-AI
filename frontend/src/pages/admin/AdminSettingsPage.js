import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import {
  Settings,
  User,
  Shield,
  Bell,
  Building2,
  LogOut,
  Edit2,
  Save,
  Camera,
  Mail,
  Calendar,
  CheckCircle2,
  Lock,
  Key,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config/api.js";

const TABS = [
  { id: "profile",       label: "My Profile",               icon: User },
  { id: "security",      label: "Account Security",         icon: Shield },
  { id: "notifications", label: "Notification Preferences", icon: Bell },
  { id: "municipal",     label: "Municipal Configuration",  icon: Building2 },
];

function getInitials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
}

function ProfileRow({ icon: Icon, label, value, highlight }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-surface-border last:border-0">
      <div className="w-8 h-8 rounded-lg bg-surface-muted border border-surface-border flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-sm font-medium truncate ${highlight ? "text-primary-400" : "text-white"}`}>
          {value ?? "—"}
        </p>
      </div>
    </div>
  );
}

function ProfileTab({ user, getToken, refetch }) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name:    user?.full_name    || "",
    phone_number: user?.phone_number || "",
    address:      user?.address      || "",
  });

  const initials = getInitials(user?.full_name);
  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        await refetch();
        setIsEditing(false);
      } else {
        const d = await res.json();
        alert(`Failed to save: ${d.message}`);
      }
    } catch {
      alert("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile card */}
      <div className="card p-6 flex flex-col items-center text-center gap-4 relative">
        {!isEditing ? (
          <button
            id="admin-settings-edit-btn"
            onClick={() => setIsEditing(true)}
            className="absolute top-4 right-4 p-2 rounded-xl bg-surface-muted hover:bg-surface-border transition-colors text-gray-400 hover:text-white"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving}
            className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-primary-500 hover:bg-primary-400 transition-colors text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save"}
          </button>
        )}

        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-2xl font-bold text-white ring-4 ring-primary-500/20">
          {user?.profile_image ? (
            <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover rounded-full" />
          ) : (
            initials
          )}
        </div>

        <div className="space-y-1.5">
          {isEditing ? (
            <input
              type="text"
              value={formData.full_name}
              onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))}
              className="w-full bg-surface-muted border border-surface-border rounded-lg px-3 py-2 text-white text-center font-display font-bold text-xl focus:outline-none focus:border-primary-500"
            />
          ) : (
            <h1 id="admin-settings-name" className="font-display font-bold text-xl text-white">{user?.full_name ?? "—"}</h1>
          )}
          <p className="text-gray-400 text-sm">{user?.email ?? "—"}</p>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-400 text-xs font-bold">
            Administrator
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="card p-5 space-y-1">
        <h2 className="font-display font-semibold text-white text-sm mb-3">Account Details</h2>
        <ProfileRow icon={User}        label="Full Name"    value={user?.full_name}   />
        <ProfileRow icon={Mail}        label="Email"        value={user?.email}        />
        <ProfileRow icon={Shield}      label="Role"         value="Administrator" highlight />
        <ProfileRow icon={CheckCircle2} label="Status"      value={user?.status ?? "active"} />
        <ProfileRow icon={Calendar}    label="Member Since" value={joinedDate}          />
      </div>
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="card p-6 space-y-4">
        <h2 className="font-display font-semibold text-white text-base flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary-400" />
          Account Security
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-muted border border-surface-border">
            <div className="flex items-center gap-3">
              <Key className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-white font-medium">Password</p>
                <p className="text-xs text-gray-500">Last changed: not tracked</p>
              </div>
            </div>
            <span className="text-xs text-gray-500 bg-surface-border px-2 py-1 rounded-lg">Change password coming soon</span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-muted border border-surface-border">
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-white font-medium">Two-Factor Authentication</p>
                <p className="text-xs text-gray-500">Extra layer of security for your account</p>
              </div>
            </div>
            <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">Coming Soon</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-xs text-gray-400">
          <span className="text-amber-400 font-semibold">Security Note:</span> Admin accounts have elevated privileges. Always use a strong, unique password and avoid sharing credentials.
        </p>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    newComplaints:   true,
    statusUpdates:   true,
    workerApprovals: true,
    weeklyReport:    false,
  });

  const toggle = (key) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  const items = [
    { key: "newComplaints",   label: "New Complaints",        desc: "Get notified when a new citizen complaint is filed" },
    { key: "statusUpdates",   label: "Status Updates",        desc: "Notifications when complaint status changes" },
    { key: "workerApprovals", label: "Worker Approvals",      desc: "New worker registration requests pending approval" },
    { key: "weeklyReport",    label: "Weekly Summary Report", desc: "Receive a weekly analytics digest via email" },
  ];

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="card p-6 space-y-4">
        <h2 className="font-display font-semibold text-white text-base flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary-400" />
          Notification Preferences
        </h2>
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-surface-muted border border-surface-border">
              <div>
                <p className="text-sm text-white font-medium">{item.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
              <button
                id={`admin-notif-toggle-${item.key}`}
                onClick={() => toggle(item.key)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${prefs[item.key] ? "bg-primary-500" : "bg-surface-border"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${prefs[item.key] ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-500 px-1">Notification delivery settings are stored locally. Backend push notification API coming soon.</p>
    </div>
  );
}

function MunicipalTab() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="card p-6 space-y-4">
        <h2 className="font-display font-semibold text-white text-base flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary-400" />
          Municipal Configuration
        </h2>
        <div className="space-y-3">
          {[
            { label: "Municipality Name",   value: "—",            note: "Set via backend admin config" },
            { label: "Number of Zones/Wards", value: "—",          note: "Configured in zone management" },
            { label: "Collection Schedule", value: "Daily",        note: "Default schedule" },
            { label: "Auto-Assignment",     value: "Disabled",     note: "Manual assignment mode" },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between p-4 rounded-xl bg-surface-muted border border-surface-border">
              <div>
                <p className="text-sm text-white font-medium">{row.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{row.note}</p>
              </div>
              <span className="text-sm text-gray-400">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-surface-border bg-surface-card px-5 py-4">
        <p className="text-xs text-gray-400">
          <span className="text-gray-300 font-semibold">Municipal Configuration</span> — Full configuration panel (zone management, schedules, auto-assignment rules) will be available once the admin configuration API is implemented.
        </p>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, logout, getToken, refetch } = useAuth();

  const tabParam  = searchParams.get("tab") || "profile";
  const activeTab = TABS.find(t => t.id === tabParam)?.id || "profile";

  function setTab(id) {
    if (id === "profile") setSearchParams({});
    else setSearchParams({ tab: id });
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 id="admin-settings-title" className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary-400" />
            Settings & Profile
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage your profile, security, and municipal preferences</p>
        </div>
        <button
          id="admin-settings-logout-btn"
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all text-sm font-semibold"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
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
              id={`admin-settings-tab-${tab.id}`}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "profile"       && <ProfileTab user={user} getToken={getToken} refetch={refetch} />}
      {activeTab === "security"      && <SecurityTab />}
      {activeTab === "notifications" && <NotificationsTab />}
      {activeTab === "municipal"     && <MunicipalTab />}
    </div>
  );
}
