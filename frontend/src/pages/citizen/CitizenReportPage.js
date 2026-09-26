import { useNavigate } from "react-router-dom";
import { AlertCircle, Camera, MapPin, ArrowLeft, Info } from "lucide-react";

export default function CitizenReportPage() {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6 pb-28 lg:pb-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          id="citizen-report-back-btn"
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

      {/* Coming soon notice */}
      <div className="card p-6 border-l-4 border-l-citizen-500">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-citizen-500/15 border border-citizen-500/30 flex items-center justify-center shrink-0">
            <AlertCircle className="w-6 h-6 text-citizen-400" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-white text-lg">Report Submission</h2>
            <p className="text-gray-400 text-sm mt-1 leading-relaxed">
              The full waste report submission workflow is coming soon. This will include image upload, location selection, and complaint tracking.
            </p>
          </div>
        </div>
      </div>

      {/* Preview of what's coming */}
      <div className="card p-5 space-y-4 opacity-60 pointer-events-none select-none">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Coming Soon — Report Form Preview</span>
        </div>

        {/* Step 1: Upload image */}
        <div className="rounded-xl border-2 border-dashed border-surface-border bg-surface-muted p-8 text-center">
          <Camera className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400">Upload or take a waste photo</p>
          <p className="text-xs text-gray-600 mt-1">JPG, PNG, WEBP up to 10MB</p>
        </div>

        {/* Step 2: Location */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-muted border border-surface-border">
          <MapPin className="w-5 h-5 text-gray-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-400">Confirm Location</p>
            <p className="text-xs text-gray-600">Auto-detected or manually selected</p>
          </div>
        </div>

        {/* Step 3: Description */}
        <div className="p-4 rounded-xl bg-surface-muted border border-surface-border">
          <p className="text-sm font-medium text-gray-400 mb-2">Description (optional)</p>
          <div className="h-16 rounded-lg bg-surface-card border border-surface-border" />
        </div>

        {/* Submit button placeholder */}
        <div className="h-11 rounded-xl bg-citizen-500/30 border border-citizen-500/20 flex items-center justify-center">
          <span className="text-sm font-semibold text-citizen-400/60">Submit Report</span>
        </div>
      </div>
    </div>
  );
}
