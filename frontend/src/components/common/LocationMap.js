// LocationMap - Renders Leaflet/OSM map for detected location.
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { MapPin, Loader2, AlertTriangle, XCircle } from "lucide-react";

// Fix Leaflet's broken default icon URLs in Vite/Webpack builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Inner component: re-centers the map whenever coords change
function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

// ── Loading skeleton ──────────────────────────────────────────
function MapLoading() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full min-h-[220px] bg-surface-muted rounded-xl border border-surface-border">
      <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
      <p className="text-sm text-gray-400">Detecting your location…</p>
    </div>
  );
}

// ── Prompt state ─────────────────────────────────────────────
function MapPrompt({ onAllow, accentClass }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full min-h-[220px] bg-surface-muted rounded-xl border border-surface-border p-6 text-center">
      <div className="w-12 h-12 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
        <MapPin className="w-6 h-6 text-blue-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">Enable Location Access</p>
        <p className="text-xs text-gray-400 mt-1">Allow location to see your position on the map.</p>
      </div>
      <button
        id="map-allow-location-btn"
        onClick={onAllow}
        className={`${accentClass} text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-colors`}
      >
        Allow Location
      </button>
    </div>
  );
}

// ── Denied / error / unavailable state ───────────────────────
function MapError({ status, errorMessage, onRetry }) {
  const isDenied = status === "denied";
  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full min-h-[220px] bg-surface-muted rounded-xl border border-surface-border p-6 text-center">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
        isDenied ? "bg-amber-500/15 border border-amber-500/30" : "bg-red-500/15 border border-red-500/30"
      }`}>
        {isDenied
          ? <XCircle className="w-6 h-6 text-amber-400" />
          : <AlertTriangle className="w-6 h-6 text-red-400" />}
      </div>
      <div>
        <p className="text-sm font-semibold text-white">
          {isDenied ? "Location Access Disabled" : "Location Unavailable"}
        </p>
        <p className="text-xs text-gray-400 mt-1 max-w-xs">
          {errorMessage || "Unable to retrieve your location. Your dashboard still works normally."}
        </p>
      </div>
      {onRetry && (
        <button
          id="map-retry-btn"
          onClick={onRetry}
          className={`text-sm font-semibold px-5 py-2 rounded-xl border transition-colors ${
            isDenied
              ? "text-amber-400 border-amber-500/30 hover:border-amber-400/50"
              : "text-red-400 border-red-500/30 hover:border-red-400/50"
          }`}
        >
          Try Again
        </button>
      )}
    </div>
  );
}

// ── Main exported component ───────────────────────────────────
export function LocationMap({
  status,
  location,        // { latitude, longitude, accuracy } | null
  errorMessage,
  showPrompt,
  onAllow,
  onRetry,
  accentClass = "bg-citizen-500 hover:bg-citizen-400",
  title = "Your Location",
  className = "",
}) {
  // Loading / saving states
  if (status === "idle" || status === "checking" || status === "saving") {
    return <MapLoading />;
  }

  // Prompt — user hasn't granted yet
  if (showPrompt && status === "prompt") {
    return <MapPrompt onAllow={onAllow} accentClass={accentClass} />;
  }

  // Denied / error / unavailable / timeout
  if (!location || status === "denied" || status === "unavailable" || status === "timeout" || status === "error") {
    return (
      <MapError
        status={status}
        errorMessage={errorMessage}
        onRetry={status !== "denied" ? onRetry : undefined}
      />
    );
  }

  const { latitude, longitude } = location;

  return (
    <div
      id="location-map-container"
      className={`rounded-xl overflow-hidden border border-surface-border shadow-card ${className}`}
      style={{ minHeight: 240 }}
    >
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", minHeight: 240 }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap lat={latitude} lng={longitude} />
        <Marker position={[latitude, longitude]}>
          <Popup>
            <div className="text-sm font-medium">{title}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
