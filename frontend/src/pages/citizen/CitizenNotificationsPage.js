import { Bell, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { MOCK_CITIZEN_NOTIFICATIONS } from "../../mocks/citizenMockData";

const TYPE_CONFIG = {
  success: { dot: "bg-emerald-400", badge: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" },
  info:    { dot: "bg-blue-400",    badge: "bg-blue-500/15 border-blue-500/30 text-blue-400" },
  warning: { dot: "bg-amber-400",   badge: "bg-amber-500/15 border-amber-500/30 text-amber-400" },
};

export default function CitizenNotificationsPage() {
  const [notifications, setNotifications] = useState(MOCK_CITIZEN_NOTIFICATIONS); // TODO: replace with real API

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-4 md:p-6 pb-28 lg:pb-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-white">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-gray-400 text-sm mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            id="citizen-mark-all-read-btn"
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-citizen-400 hover:text-citizen-300 hover:bg-citizen-500/10 transition-colors border border-citizen-500/20"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card p-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-citizen-500/10 border border-citizen-500/20 flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-citizen-400/60" />
          </div>
          <h2 className="font-display font-semibold text-white text-lg mb-2">All caught up!</h2>
          <p className="text-gray-400 text-sm">You have no notifications at this time.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => {
            const conf = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.info;
            return (
              <div
                key={notif.id}
                id={`citizen-notif-item-${notif.id}`}
                className={`card p-4 flex gap-3 transition-colors ${
                  notif.read ? "opacity-70" : ""
                }`}
              >
                <div className="flex items-start pt-1 shrink-0">
                  {!notif.read ? (
                    <span className={`block w-2 h-2 rounded-full ${conf.dot}`} />
                  ) : (
                    <span className="block w-2 h-2 rounded-full bg-gray-700" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${notif.read ? "text-gray-300" : "text-white"}`}>
                      {notif.title}
                    </p>
                    <span className="text-xs text-gray-500 shrink-0">{notif.time}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{notif.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-600 text-center pt-2">
        Real-time notifications will be implemented in a future update.
      </p>
    </div>
  );
}
