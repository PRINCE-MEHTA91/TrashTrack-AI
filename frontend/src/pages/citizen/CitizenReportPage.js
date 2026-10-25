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
  SwitchCamera,
  X,
  RefreshCw,
  Trash2,
  Edit3,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "../../context/LocationContext";
import { API_URL } from "../../config/api.js";

// Fix Leaflet icon URLs in Vite builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// camStatus values: idle | requesting | active | captured | denied | unavailable


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

  // Camera stream & media states
  const [camStatus, setCamStatus] = useState("idle");
  const [camError, setCamError] = useState("");
  const [facingMode, setFacingMode] = useState("environment"); // default "environment" (rear camera)
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  // Manual Map Pin Placement state (fallback / manual override)
  const [customLocation, setCustomLocation] = useState(null);
  const [customAddress, setCustomAddress] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const videoRef = useRef(null);

  const streamRef = useRef(null); // kept so we can stop it on unmount
  const cameraInputRef = useRef(null); // fallback for direct device camera intent

  // Form fields and submit error
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    waste_type: "OTHER",
    severity: "MEDIUM",
    image_url: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Cleanly stop any active media tracks
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.warn("Error stopping camera track:", err);
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Stop camera when user leaves the page or unmounts
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Check if multiple camera devices exist or if mobile device
  const detectMultipleCameras = useCallback(async () => {
    if (navigator.mediaDevices?.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        if (videoInputs.length > 1) {
          setHasMultipleCameras(true);
          return;
        }
      } catch (e) {
        console.warn("Could not enumerate camera devices:", e);
      }
    }
    const isMobile =
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1);
    if (isMobile) {
      setHasMultipleCameras(true);
    }
  }, []);

  // Wire the live stream into the <video> element after it renders
  useEffect(() => {
    if (camStatus === "active" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => {
        console.warn("Video playback error:", err);
      });
    }
  }, [camStatus]);

  // Start live camera stream (defaults to rear camera: "environment")
  const startCamera = useCallback(
    async (targetFacingMode = "environment") => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamStatus("unavailable");
        setCamError(
          "Live camera stream is not supported in this browser context (requires HTTPS or localhost). Please tap 'Open Device Camera' below to take a live photo."
        );
        return;
      }

      // Stop existing stream first to ensure camera hardware is cleanly released
      stopCameraStream();

      setCamStatus("requesting");
      setCamError("");
      setError("");

      let stream = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (err) {
        console.warn("Primary getUserMedia failed, attempting standard video fallback:", err);
        // Fallback: attempt to get standard video stream without ideal dimensions or facingMode
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch (fallbackErr) {
          err = fallbackErr;
        }

        if (!stream) {
          console.error("Camera access failed:", err.name, err.message);
          const detailedMsg = err.message ? ` (${err.message})` : "";
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            setCamStatus("denied");
            setCamError(
              `Camera access was denied by browser or Windows permissions${detailedMsg}. Please check site permissions and Windows camera privacy settings.`
            );
          } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
            setCamStatus("unavailable");
            setCamError(
              "No camera hardware detected on this device. Live camera is required to submit a waste report."
            );
          } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
            setCamStatus("unavailable");
            setCamError(
              `Camera hardware is currently in use by another application or locked by Windows${detailedMsg}. Please close other apps and try again.`
            );
          } else {
            setCamStatus("unavailable");
            setCamError(
              `Could not access camera${detailedMsg}. Make sure your camera is connected, unblocked, and not in use.`
            );
          }
          return;
        }
      }

      streamRef.current = stream;
      setFacingMode(targetFacingMode);
      setCamStatus("active");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => {
          console.warn("Video play error:", err);
        });
      }

      detectMultipleCameras();
      // Ensure real-time GPS location is requested/refreshed upon camera activation
      refreshLocation();
    },
    [stopCameraStream, detectMultipleCameras, refreshLocation]
  );

  // Switch between front and rear cameras without creating multiple active streams
  const handleSwitchCamera = useCallback(
    async (e) => {
      if (e) e.stopPropagation();
      if (isSwitchingCamera || camStatus !== "active") return;

      setIsSwitchingCamera(true);
      const nextFacingMode = facingMode === "environment" ? "user" : "environment";

      try {
        await startCamera(nextFacingMode);
      } finally {
        setIsSwitchingCamera(false);
      }
    },
    [facingMode, isSwitchingCamera, camStatus, startCamera]
  );

  // Close live camera feed and return to idle
  const handleCloseCamera = useCallback(
    (e) => {
      if (e) e.stopPropagation();
      stopCameraStream();
      setCamStatus("idle");
    },
    [stopCameraStream]
  );

  // Capture current video frame to base64
  const handleCapture = useCallback(
    (e) => {
      if (e) e.stopPropagation();
      if (videoRef.current) {
        const video = videoRef.current;
        const canvas = document.createElement("canvas");
        let w = video.videoWidth || 640;
        let h = video.videoHeight || 480;
        const maxDim = 1280;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);

        setFormData((prev) => ({ ...prev, image_url: dataUrl }));
        setCamStatus("captured");
        setCamError("");

        stopCameraStream();
        // Refresh GPS to ensure latest coordinates at capture moment
        refreshLocation();
      }
    },
    [stopCameraStream, refreshLocation]
  );

  // Handle native camera capture file fallback (capture="environment")
  const handleNativeCameraFile = useCallback(
    (file) => {
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setCamError("Please capture a valid image (JPEG, PNG, WebP).");
        return;
      }

      if (file.size > 20 * 1024 * 1024) {
        setCamError("Image must be smaller than 20MB.");
        return;
      }

      stopCameraStream();
      setCamError("");

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const MAX_DIM = 1600;
          let width = img.width;
          let height = img.height;

          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const optimizedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setFormData((prev) => ({ ...prev, image_url: optimizedDataUrl }));
          setCamStatus("captured");
          refreshLocation();
        };
        img.onerror = () => {
          setFormData((prev) => ({ ...prev, image_url: e.target.result }));
          setCamStatus("captured");
          refreshLocation();
        };
        img.src = e.target.result;
      };
      reader.onerror = () => {
        setCamError("Failed to read the captured photo.");
      };
      reader.readAsDataURL(file);
    },
    [stopCameraStream, refreshLocation]
  );

  const handleNativeCameraClick = useCallback(() => {
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
      cameraInputRef.current.click();
    }
  }, []);

  const handleRetake = useCallback(
    (e) => {
      if (e) e.stopPropagation();
      setFormData((prev) => ({ ...prev, image_url: "" }));
      setCamStatus("idle");
      setCamError("");
      startCamera("environment");
    },
    [startCamera]
  );

  const handleRemovePhoto = useCallback(
    (e) => {
      if (e) e.stopPropagation();
      setFormData((prev) => ({ ...prev, image_url: "" }));
      setCamStatus("idle");
      setCamError("");
      stopCameraStream();
    },
    [stopCameraStream]
  );

  const effectiveLocation = customLocation || location;
  const effectiveAddress = customAddress || displayLabel;
  const isLocationReady = Boolean(customLocation || locStatus === "saved" || locStatus === "detected");
  const canSubmit = !submitting && !!effectiveLocation && !!formData.image_url && !!formData.title.trim();

  // Submit the complaint form with mandatory live photo and verified location
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.image_url) {
      setError("A live-captured waste photo is required. Please capture a photo with the camera.");
      return;
    }

    if (!effectiveLocation) {
      setError("Location is required. Please allow GPS access or place a pin on the map.");
      return;
    }

    if (!formData.title.trim()) {
      setError("Title is required.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const token = getToken();
      const payload = {
        ...formData,
        latitude: effectiveLocation.latitude,
        longitude: effectiveLocation.longitude,
        accuracy: effectiveLocation.accuracy || 10,
        address: effectiveAddress || undefined,
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
        navigate("/citizen/complaints");
      } else {
        setError(data.message || "Failed to submit report.");
      }
    } catch {
      setError("An error occurred while submitting the report.");
    } finally {
      setSubmitting(false);
    }
  };


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
          <p className="text-gray-400 text-sm">Capture a live photo and report waste in your area</p>
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
        {/* Hidden input for device camera fallback (rear-camera preference, strictly live capture) */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleNativeCameraFile(e.target.files?.[0])}
          className="hidden"
          id="citizen-native-camera-input"
          aria-hidden="true"
        />

        {/* Live Camera: rear camera default + camera switch + live capture only */}
        <CameraSection
          camStatus={camStatus}
          camError={camError}
          videoRef={videoRef}
          imageUrl={formData.image_url}
          facingMode={facingMode}
          hasMultipleCameras={hasMultipleCameras}
          isSwitchingCamera={isSwitchingCamera}
          isLocationReady={isLocationReady}
          onStartCamera={startCamera}
          onSwitchCamera={handleSwitchCamera}
          onCloseCamera={handleCloseCamera}
          onCapture={handleCapture}
          onRetake={handleRetake}
          onRemovePhoto={handleRemovePhoto}
          onNativeCameraClick={handleNativeCameraClick}
        />

        {/* Location: permission + live GPS status + manual pin placement option */}
        <LocationSection
          isLocationReady={isLocationReady}
          locStatus={locStatus}
          locError={locError}
          displayLabel={effectiveAddress}
          customLocation={customLocation}
          onRefresh={refreshLocation}
          onOpenMapPicker={() => setShowMapPicker(true)}
          onResetGps={() => {
            setCustomLocation(null);
            setCustomAddress(null);
            refreshLocation();
          }}
        />

        {/* Map Pin Placement Modal */}
        <MapPinPickerModal
          isOpen={showMapPicker}
          onClose={() => setShowMapPicker(false)}
          initialCoords={
            customLocation
              ? { lat: customLocation.latitude, lng: customLocation.longitude }
              : location
              ? { lat: location.latitude, lng: location.longitude }
              : null
          }
          onConfirm={(lat, lng, address) => {
            setCustomLocation({ latitude: lat, longitude: lng, accuracy: 10 });
            setCustomAddress(address);
          }}
        />


        {/* Report details form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="E.g. Garbage pile near park entrance"
              className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-citizen-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Waste Type</label>
              <select
                value={formData.waste_type}
                onChange={(e) => setFormData((prev) => ({ ...prev, waste_type: e.target.value }))}
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
                onChange={(e) => setFormData((prev) => ({ ...prev, severity: e.target.value }))}
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
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Add more details about the issue..."
              rows={3}
              className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-citizen-500 transition-colors resize-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full h-12 rounded-xl bg-citizen-500 hover:bg-citizen-400 text-white font-semibold text-sm transition-all duration-200 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Verified Report"
          )}
        </button>
      </form>
    </div>
  );
}

// Camera area: enforces live camera capture only (rear default, switch front/rear, GPS tagging)
function CameraSection({
  camStatus,
  camError,
  videoRef,
  imageUrl,
  facingMode,
  hasMultipleCameras,
  isSwitchingCamera,
  isLocationReady,
  onStartCamera,
  onSwitchCamera,
  onCloseCamera,
  onCapture,
  onRetake,
  onRemovePhoto,
  onNativeCameraClick,
}) {
  const isIdle = camStatus === "idle" && !imageUrl;
  const isRequesting = camStatus === "requesting";
  const isActive = camStatus === "active" && !imageUrl;
  const isCaptured = camStatus === "captured" || !!imageUrl;
  const isDenied = camStatus === "denied";
  const isUnavailable = camStatus === "unavailable";
  const isErrorState = isDenied || isUnavailable;

  const isRearCamera = facingMode === "environment";

  return (
    <div className="space-y-3">
      {/* Policy Notice Badge */}
      <div className="flex items-center justify-between text-xs text-gray-400 px-1">
        <span className="flex items-center gap-1.5 text-citizen-400 font-medium">
          <Camera className="w-3.5 h-3.5" />
          Live Camera Only (Rear Default)
        </span>
        <span className="flex items-center gap-1 text-gray-400">
          <MapPin className="w-3.5 h-3.5 text-citizen-400" />
          {isLocationReady ? "GPS Connected" : "GPS Required"}
        </span>
      </div>

      {/* Main Preview / Interactive Capture Frame */}
      <div
        id="citizen-report-camera-area"
        className={[
          "relative rounded-2xl border-2 overflow-hidden transition-all duration-200 flex flex-col justify-center",
          isActive || isCaptured
            ? "border-citizen-500/50 bg-black shadow-lg shadow-citizen-950/20"
            : isErrorState
            ? "border-red-500/30 bg-surface-muted/60"
            : "border-dashed border-surface-border bg-surface-muted hover:border-citizen-500/50",
        ].join(" ")}
        style={{ minHeight: "260px" }}
      >
        {/* 1. Captured Image View */}
        {isCaptured && imageUrl && (
          <div className="relative w-full h-full min-h-[260px] max-h-[420px] bg-black flex items-center justify-center">
            <img
              src={imageUrl}
              alt="Live waste capture preview"
              className="w-full h-full object-contain max-h-[420px]"
            />
            {/* Top Badges: Live Verified & Geotagged */}
            <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-500/30 shadow-md">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-emerald-300 font-medium">Live Photo Verified</span>
              </div>
              {isLocationReady && (
                <div className="hidden sm:flex items-center gap-1 bg-black/75 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-citizen-500/30 shadow-md">
                  <MapPin className="w-3 h-3 text-citizen-400" />
                  <span className="text-[11px] text-citizen-300">GPS Tagged</span>
                </div>
              )}
            </div>

            {/* Top Right: Remove Photo button */}
            <button
              type="button"
              id="citizen-report-remove-photo-btn"
              onClick={onRemovePhoto}
              title="Remove live photo"
              aria-label="Remove live photo"
              className="absolute top-3 right-3 p-2 rounded-full bg-black/70 hover:bg-red-500/80 text-gray-300 hover:text-white backdrop-blur-md transition-colors border border-white/10 shadow-md"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 2. Live Video Feed */}
        {isActive && !isCaptured && (
          <div className="relative w-full h-full min-h-[280px] bg-black flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              webkit-playsinline="true"
              muted
              className="w-full h-full object-cover min-h-[280px] max-h-[440px]"
            />

            {/* Top Bar Overlay */}
            <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10 pointer-events-auto">
              {/* Camera Mode Indicator Badge */}
              <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-white font-medium">
                  {isRearCamera ? "Rear Camera" : "Front Camera"}
                </span>
              </div>

              {/* Top Controls: Switch Camera + Close */}
              <div className="flex items-center gap-2">
                {/* Switch Camera Button (Top) */}
                <button
                  type="button"
                  id="citizen-switch-camera-top-btn"
                  onClick={onSwitchCamera}
                  disabled={isSwitchingCamera}
                  title="Switch between front and rear camera"
                  aria-label="Switch camera"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 hover:bg-white/20 text-white text-xs font-medium backdrop-blur-md border border-white/20 shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  <SwitchCamera className={`w-3.5 h-3.5 ${isSwitchingCamera ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Flip</span>
                </button>

                {/* Close / Cancel Camera Button */}
                <button
                  type="button"
                  id="citizen-close-camera-btn"
                  onClick={onCloseCamera}
                  title="Close camera"
                  aria-label="Close camera preview"
                  className="p-1.5 rounded-full bg-black/70 hover:bg-white/20 text-gray-300 hover:text-white backdrop-blur-md border border-white/20 shadow-md transition-all active:scale-95"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Switching Camera Loading Overlay */}
            {isSwitchingCamera && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-20">
                <Loader2 className="w-8 h-8 text-citizen-400 animate-spin" />
                <p className="text-xs text-white font-medium">Switching camera…</p>
              </div>
            )}

            {/* Bottom Controls Bar Overlay */}
            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-center justify-around z-10">
              {/* GPS Indicator in viewfinder */}
              <div className="flex flex-col items-center justify-center gap-0.5 px-2.5 py-1.5 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 text-center">
                <MapPin className={`w-4 h-4 ${isLocationReady ? "text-citizen-400" : "text-amber-400"}`} />
                <span className="text-[9px] text-gray-300 font-medium">
                  {isLocationReady ? "GPS Tagged" : "Locating"}
                </span>
              </div>

              {/* Shutter Capture Button */}
              <button
                type="button"
                id="citizen-report-capture-btn"
                onClick={onCapture}
                className="group relative w-16 h-16 bg-white/20 hover:bg-white/30 backdrop-blur-md border-4 border-white rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95 cursor-pointer"
                aria-label="Capture live photo"
              >
                <div className="w-12 h-12 bg-white rounded-full transition-transform group-hover:scale-95 group-active:scale-90" />
              </button>

              {/* Switch Camera Button (Bottom Thumb-Friendly) */}
              <button
                type="button"
                id="citizen-switch-camera-btn"
                onClick={onSwitchCamera}
                disabled={isSwitchingCamera}
                title="Switch between front and rear camera"
                aria-label="Switch camera"
                className="flex flex-col items-center justify-center gap-1 w-12 h-12 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all border border-white/20 active:scale-95 disabled:opacity-50"
              >
                <SwitchCamera className={`w-5 h-5 text-gray-200 ${isSwitchingCamera ? "animate-spin" : ""}`} />
                <span className="text-[10px] text-gray-300 font-medium">Switch</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. Idle State: Live Camera Only */}
        {isIdle && (
          <div className="p-6 md:p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center mb-4 text-citizen-400 shadow-inner">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="font-display font-semibold text-white text-base mb-1">
              Take Live Waste Photo
            </h3>
            <p className="text-gray-400 text-xs md:text-sm max-w-sm mb-6 leading-relaxed">
              To verify waste issue authenticity, only live camera capture with real-time GPS coordinates is permitted.
            </p>

            {/* Single Focused Action: Open Live Camera */}
            <div className="w-full max-w-xs">
              <button
                type="button"
                id="citizen-take-photo-btn"
                onClick={() => onStartCamera("environment")}
                className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-citizen-500 hover:bg-citizen-400 text-white font-semibold text-sm transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              >
                <Camera className="w-4 h-4 shrink-0" />
                <span>Open Live Camera</span>
              </button>
            </div>

            <div className="flex items-center gap-3 mt-4 text-[11px] text-gray-400">
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Rear Camera Default
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 text-citizen-400" />
                Live GPS Geotagged
              </span>
            </div>
          </div>
        )}

        {/* 4. Requesting Camera State */}
        {isRequesting && (
          <div className="py-14 px-6 flex flex-col items-center justify-center gap-4 text-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-citizen-500/10 border border-citizen-500/20 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-citizen-400 animate-spin" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-white mb-1">
                Opening {isRearCamera ? "Rear Camera" : "Camera"}…
              </p>
              <p className="text-xs text-gray-400">
                Please grant camera and location permissions when prompted by your browser.
              </p>
            </div>
          </div>
        )}

        {/* 5. Permission Denied or Unavailable Fallback View */}
        {isErrorState && (
          <div className="py-8 px-5 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3 text-red-400">
              <VideoOff className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">
              {isDenied ? "Camera Permission Required" : "Live Stream Unavailable"}
            </h3>
            <p className="text-xs text-gray-400 max-w-sm mb-5 leading-relaxed">
              {isDenied
                ? "Camera permission was blocked. Live camera capture is required to submit a report. You can allow camera in browser settings or use your phone's native camera."
                : "Live video feed is unavailable in this browser context (requires HTTPS). You can snap a live photo using your phone's native camera below."}
            </p>

            <div className="w-full max-w-xs space-y-2.5">
              <button
                type="button"
                id="citizen-retry-camera-btn"
                onClick={() => onStartCamera(facingMode || "environment")}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-citizen-500 hover:bg-citizen-400 text-white text-xs font-bold transition-all shadow-md active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Live Camera Again</span>
              </button>

              <button
                type="button"
                id="citizen-native-camera-fallback-btn"
                onClick={onNativeCameraClick}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-card hover:bg-surface-border text-gray-300 hover:text-white text-xs font-semibold border border-surface-border transition-colors"
              >
                <Camera className="w-4 h-4 text-citizen-400" />
                <span>Take Photo with Device Camera</span>
              </button>
            </div>

            {isDenied && (
              <div className="mt-4 p-3 rounded-xl bg-surface-card border border-surface-border/60 text-left text-[11px] text-gray-400 max-w-sm space-y-1">
                <p className="font-semibold text-gray-200">How to unblock camera access:</p>
                <p>1. In your browser's address bar, click the <strong>site info/camera icon</strong> next to <code>localhost:5173</code>.</p>
                <p>2. Toggle <strong>Camera</strong> to <strong>Allow</strong>.</p>
                <p>3. If on Windows, check <em>Windows Settings → Privacy &amp; security → Camera</em> and enable <em>"Let desktop apps access your camera"</em>.</p>
                <p>4. Then click <strong>"Try Live Camera Again"</strong> above.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Row Underneath Captured Image */}
      {isCaptured && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-muted border border-surface-border">
          <button
            type="button"
            id="citizen-retake-photo-btn"
            onClick={onRetake}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-card hover:bg-surface-border border border-surface-border text-white text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-citizen-400" />
            <span>Retake Live Photo</span>
          </button>
          <button
            type="button"
            id="citizen-clear-photo-btn"
            onClick={onRemovePhoto}
            className="text-xs text-red-400 hover:text-red-300 font-medium px-2 py-1 transition-colors"
          >
            Remove Photo
          </button>
        </div>
      )}

      {/* Show Camera Warning / Error Notification */}
      {camError && (
        <div
          id="citizen-report-camera-error"
          className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs md:text-sm"
        >
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 leading-snug">
            <span>{camError}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Location row: shows GPS or manual pin status, address, pin button, refresh button, and error message
function LocationSection({
  isLocationReady,
  locStatus,
  locError,
  displayLabel,
  customLocation,
  onRefresh,
  onOpenMapPicker,
  onResetGps,
}) {
  const isChecking = locStatus === "checking" || locStatus === "saving";
  const isDenied = locStatus === "denied";

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-surface-muted border border-surface-border">
        <div className="flex items-center gap-3 min-w-0">
          <MapPin
            className={`w-5 h-5 shrink-0 ${
              isLocationReady ? "text-citizen-400" : isDenied ? "text-amber-400" : "text-gray-500"
            }`}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-200">
                {customLocation ? "Manually Selected Location (Pin)" : "Live GPS Location"}
              </p>
              {customLocation && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-citizen-500/15 border border-citizen-500/30 text-citizen-400">
                  Custom Pin
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 truncate max-w-sm">
              {isChecking
                ? "Detecting GPS coordinates…"
                : displayLabel || (isDenied ? "Location permission denied" : "Location unavailable")}
            </p>
          </div>

          {/* Status icon: tick or spinner */}
          {isLocationReady && (
            <CheckCircle2 className="w-4 h-4 text-citizen-400 shrink-0" aria-label="Location verified" />
          )}
          {isChecking && <Loader2 className="w-4 h-4 text-gray-400 animate-spin shrink-0" />}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {customLocation ? (
            <button
              type="button"
              onClick={onResetGps}
              className="text-xs text-gray-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-surface-border hover:bg-surface-border transition-colors"
              title="Reset to Device GPS"
            >
              Reset to GPS
            </button>
          ) : null}

          <button
            type="button"
            id="citizen-report-pinpoint-map-btn"
            onClick={onOpenMapPicker}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-card hover:bg-surface-border border border-surface-border text-white text-xs font-semibold transition-colors"
            title="Place pin manually on map"
          >
            <MapPin className="w-3.5 h-3.5 text-citizen-400" />
            <span>{customLocation ? "Adjust Pin" : "Pick on Map"}</span>
          </button>

          {!customLocation && (
            <button
              type="button"
              id="citizen-report-location-refresh-btn"
              onClick={onRefresh}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-border transition-colors"
              title="Refresh GPS Location"
            >
              <Navigation className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Notice shown when location is denied with immediate Pin placement CTA */}
      {isDenied && !customLocation && (
        <div
          id="citizen-report-location-error"
          className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs md:text-sm"
        >
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
            <span>GPS permission was denied. You can manually tap the map to place a pin where the garbage is located.</span>
          </div>
          <button
            type="button"
            onClick={onOpenMapPicker}
            className="shrink-0 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-colors"
          >
            Place Pin
          </button>
        </div>
      )}
    </div>
  );
}

// Interactive Pin inside the MapContainer
function InteractivePin({ coords, onChange }) {
  const map = useMap();
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return coords ? (
    <Marker
      position={[coords.lat, coords.lng]}
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const marker = e.target;
          const pos = marker.getLatLng();
          onChange(pos.lat, pos.lng);
        },
      }}
    />
  ) : null;
}

// Modal dialog with interactive Leaflet map to pinpoint waste location
function MapPinPickerModal({ isOpen, onClose, initialCoords, onConfirm }) {
  if (!isOpen) return null;

  const defaultCoords = initialCoords || { lat: 24.7500, lng: 84.3700 };
  const [selectedCoords, setSelectedCoords] = useState(defaultCoords);
  const [geocoding, setGeocoding] = useState(false);
  const [addressPreview, setAddressPreview] = useState("");

  useEffect(() => {
    let active = true;
    setGeocoding(true);
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${selectedCoords.lat}&lon=${selectedCoords.lng}&format=json&addressdetails=1`,
      {
        headers: { "Accept-Language": "en" },
      }
    )
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        setAddressPreview(d.display_name || `${selectedCoords.lat.toFixed(5)}, ${selectedCoords.lng.toFixed(5)}`);
      })
      .catch(() => {
        if (!active) return;
        setAddressPreview(`${selectedCoords.lat.toFixed(5)}, ${selectedCoords.lng.toFixed(5)}`);
      })
      .finally(() => {
        if (active) setGeocoding(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCoords.lat, selectedCoords.lng]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-citizen-400" />
            <div>
              <h3 className="font-display font-semibold text-white text-base">Pinpoint Waste Location</h3>
              <p className="text-xs text-gray-400">Click anywhere on the map or drag the pin to set the exact spot</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-surface-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Container */}
        <div className="relative h-72 sm:h-80 w-full bg-surface-muted">
          <MapContainer
            center={[defaultCoords.lat, defaultCoords.lng]}
            zoom={15}
            className="w-full h-full"
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <InteractivePin
              coords={selectedCoords}
              onChange={(lat, lng) => setSelectedCoords({ lat, lng })}
            />
          </MapContainer>
        </div>

        {/* Selected Coords & Address bar */}
        <div className="p-4 space-y-3 bg-surface-card border-t border-surface-border">
          <div className="flex items-start gap-2.5 text-xs text-gray-300">
            <Navigation className="w-4 h-4 text-citizen-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white">
                Coordinates: {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
              </p>
              <p className="text-gray-400 truncate text-[11px] mt-0.5">
                {addressPreview || "Locating street address…"}
              </p>
            </div>
            {geocoding && <Loader2 className="w-3.5 h-3.5 animate-spin text-citizen-400 shrink-0" />}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-surface-border text-gray-300 hover:text-white text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              id="citizen-confirm-map-pin-btn"
              onClick={() => {
                onConfirm(selectedCoords.lat, selectedCoords.lng, addressPreview);
                onClose();
              }}
              className="flex-1 px-4 py-2.5 rounded-xl bg-citizen-500 hover:bg-citizen-400 text-white text-xs font-semibold shadow-lg transition-colors"
            >
              Confirm Pin Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

