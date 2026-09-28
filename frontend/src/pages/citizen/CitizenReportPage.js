import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Camera, MapPin, ArrowLeft, Loader2, Navigation } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "../../context/LocationContext";

const API_URL = import.meta.env.VITE_API_URL || "https://trashtrack-ai.onrender.com/api/v1";

export default function CitizenReportPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { location, displayLabel, status: locStatus, refreshLocation } = useLocation();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    waste_type: "OTHER",
    severity: "MEDIUM",
    image_url: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, image_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

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
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        address: displayLabel !== locationLabelFallback(location) ? displayLabel : undefined,
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
    } catch (err) {
      setError("An error occurred while submitting the report.");
    } finally {
      setSubmitting(false);
    }
  };

  const locationLabelFallback = (loc) => {
    if (!loc) return "";
    return `${Math.abs(loc.latitude).toFixed(4)}°${loc.latitude >= 0 ? "N" : "S"}, ${Math.abs(loc.longitude).toFixed(4)}°${loc.longitude >= 0 ? "E" : "W"}`;
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

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: Upload image */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer rounded-xl border-2 border-dashed border-surface-border bg-surface-muted hover:border-citizen-500/50 transition-colors p-8 text-center relative overflow-hidden group"
        >
          {formData.image_url ? (
            <img src={formData.image_url} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
          ) : (
            <>
              <Camera className="w-10 h-10 text-gray-500 mx-auto mb-3 group-hover:text-citizen-400 transition-colors" />
              <p className="text-sm font-medium text-gray-300">Upload or take a waste photo</p>
              <p className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP up to 10MB</p>
            </>
          )}
          {formData.image_url && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-black/70 px-4 py-2 rounded-lg text-white font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                Change Photo
              </span>
            </div>
          )}
        </div>
        <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />

        {/* Step 2: Location */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-muted border border-surface-border">
          <MapPin className={`w-5 h-5 shrink-0 ${isLocationReady ? "text-citizen-400" : "text-gray-500"}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-300">Detected Location</p>
            <p className="text-xs text-gray-500 truncate">
              {locStatus === "checking" || locStatus === "saving" ? "Detecting..." : displayLabel || "Location unavailable"}
            </p>
          </div>
          <button 
            type="button" 
            onClick={refreshLocation}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-surface-border transition-colors"
            title="Refresh Location"
          >
            <Navigation className="w-4 h-4" />
          </button>
        </div>

        {/* Step 3: Details */}
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
