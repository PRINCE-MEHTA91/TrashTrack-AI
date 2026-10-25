import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import { API_URL } from "../config/api.js";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, getToken } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [counts, setCounts] = useState({ all: 0, unread: 0, read: 0 });
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [loading, setLoading] = useState(false);
  const sseRef = useRef(null);

  // Fetch live unread count
  const fetchUnreadCount = useCallback(async () => {
    const token = getToken();
    if (!token || !user) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(Number(data.count) || 0);
      }
    } catch (err) {
      // Graceful fallback on network glitch
    }
  }, [getToken, user]);

  // Fetch paginated notifications with filters
  const fetchNotifications = useCallback(
    async ({ tab = "all", page = 1, limit = 20 } = {}) => {
      const token = getToken();
      if (!token || !user) return;
      setLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/notifications?tab=${tab}&page=${page}&limit=${limit}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setCounts(data.counts || { all: 0, unread: 0, read: 0 });
          setPagination(data.pagination || { total: 0, page: 1, limit: 20, pages: 1 });
          setUnreadCount(Number(data.unreadCount) || 0);
        }
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      } finally {
        setLoading(false);
      }
    },
    [getToken, user]
  );

  // Mark a single notification as read
  const markAsRead = useCallback(
    async (notificationId) => {
      const token = getToken();
      if (!token || !notificationId) return;
      try {
        const res = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
            )
          );
          if (typeof data.unreadCount === "number") {
            setUnreadCount(data.unreadCount);
          } else {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
          setCounts((prev) => ({
            ...prev,
            unread: Math.max(0, prev.unread - 1),
            read: prev.read + 1,
          }));
        }
      } catch (err) {
        console.error("Failed to mark notification read:", err);
      }
    },
    [getToken]
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/notifications/mark-all-read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
        );
        setUnreadCount(0);
        setCounts((prev) => ({
          ...prev,
          read: prev.all,
          unread: 0,
        }));
      }
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
    }
  }, [getToken]);

  // Initial load & real-time SSE listener
  useEffect(() => {
    const token = getToken();
    if (!token || !user) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    fetchUnreadCount();

    // Setup SSE connection for real-time user notification events
    let eventSource = null;
    try {
      const sseUrl = `${API_URL}/complaints/events?token=${encodeURIComponent(token)}`;
      eventSource = new EventSource(sseUrl);
      sseRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "notification_received") {
            if (data.notification) {
              setNotifications((prev) => [data.notification, ...prev]);
              setCounts((c) => ({
                ...c,
                all: c.all + 1,
                unread: c.unread + 1,
              }));
            }
            if (typeof data.unreadCount === "number") {
              setUnreadCount(data.unreadCount);
            } else {
              setUnreadCount((c) => c + 1);
            }
          } else if (data.type === "unread_count_updated") {
            if (typeof data.unreadCount === "number") {
              setUnreadCount(data.unreadCount);
            }
          }
        } catch (_) {}
      };

      eventSource.onerror = () => {
        // SSE reconnects automatically
      };
    } catch (err) {
      console.error("Notification SSE failed to connect:", err);
    }

    // Polling fallback every 30 seconds
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchUnreadCount();
      }
    }, 30000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchUnreadCount();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [getToken, user, fetchUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        notifications,
        counts,
        pagination,
        loading,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}
