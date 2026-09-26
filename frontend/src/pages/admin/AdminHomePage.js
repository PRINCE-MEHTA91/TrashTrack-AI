import { Building2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

/**
 * AdminHomePage – Placeholder for /admin/home.
 *
 * Full Admin dashboard is reserved for a future milestone.
 * This page is protected by ProtectedRoute with allowedRoles=["admin"].
 */
export default function AdminHomePage() {
  const { user } = useAuth();

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto flex flex-col items-center text-center min-h-[60vh] justify-center">
      <div className="w-20 h-20 rounded-3xl bg-blue-600/15 border border-blue-600/30 flex items-center justify-center mb-6">
        <Building2 className="w-10 h-10 text-blue-400" />
      </div>
      <h1 id="admin-home-title" className="font-display font-bold text-2xl text-white mb-2">
        Admin Dashboard
      </h1>
      <p className="text-gray-400 text-sm leading-relaxed max-w-sm mb-4">
        Welcome, <span className="text-white font-semibold">{user?.full_name ?? "Administrator"}</span>.
        The full admin dashboard — including complaint management, worker oversight, analytics, and reporting — is reserved for a future implementation milestone.
      </p>
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600/15 border border-blue-600/30 text-blue-400 text-xs font-bold">
        Coming Soon
      </span>
    </div>
  );
}
