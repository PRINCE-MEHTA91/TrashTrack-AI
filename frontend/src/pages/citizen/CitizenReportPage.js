import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Camera,
  MapPin,
  ArrowLeft,
  Loader2,
  Navigation,
  VideoOff,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "../../context/LocationContext";

const API_URL = import.meta.env.VITE_API_URL || "https://trashtrack-ai.onrender.com/api/v1";

// camStatus values: idle | requesting | active | denied | unavailable

export default function CitizenReportPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const {
    location,
    displayLabel,
    status: locStatus,
    refreshLocation,
    errorMessage: locError,
  } = useLocation();

  // Camera stream state
  const [camStatus, setCamStatus] = useState("idle");
  const [camError, setCamError]   = useState("");
  const videoRef  = useRef(null);
  const streamRef = useRef(null); // kept so we can stop it on unmount

  // Form fields and submit error
  const [formData, setFormData] = useState({
    title:       "",
    description: "",
    waste_type:  "OTHER",
    severity:    "MEDIUM",
    image_url:   "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  // Stop camera when user leaves the page
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Wire the live stream into the <video> element after it renders
  useEffect(() => {
    if (camStatus === "active" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [camStatus]);

  // Tap handler: requests camera then location. No capture, no file picker.
  const handleCameraClick = useCallback(async () => {
    if (camStatus === "active" || camStatus === "requesting") return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCamStatus("unavailable");
      setCamError("Your browser does not support camera access.");
      return;
    }

    // Don't re-request if already denied — browser rejects it immediately anyway
    if (camStatus === "denied") {
      setCamError(
        "Camera permission is blocked. Please enable it in your browser settings and reload the page."
      );
      return;
    }

    setCamStatus("requesting");
    setCamError("");
    setError("");

    // Request camera permission
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCamStatus("denied");
        setCamError(
          "Camera permission was denied. Please allow camera access in your browser settings to continue."
        );
      } else {
        setCamStatus("unavailable");
        setCamError(
          "Could not access the camera. Make sure a camera is connected and try again."
        );
      }
      return;
    }

    streamRef.current = stream;
    setCamStatus("active");

    // Request location via context (GPS → reverse geocode → save to backend)
    refreshLocation();
  }, [camStatus, refreshLocation]);

  const handleCapture = useCallback((e) => {
    e.stopPropagation();
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      
      setFormData(prev => ({ ...prev, image_url: dataUrl }));
      setCamStatus("captured");
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    }
  }, []);

  const handleRetake = useCallback((e) => {
    e.stopPropagation();
    setFormData(prev => ({ ...prev, image_url: "" }));
    setCamStatus("idle");
    setCamError("");
    handleCameraClick(); // auto-restart camera
  }, [handleCameraClick]);

  // Submit the complaint form with location data
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location) {
      setError("Location is required. Please allow location access.");
      return;
    }
    if (!formData.title) {
      setError("Title is required.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const token = getToken();
      const payload = {
        ...formData,
        latitude:  location.latitude,
        longitude: location.longitude,
        accuracy:  location.accuracy,
        address:   displayLabel || undefined,
      };

      const res = await fetch(`${API_URL}/complaints`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        navigate("/citizen/home");
      } else {
        setError(data.message || "Failed to submit report.");
      }
    } catch {
      setError("An error occurred while submitting the report.");
    } finally {
      setSubmitting(false);
    }
  };

  const isLocationReady = locStatus === "saved" || locStatus === "detected";

  return (
    <div className="p-4 md:p-6 pb-28 lg:pb-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/citizen/home")}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-surface-muted transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display font-bold text-xl text-white">Report Waste</h1>
          <p className="text-gray-400 text-sm">Report a waste issue in your area</p>
        </div>
      </div>

      {/* Page-level error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Camera: permission + live preview */}
        <CameraSection
          camStatus={camStatus}
          camError={camError}
          videoRef={videoRef}
          imageUrl={formData.image_url}
          onCameraClick={handleCameraClick}
          onCapture={handleCapture}
          onRetake={handleRetake}
        />

        {/* Location: permission + save status */}
        <LocationSection
          isLocationReady={isLocationReady}
          locStatus={locStatus}
          locError={locError}
          displayLabel={displayLabel}
          onRefresh={refreshLocation}
        />

        {/* Report details form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="E.g. Garbage pile near park entrance"
              className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-citizen-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Waste Type</label>
              <select
                value={formData.waste_type}
                onChange={e => setFormData(prev => ({ ...prev, waste_type: e.target.value }))}
                className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-citizen-500 transition-colors appearance-none"
              >
                <option value="ORGANIC">Organic</option>
                <option value="PLASTIC">Plastic</option>
                <option value="HAZARDOUS">Hazardous</option>
                <option value="BULK">Bulk / Debris</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Severity</label>
              <select
                value={formData.severity}
                onChange={e => setFormData(prev => ({ ...prev, severity: e.target.value }))}
                className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-citizen-500 transition-colors appearance-none"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High (Urgent)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Description (optional)</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add more details about the issue..."
              rows={3}
              className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-citizen-500 transition-colors resize-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !location}
          className="w-full h-12 rounded-xl bg-citizen-500 hover:bg-citizen-400 text-white font-semibold text-sm transition-all duration-200 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Report"
          )}
        </button>
      </form>
    </div>
  );
}

// Camera area: shows idle prompt, spinner, live feed, or denied message
function CameraSection({ camStatus, camError, videoRef, imageUrl, onCameraClick, onCapture, onRetake }) {
  const isIdle       = camStatus === "idle";
  const isRequesting = camStatus === "requesting";
  const isActive     = camStatus === "active";
  const isDenied     = camStatus === "denied" || camStatus === "unavailable";
  const isCaptured   = camStatus === "captured" || !!imageUrl;

  return (
    <div className="space-y-2">
      {/* Tap-to-start camera area */}
      <div
        id="citizen-report-camera-area"
        onClick={!isActive && !isRequesting && !isCaptured ? onCameraClick : undefined}
        className={[
          "relative rounded-xl border-2 overflow-hidden transition-colors flex flex-col justify-center",
          isActive || isCaptured
            ? "border-citizen-500/50 bg-black"
            : isDenied
              ? "border-red-500/30 bg-red-500/5 cursor-not-allowed"
              : "border-dashed border-surface-border bg-surface-muted hover:border-citizen-500/50 cursor-pointer",
        ].join(" ")}
        style={{ minHeight: "200px" }}
        role="button"
        aria-label={isActive ? "Camera preview active" : isCaptured ? "Image captured" : "Tap to open camera"}
        tabIndex={isActive || isRequesting || isCaptured ? -1 : 0}
        onKeyDown={e => {
          if ((e.key === "Enter" || e.key === " ") && !isActive && !isRequesting && !isCaptured) {
            e.preventDefault();
            onCameraClick();
          }
        }}
      >
        {/* Captured image */}
        {isCaptured && imageUrl && (
          <img
            src={imageUrl}
            alt="Captured"
            className="w-full h-full object-cover"
            style={{ minHeight: "200px" }}
          />
        )}

        {/* Live video feed */}
        {isActive && !isCaptured && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ minHeight: "200px" }}
          />
        )}

        {/* Idle state */}
        {isIdle && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-16 h-16 rounded-full bg-surface-card border border-surface-border flex items-center justify-center">
              <Camera className="w-7 h-7 text-gray-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-300">Tap to open camera</p>
              <p className="text-xs text-gray-500 mt-1">
                Camera &amp; location access will be requested
              </p>
            </div>
          </div>
        )}

        {/* Waiting for browser permission */}
        {isRequesting && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 text-citizen-400 animate-spin" />
            <p className="text-sm text-gray-400">Requesting camera access…</p>
          </div>
        )}

        {/* Permission denied */}
        {isDenied && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <VideoOff className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-sm font-medium text-red-400">Camera access blocked</p>
          </div>
        )}

        {/* Live badge overlay & Capture Button */}
        {isActive && !isCaptured && (
          <>
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-white font-medium">Live Preview</span>
            </div>
            
            {/* Capture button */}
            <div className="absolute bottom-4 inset-x-0 flex justify-center">
              <button
                type="button"
                onClick={onCapture}
                className="w-14 h-14 bg-white/20 hover:bg-white/30 backdrop-blur-md border-2 border-white rounded-full flex items-center justify-center transition-all z-10"
                aria-label="Capture image"
              >
                <div className="w-10 h-10 bg-white rounded-full" />
              </button>
            </div>
          </>
        )}

        {/* Retake Button */}
        {isCaptured && (
          <div className="absolute bottom-4 inset-x-0 flex justify-center">
            <button
              type="button"
              onClick={onRetake}
              className="px-5 py-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/20 rounded-full text-white text-sm font-semibold transition-all z-10 shadow-lg"
            >
              Retake Photo
            </button>
          </div>
        )}
      </div>

      {/* Show camera error below the area */}
      {camError && (
        <div
          id="citizen-report-camera-error"
          className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
        >
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{camError}</span>
        </div>
      )}
    </div>
  );
}

