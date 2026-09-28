/**
 * LocationMap – Renders a Leaflet/OSM map for the user's current location.
 *
 * Key behaviours:
 *  - RecenterMap re-runs map.setView whenever lat/lng change (no remount needed).
 *  - DraggableMarker tracks the latest coords; position prop is a key so Leaflet
 *    re-renders the marker when coordinates change.
 *  - RecenterButton in the map corner: on click → show confirmation → get fresh
 *    location → update map & marker → save to backend.
 *  - "detected" status (GPS ok but backend save failed) still renders the map.
 */
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import {
  MapPin,
  Loader2,
  AlertTriangle,
  XCircle,
  LocateFixed,
  RefreshCw,
  X,
} from "lucide-react";

/* ── Fix Leaflet broken default icon URLs in Vite/Webpack builds ── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/** Custom "You are here" icon — slightly larger blue pin. */
const youAreHereIcon = new L.Icon({
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize:    [25, 41],
  iconAnchor:  [12, 41],
  popupAnchor: [1, -34],
  shadowSize:  [41, 41],
});

/* ── Inner: re-centers the map whenever coords change (no remount) ── */
function RecenterMap({ lat, lng }) {
  const map = useMap();
  const prevRef = useRef({ lat: null, lng: null });

  useEffect(() => {
    if (
      lat !== prevRef.current.lat ||
      lng !== prevRef.current.lng
    ) {
      map.setView([lat, lng], 15, { animate: true });
      prevRef.current = { lat, lng };
    }
  }, [lat, lng, map]);

  return null;
}

/* ── Recenter button inside the map ── */
function RecenterControl({ onRecenter, isRefreshing }) {
  const map = useMap();

  return (
    <div
      className="leaflet-top leaflet-right"
      style={{ pointerEvents: "auto" }}
    >
      <div className="leaflet-control leaflet-bar" style={{ border: "none", margin: "10px" }}>
        <button
          id="map-recenter-btn"
          onClick={(e) => {
            e.stopPropagation();
            onRecenter();
          }}
          title="Use my current location"
          style={{
            width: 34,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#1e293b",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            cursor: "pointer",
            color: isRefreshing ? "#60a5fa" : "#94a3b8",
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          }}
        >
          {isRefreshing ? (
            <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <LocateFixed size={16} />
          )}
        </button>
      </div>
    </div>
  );
}

/* ── Loading skeleton ── */
function MapLoading() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full min-h-[220px] bg-surface-muted rounded-xl border border-surface-border">
      <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
      <p className="text-sm text-gray-400">Detecting your location…</p>
    </div>
  );
}

