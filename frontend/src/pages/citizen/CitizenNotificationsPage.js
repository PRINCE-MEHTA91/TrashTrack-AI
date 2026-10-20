import { Bell } from "lucide-react";

export default function CitizenNotificationsPage() {
  // Notifications are not yet implemented on the backend.
  // This page will display real notifications once the API endpoint is available.
  // Mock data has been removed to avoid showing stale/fake notifications.

  return (
    <div className="p-4 md:p-6 pb-28 lg:pb-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-white">Notifications</h1>
        </div>
      </div>

      <div className="card p-10 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-citizen-500/10 border border-citizen-500/20 flex items-center justify-center mb-4">
          <Bell className="w-8 h-8 text-citizen-400/60" />
        </div>
        <h2 className="font-display font-semibold text-white text-lg mb-2">All caught up!</h2>
        <p className="text-gray-400 text-sm">You have no notifications at this time.</p>
        <p className="text-gray-600 text-xs mt-2">
          Notifications for complaint status changes, worker assignments, and resolutions will appear here.
        </p>
      </div>
    </div>
  );
}
