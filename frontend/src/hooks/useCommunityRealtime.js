import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config/api.js";

// Real-time zone SSE hook with window focus & interval polling fallback
export function useCommunityRealtime({ onUpdate, municipalityId = null, enabled = true }) {
  const { getToken } = useAuth();
  const eventSourceRef = useRef(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!enabled) return;

    const token = getToken();
    if (!token) return;

    let isSubscribed = true;

    // Build SSE URL
    const sseUrl = new URL(`${API_URL}/complaints/events`);
    sseUrl.searchParams.set("token", token);
    if (municipalityId) {
      sseUrl.searchParams.set("municipality_id", municipalityId);
    }

    try {
      const es = new EventSource(sseUrl.toString());
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type !== "connected") {
            if (isSubscribed && onUpdateRef.current) {
              onUpdateRef.current(data);
            }
          }
        } catch {
          // ignore parsing error
        }
      };

      es.onerror = () => {
        // EventSource automatically attempts to reconnect on error.
      };
    } catch (err) {
      console.warn("EventSource connection failed, falling back to polling:", err);
    }

    // Window events listener (local reactive dispatch)
    const handleLocalEvent = () => {
      if (isSubscribed && onUpdateRef.current) {
        onUpdateRef.current({ type: "local_event" });
      }
    };

    window.addEventListener("tt:complaint-submitted", handleLocalEvent);
    window.addEventListener("tt:community-complaints-updated", handleLocalEvent);
    window.addEventListener("task-status-updated", handleLocalEvent);
    window.addEventListener("tt:workforce-updated", handleLocalEvent);

    // Fallback polling interval (every 12 seconds if tab is active)
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && isSubscribed && onUpdateRef.current) {
        onUpdateRef.current({ type: "polling_tick" });
      }
    }, 12000);

    return () => {
      isSubscribed = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      clearInterval(interval);
      window.removeEventListener("tt:complaint-submitted", handleLocalEvent);
      window.removeEventListener("tt:community-complaints-updated", handleLocalEvent);
      window.removeEventListener("task-status-updated", handleLocalEvent);
      window.removeEventListener("tt:workforce-updated", handleLocalEvent);
    };
  }, [getToken, municipalityId, enabled]);
}