/* ── Prompt: user hasn't granted yet ── */
function MapPrompt({ onAllow, accentClass }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full min-h-[220px] bg-surface-muted rounded-xl border border-surface-border p-6 text-center">
      <div className="w-14 h-14 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
        <MapPin className="w-7 h-7 text-blue-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">Enable Location Access</p>
        <p className="text-xs text-gray-400 mt-1 max-w-xs">
          Allow location access to see your position on the map and improve zone detection.
        </p>
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

/* ── Denied / error / unavailable ── */
function MapError({ status, errorMessage, onRetry }) {
  const isDenied = status === "denied";
  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full min-h-[220px] bg-surface-muted rounded-xl border border-surface-border p-6 text-center">
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center ${
          isDenied
            ? "bg-amber-500/15 border border-amber-500/30"
            : "bg-red-500/15 border border-red-500/30"
        }`}
      >
        {isDenied ? (
          <XCircle className="w-6 h-6 text-amber-400" />
        ) : (
          <AlertTriangle className="w-6 h-6 text-red-400" />
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-white">
          {isDenied ? "Location Access Disabled" : "Location Unavailable"}
        </p>
        <p className="text-xs text-gray-400 mt-1 max-w-xs">
          {errorMessage ||
            "Unable to retrieve your location. Your dashboard still works normally."}
        </p>
        {isDenied && (
          <p className="text-xs text-amber-400/70 mt-2">
            Open your browser settings and enable location for this site, then refresh.
          </p>
        )}
      </div>
      {onRetry && !isDenied && (
        <button
          id="map-retry-btn"
          onClick={onRetry}
          className="text-sm font-semibold px-5 py-2 rounded-xl border text-red-400 border-red-500/30 hover:border-red-400/50 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

/* ── Confirmation dialog shown before refreshing location ── */
function RecenterDialog({ onConfirm, onCancel }) {
  return (
    <div
      className="absolute inset-0 flex items-end justify-center z-[1000] pb-4"
      style={{ pointerEvents: "auto" }}
    >
      <div className="bg-surface-card border border-surface-border rounded-2xl p-4 shadow-card w-full max-w-xs mx-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-white">Use your current location?</p>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-white transition-colors"
            id="recenter-dialog-cancel-x"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          This will fetch your latest GPS coordinates, update the map, and save to the server.
        </p>
        <div className="flex gap-2">
          <button
            id="recenter-dialog-cancel-btn"
            onClick={onCancel}
            className="flex-1 text-sm font-medium text-gray-400 hover:text-white px-4 py-2 rounded-xl border border-surface-border hover:border-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            id="recenter-dialog-confirm-btn"
            onClick={onConfirm}
            className="flex-1 text-sm font-semibold text-white px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors"
          >
            Use Current Location
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Soft warning banner for "detected but not saved" ── */
function DetectedBanner({ errorMessage }) {
  return (
    <div className="absolute top-2 left-2 right-2 z-[1000] flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-xs text-amber-300 backdrop-blur-sm">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      <span>{errorMessage || "Location detected, but could not be saved."}</span>
    </div>
  );
}

/* ── Main exported component ── */
export function LocationMap({
  status,
  location,          // { latitude, longitude, accuracy } | null
  errorMessage,
  showPrompt,
  onAllow,
  onRetry,
  onRefresh,         // callback to refresh location (from LocationContext)
  accentClass = "bg-citizen-500 hover:bg-citizen-400",
  title = "Your Location",
  className = "",
}) {
  const [showDialog, setShowDialog] = useState(false);
  const isRefreshing =
    status === "checking" || status === "saving";

  function handleRecenterClick() {
    if (status === "denied") {
      // Don't show dialog — already showing MapError
      return;
    }
    setShowDialog(true);
  }

  function handleConfirmRecenter() {
    setShowDialog(false);
    if (onRefresh) onRefresh();
  }

  // ── Loading / saving states ──
  if (status === "idle" || (status === "checking" && !location)) {
    return <MapLoading />;
  }

  // ── Prompt — user hasn't granted yet ──
  if (showPrompt && status === "prompt") {
    return <MapPrompt onAllow={onAllow} accentClass={accentClass} />;
  }

  // ── Denied / error / unavailable / timeout — AND no known location ──
  const hasError =
    !location &&
    (status === "denied" ||
      status === "unavailable" ||
      status === "timeout" ||
      status === "error");

  if (hasError) {
    return (
      <MapError
        status={status}
        errorMessage={errorMessage}
        onRetry={status !== "denied" ? onRetry : undefined}
      />
    );
  }

  // ── If location is not yet known (saving after checking) show loading ──
  if (!location) {
    return <MapLoading />;
  }

  const { latitude, longitude } = location;

  return (
    <div
      id="location-map-container"
      className={`relative rounded-xl overflow-hidden border border-surface-border shadow-card ${className}`}
      style={{ minHeight: 240 }}
    >
      {/* "detected but not saved" soft banner */}
      {status === "detected" && errorMessage && (
        <DetectedBanner errorMessage={errorMessage} />
      )}

      {/* Recenter confirmation dialog — rendered above the map */}
      {showDialog && (
        <RecenterDialog
          onConfirm={handleConfirmRecenter}
          onCancel={() => setShowDialog(false)}
        />
      )}

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

        {/* Recenters map smoothly whenever coordinates change */}
        <RecenterMap lat={latitude} lng={longitude} />

        {/* Recenter button — top-right corner of map */}
        <RecenterControl
          onRecenter={handleRecenterClick}
          isRefreshing={isRefreshing}
        />

        {/* Marker — key forces re-render when coords change */}
        <Marker
          key={`${latitude}-${longitude}`}
          position={[latitude, longitude]}
          icon={youAreHereIcon}
        >
          <Popup>
            <div className="text-sm font-semibold">{title}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </div>
            {location.accuracy && (
              <div className="text-xs text-gray-400 mt-0.5">
                Accuracy: ±{Math.round(location.accuracy)} m
              </div>
            )}
          </Popup>
        </Marker>
      </MapContainer>

      {/* Spin animation for RecenterControl */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

