import { Outlet } from "react-router-dom";
import { Trash2 } from "lucide-react";

/**
 * AdminLayout – Placeholder layout shell for the Admin role.
 *
 * Full implementation is reserved for a future milestone.
 * This stub ensures /admin/* routes are registered and protected by role.
 */
export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Minimal header */}
      <header className="h-16 bg-surface-card border-b border-surface-border flex items-center px-6 gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Trash2 className="w-4 h-4 text-white" />
        </div>
        <span className="font-display font-bold text-white text-sm">TrashTrack AI</span>
        <span className="text-xs text-blue-400 font-semibold ml-1">Admin</span>
      </header>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
