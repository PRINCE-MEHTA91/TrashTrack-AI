// useUserLocation – checks browser geolocation permission, auto-fetches if granted,
// shows prompt UI if pending, handles denied/unavailable/timeout, and saves to backend via JWT.
import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL;

/** Send captured coordinates to the backend. */
async function sendLocationToBackend(coords, token) {
  const res = await fetch(`${API_URL}/location`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      latitude:  coords.latitude,
      longitude: coords.longitude,
      accuracy:  coords.accuracy,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to save location.");
  return data;
}

export function useUserLocation(getToken) {
  const [status, setStatus]         = useState("idle");      // see JSDoc above
  const [location, setLocation]     = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [errorMessage, setError]    = useState(null);
  const initiated = useRef(false);  // prevent double-run in React StrictMode

  /** Actually call the Geolocation API and send to backend. */
  const fetchAndSend = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setStatus("checking");
    setError(null);
    setShowPrompt(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          latitude:  position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy:  position.coords.accuracy,
        };
        setLocation(coords);
        setStatus("saving");

        try {
          const token = getToken();
          if (!token) {
            setStatus("error");
            setError("Not authenticated. Please log in again.");
            return;
          }
          await sendLocationToBackend(coords, token);
          setStatus("saved");
        } catch (err) {
          setStatus("error");
          setError(err.message || "Could not save location to server.");
        }
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setStatus("denied");
            setError(
              "Location permission is disabled. Please enable it from your browser settings."
            );
            break;
          case err.POSITION_UNAVAILABLE:
            setStatus("unavailable");
            setError("Location information is unavailable. Please try again later.");
            break;
          case err.TIMEOUT:
            setStatus("timeout");
            setError("Location request timed out. Please try again.");
            break;
          default:
            setStatus("error");
            setError("An unknown error occurred while fetching location.");
        }
        setShowPrompt(false);
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false }
    );
  }, [getToken]);

  /** Check existing permission state on mount — never trigger popup proactively. */
  useEffect(() => {
    if (initiated.current) return;
    initiated.current = true;

    if (!navigator.geolocation) {
      setStatus("unavailable");
      setError("Geolocation is not supported by your browser.");
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((permResult) => {
          if (permResult.state === "granted") {
            // Permission already granted — fetch silently, no popup
            fetchAndSend();
          } else if (permResult.state === "prompt") {
            // Show our own prompt UI — do not call getCurrentPosition yet
            setStatus("prompt");
            setShowPrompt(true);
          } else {
            // "denied"
            setStatus("denied");
            setError(
              "Location permission is disabled. Please enable it from your browser settings."
            );
          }

          // React to permission changes (e.g., user grants via browser bar later)
          permResult.onchange = () => {
            if (permResult.state === "granted") {
              fetchAndSend();
            } else if (permResult.state === "denied") {
              setStatus("denied");
              setShowPrompt(false);
              setError(
                "Location permission is disabled. Please enable it from your browser settings."
              );
            }
          };
        })
        .catch(() => {
          // Permissions API not available or query failed — show prompt UI
          setStatus("prompt");
          setShowPrompt(true);
        });
    } else {
      // Permissions API not supported (older browsers) — show prompt UI
      setStatus("prompt");
      setShowPrompt(true);
    }
  }, [fetchAndSend]);

  /** Called when user clicks "Allow Location" button. */
  const requestLocation = useCallback(() => {
    fetchAndSend();
  }, [fetchAndSend]);

  /** Retry after unavailable or timeout. */
  const retry = useCallback(() => {
    setStatus("idle");
    setError(null);
    fetchAndSend();
  }, [fetchAndSend]);

  return { status, location, showPrompt, errorMessage, requestLocation, retry };
}
