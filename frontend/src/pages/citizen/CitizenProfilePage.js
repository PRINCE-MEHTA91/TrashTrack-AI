import { User, Mail, Shield, Calendar, CheckCircle2, MapPin } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { CitizenAvatar } from "../../components/citizen/CitizenLayout";

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function CitizenProfilePage() {
  const { user } = useAuth();
  const initials = getInitials(user?.full_name);

  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const accountStatus = user?.status ?? "active";
  const isActive = accountStatus === "active";

  return (
    <div className="p-4 md:p-6 pb-28 lg:pb-6 max-w-2xl mx-auto space-y-6">
      {/* Profile card */}
      <div className="card p-6 flex flex-col items-center text-center gap-4">
        {/* Large avatar */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-citizen-500 to-citizen-700 flex items-center justify-center text-3xl font-bold text-white ring-4 ring-citizen-500/20">
          {initials}
        </div>

        <div className="space-y-1">
          <h1 id="citizen-profile-name" className="font-display font-bold text-xl text-white">
            {user?.full_name ?? "—"}
          </h1>
          <p className="text-gray-400 text-sm">{user?.email ?? "—"}</p>
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-citizen-500/15 border border-citizen-500/30 text-citizen-400 text-xs font-bold">
              Citizen
            </span>
            <span
              id="citizen-profile-status"
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                isActive
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-red-500/15 border-red-500/30 text-red-400"
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              {isActive ? "Active" : accountStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Account details */}
      <div className="card p-5 space-y-1">
        <h2 className="font-display font-semibold text-white text-sm mb-3">Account Details</h2>

        <ProfileRow icon={User}        label="Full Name"       value={user?.full_name} />
        <ProfileRow icon={Mail}        label="Email Address"   value={user?.email} />
        <ProfileRow icon={Shield}      label="Role"            value="Citizen" highlight />
        <ProfileRow
          icon={CheckCircle2}
          label="Account Status"
          value={isActive ? "Active" : accountStatus}
          highlight={isActive}
        />
        <ProfileRow icon={MapPin}      label="Municipal Zone"  value={user?.municipality_name ?? "—"} note={!user?.municipality_name ? "[To be assigned by admin]" : undefined} />
        <ProfileRow icon={Calendar}    label="Member Since"    value={joinedDate} />
      </div>

      {/* Edit profile notice */}
      <div className="rounded-xl border border-surface-border bg-surface-muted px-5 py-4">
        <p className="text-xs text-gray-400">
          <span className="font-semibold text-gray-300">Profile editing</span> — coming soon. You will be able to update your name, avatar, and contact details here.
        </p>
      </div>
    </div>
  );
}

function ProfileRow({ icon: Icon, label, value, highlight, note }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-surface-border last:border-0">
      <div className="w-8 h-8 rounded-lg bg-surface-muted border border-surface-border flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-sm font-medium truncate ${highlight ? "text-citizen-400" : "text-white"}`}>
          {value ?? "—"}
          {note && <span className="ml-1 text-xs text-gray-500">{note}</span>}
        </p>
      </div>
    </div>
  );
}
