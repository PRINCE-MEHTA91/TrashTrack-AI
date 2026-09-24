import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ROLE_HOME = {
  worker: "/worker/home",
  citizen: "/citizen/home",
  admin: "/admin/home",
};

/**
 * ProtectedRoute – wraps routes that require authentication and a specific role.
 *
 * Props:
 *   allowedRoles  – array of role strings that can access this route, e.g. ["worker"]
 *   children      – the page component to render if access is granted
 *
 * Behaviour:
 *   - Not authenticated → redirect to /
 *   - Authenticated but wrong role → redirect to their own dashboard (or show 403)
 *   - Authenticated + correct role → render children
 */
export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          <p className="text-gray-400 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  const role = user.role?.toLowerCase();

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    const correctHome = ROLE_HOME[role] || "/";
    return <Forbidden correctHome={correctHome} />;
  }

  return children;
}

function Forbidden({ correctHome }) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl font-bold text-red-400">403</span>
        </div>
        <h1 className="text-2xl font-display font-bold text-white mb-2">Access Denied</h1>
        <p className="text-gray-400 mb-6 text-sm leading-relaxed">
          You don't have permission to access this page. This area is restricted to a different role.
        </p>
        <a
          href={correctHome}
          className="btn-primary inline-flex"
        >
          Go to my Dashboard
        </a>
      </div>
    </div>
  );
}
