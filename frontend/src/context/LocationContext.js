/**
 * LocationContext – single source of truth for all browser geolocation state.
 *
 * State fields:
 *   status        – idle | checking | prompt | saving | saved | detected | denied | unavailable | timeout | error
 *   location      – { latitude, longitude, accuracy } | null
 *   address       – { display, road, suburb, city, country } | null  (from reverse geocoding)
 *   displayLabel  – human-readable string for headers/badges (address or coords fallback)
 *   showPrompt    – boolean: show custom permission UI
 *   errorMessage  – string | null
 *   lastUpdated   – ISO timestamp | null
 *
 * Shared everywhere: Header, Dashboard, Map, Profile.
 * Reverse geocoded via Nominatim (OpenStreetMap) – no API key required.
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";

const API_URL =
  import.meta.env.VITE_API_URL || "https://trashtrack-ai.onrender.com/api/v1";

/** POST /api/v1/location — JWT verified server-side; userId NEVER from body. */
async function saveLocationToBackend(coords, token) {
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

/**
 * Reverse geocode using Nominatim (OpenStreetMap) — free, no API key.
 * Returns a structured address or null on failure.
 */
async function reverseGeocode(latitude, longitude) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
      {
        headers: {
          // Nominatim requires a User-Agent
          "Accept-Language": "en",
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address || {};

    // Build a concise display label (most useful parts, not the full raw string)
    const parts = [
      a.road || a.pedestrian || a.footway,
      a.suburb || a.neighbourhood || a.quarter || a.village,
      a.city || a.town || a.county,
    ].filter(Boolean);

    return {
      display: parts.length > 0 ? parts.join(", ") : data.display_name || null,
      road:    a.road || a.pedestrian || null,
      suburb:  a.suburb || a.neighbourhood || a.quarter || a.village || null,
      city:    a.city || a.town || a.county || null,
      country: a.country || null,
      raw:     data.display_name || null,
    };
  } catch {
    return null;
  }
}

/** Build a coords-based fallback label when geocoding fails. */
function coordsLabel(latitude, longitude) {
  return `${Math.abs(latitude).toFixed(4)}°${latitude >= 0 ? "N" : "S"}, ${Math.abs(longitude).toFixed(4)}°${longitude >= 0 ? "E" : "W"}`;
}

/* ─── Context ─────────────────────────────────────────────── */
const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const { getToken } = useAuth();

  const [status, setStatus]           = useState("idle");
  const [location, setLocation]       = useState(null); // { latitude, longitude, accuracy }
  const [address, setAddress]         = useState(null); // from reverse geocoding
  const [displayLabel, setDisplayLabel] = useState(null); // shown in header/badge
  const [showPrompt, setShowPrompt]   = useState(false);
  const [errorMessage, setError]      = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const initiated = useRef(false);

  /* ── Core: get GPS + reverse geocode + save to backend ── */
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

        // 1. Update coords immediately → map recenters NOW
        setLocation(coords);
        setLastUpdated(new Date().toISOString());
        setStatus("saving");

        // 2. Start reverse geocoding (async, does not block map update)
        reverseGeocode(coords.latitude, coords.longitude).then((geo) => {
          if (geo) {
            setAddress(geo);
            setDisplayLabel(geo.display || coordsLabel(coords.latitude, coords.longitude));
          } else {
            setAddress(null);
            setDisplayLabel(coordsLabel(coords.latitude, coords.longitude));
          }
        });

        // 3. Save to backend
        try {
          const token = getToken();
          if (!token) {
            setStatus("detected");
            setError("Not authenticated. Please log in again.");
            return;
          }
          await saveLocationToBackend(coords, token);
          setStatus("saved");
          setError(null);
        } catch (err) {
          // GPS and address are still known — show them, surface soft error
          setStatus("detected");
          setError(
            err.message ||
              "Location detected, but could not be saved to server."
          );
        }
      },
      (err) => {
        setShowPrompt(false);
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
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0, // Always fresh — never return a cached position.
      }
    );
  }, [getToken]);

  /* ── On mount: check permission and act accordingly ── */
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
            fetchAndSend();
          } else if (permResult.state === "prompt") {
            // Show our custom UI — don't trigger browser popup yet
            setStatus("prompt");
            setShowPrompt(true);
          } else {
            setStatus("denied");
            setError(
              "Location permission is disabled. Please enable it from your browser settings."
            );
          }

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
        .catch(() => fetchAndSend());
    } else {
      fetchAndSend();
    }
  }, [fetchAndSend]);

  /** User clicks "Allow Location" in our prompt UI. */
  const requestLocation = useCallback(() => {
    fetchAndSend();
  }, [fetchAndSend]);

  /** Recenter / refresh: fresh GPS + new geocode + backend save. */
  const refreshLocation = useCallback(() => {
    setError(null);
    fetchAndSend();
  }, [fetchAndSend]);

  /** Retry after timeout / unavailable. */
  const retry = useCallback(() => {
    setStatus("idle");
    setError(null);
    fetchAndSend();
  }, [fetchAndSend]);

  return (
    <LocationContext.Provider
      value={{
        status,
        location,
        address,
        displayLabel,
        showPrompt,
        errorMessage,
        lastUpdated,
        requestLocation,
        refreshLocation,
        retry,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used inside LocationProvider");
  return ctx;
}