// Location row: shows GPS status, address, refresh button, and error message
function LocationSection({ isLocationReady, locStatus, locError, displayLabel, onRefresh }) {
  const isChecking = locStatus === "checking" || locStatus === "saving";
  const isDenied   = locStatus === "denied";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-muted border border-surface-border">
        <MapPin
          className={`w-5 h-5 shrink-0 ${
            isLocationReady ? "text-citizen-400" : isDenied ? "text-red-400" : "text-gray-500"
          }`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-300">Detected Location</p>
          <p className="text-xs text-gray-500 truncate">
            {isChecking
              ? "Detecting…"
              : displayLabel || (isDenied ? "Permission denied" : "Location unavailable")}
          </p>
        </div>

        {/* Status icon: tick or spinner */}
        {isLocationReady && (
          <CheckCircle2 className="w-4 h-4 text-citizen-400 shrink-0" aria-label="Location saved" />
        )}
        {isChecking && (
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin shrink-0" />
        )}

        {/* Refresh location button */}
        <button
          type="button"
          id="citizen-report-location-refresh-btn"
          onClick={onRefresh}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-surface-border transition-colors"
          title="Refresh Location"
        >
          <Navigation className="w-4 h-4" />
        </button>
      </div>

      {/* Error shown when location is denied */}
      {isDenied && locError && (
        <div
          id="citizen-report-location-error"
          className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
        >
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{locError}</span>
        </div>
      )}
    </div>
  );
}
