import { Bell } from "lucide-react";
import { Link } from "react-router-dom";

export default function WorkerNotificationsPage() {
  return (
    <div id="worker-notifications-page" className="p-4 md:p-6 pb-24 lg:pb-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-white">Notifications</h1>
          <p className="text-gray-400 text-xs md:text-sm mt-0.5">Alerts, assignments, and system updates</p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-surface-muted border border-surface-border text-gray-400 text-xs font-semibold">
          0 Unread
        </span>
      </div>

      <div className="card p-10 md:p-14 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4 text-primary-400">
          <Bell className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-display font-semibold text-white mb-1.5">All caught up!</h2>
        <p className="text-gray-400 text-xs md:text-sm max-w-sm leading-relaxed mb-6">
          You have no new notifications right now. New task assignments and route updates will appear here in real time.
        </p>
        <Link
          to="/worker/home"
          className="px-4 py-2 rounded-xl bg-surface-muted hover:bg-surface-border border border-surface-border text-gray-300 hover:text-white text-xs font-medium transition-colors"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
