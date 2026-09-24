import { User, Mail, MapPin, Shield, Calendar } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function WorkerProfilePage() {
  const { user } = useAuth();
  const initials = getInitials(user?.full_name);

  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6 max-w-2xl mx-auto space-y-6">
      {/* Profile card */}
      <div className="card p-6 flex flex-col items-center text-center gap-4">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-2xl font-bold text-white ring-4 ring-primary-500/20">
          {initials}
        </div>
        <div>
          <h1 className="font-display font-bold text-xl text-white">{user?.full_name ?? "—"}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{user?.email ?? "—"}</p>
          <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
            Worker
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="card p-5 space-y-4">
        <h2 className="font-display font-semibold text-white text-sm mb-1">Account Details</h2>

        <ProfileRow icon={User} label="Full Name" value={user?.full_name} />
        <ProfileRow icon={Mail} label="Email" value={user?.email} />
        <ProfileRow icon={Shield} label="Role" value="Worker" highlight />
        <ProfileRow icon={MapPin} label="Zone" value="Ward 14 – Andheri West" note="[TODO: from API]" />
        <ProfileRow icon={Calendar} label="Joined" value={joinedDate} />
      </div>

      {/* Placeholder edit notice */}
      <div className="rounded-xl border border-surface-border bg-surface-muted px-5 py-4">
        <p className="text-xs text-gray-400">
          <span className="font-semibold text-gray-300">Profile editing</span> — coming soon. Name, avatar, and availability settings will be editable here.
        </p>
      </div>
    </div>
  );
}

function ProfileRow({ icon: Icon, label, value, highlight, note }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-surface-border last:border-0">
      <div className="w-8 h-8 rounded-lg bg-surface-muted border border-surface-border flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-sm font-medium truncate ${highlight ? "text-primary-400" : "text-white"}`}>
          {value ?? "—"}
          {note && <span className="ml-1 text-xs text-gray-500">{note}</span>}
        </p>
      </div>
    </div>
  );
}
