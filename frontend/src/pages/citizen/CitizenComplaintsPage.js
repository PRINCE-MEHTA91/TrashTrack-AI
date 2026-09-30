import { useState, useEffect } from "react";
import { FileText, Plus, CheckCircle2, Clock, MapPin, Loader2, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "https://trashtrack-ai.onrender.com/api/v1";

const STATUS_CONFIG = {
  SUBMITTED:   { label: "Submitted",   className: "bg-gray-500/15 text-gray-400 border-gray-500/30",          icon: FileText },
  PENDING:     { label: "Pending",     className: "bg-amber-500/15 text-amber-400 border-amber-500/30",       icon: Clock },
  IN_PROGRESS: { label: "In Progress", className: "bg-blue-500/15 text-blue-400 border-blue-500/30",          icon: Clock },
  RESOLVED:    { label: "Resolved",    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  CLOSED:      { label: "Closed",      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  VERIFIED:    { label: "Verified",    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
};

export default function CitizenComplaintsPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const token = getToken();
        if (!token) return;
        const res = await fetch(`${API_URL}/complaints/me?limit=50`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setComplaints(data.complaints);
          }
        }
      } catch (err) {
        console.error("Failed to fetch complaints:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchComplaints();
  }, [getToken]);

  return (
    <div className="p-4 md:p-6 pb-28 lg:pb-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-xl text-white">My Complaints</h1>
          <p className="text-gray-400 text-sm mt-0.5">Track all your submitted waste reports</p>
        </div>
        <button
          id="citizen-complaints-report-btn"
          onClick={() => navigate("/citizen/report")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-citizen-500 hover:bg-citizen-400 text-white font-semibold text-sm transition-all duration-200 shadow-lg hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          New Report
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-citizen-400 animate-spin" />
          <p className="text-gray-400 text-sm">Loading your complaints...</p>
        </div>
      ) : complaints.length === 0 ? (
        <div className="card p-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-citizen-500/10 border border-citizen-500/20 flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-citizen-400/60" />
          </div>
          <h2 className="font-display font-semibold text-white text-lg mb-2">No complaints yet</h2>
          <p className="text-gray-400 text-sm max-w-sm leading-relaxed mb-6">
            You haven't submitted any waste reports yet. Report waste in your area to keep it clean!
          </p>
          <button
            onClick={() => navigate("/citizen/report")}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-citizen-500 hover:bg-citizen-400 text-white font-semibold text-sm transition-all duration-200 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Report Waste Now
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map(complaint => (
            <ComplaintCard key={complaint.id} complaint={complaint} />
          ))}
        </div>
      )}
    </div>
  );
}

function ComplaintCard({ complaint }) {
  const statusInfo = STATUS_CONFIG[complaint.status] || STATUS_CONFIG.SUBMITTED;
  const StatusIcon = statusInfo.icon;
  
  const createdDate = new Date(complaint.created_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
  
  const createdTime = new Date(complaint.created_at).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true
  });
  
  const updatedDate = new Date(complaint.updated_at).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  let currentStep = 1;
  if (["PENDING"].includes(complaint.status)) currentStep = 2;
  if (["IN_PROGRESS"].includes(complaint.status)) currentStep = 3;
  if (["RESOLVED", "CLOSED", "VERIFIED"].includes(complaint.status)) currentStep = 4;

  const labels = ["Submitted", "Assigned", "In Progress", "Resolved"];

  return (
    <div className="card p-5 hover:border-citizen-500/30 transition-colors">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${statusInfo.className.split(" ")[0]} ${statusInfo.className.split(" ")[2]}`}>
            <StatusIcon className={`w-6 h-6 ${statusInfo.className.split(" ")[1]}`} />
          </div>
          <div>
            <h3 className="font-display font-semibold text-white text-lg leading-tight">{complaint.title}</h3>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {complaint.address || "Location unavailable"}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {createdDate}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {createdTime}
              </span>
              <span className="uppercase text-gray-500 font-mono">ID: {complaint.id.split('-')[0]}</span>
            </div>
            {complaint.description && (
              <p className="mt-3 text-sm text-gray-400 line-clamp-2">{complaint.description}</p>
            )}
            
            <div className="mt-3 flex items-center gap-1.5 text-xs">
              <Clock className={`w-3.5 h-3.5 ${currentStep === 4 ? "text-emerald-500/70" : "text-gray-500"}`} />
              <span className={currentStep === 4 ? "text-emerald-400/90 font-medium" : "text-gray-500"}>
                {currentStep === 4 ? "Completed at: " : "Last updated: "}
                {updatedDate}
              </span>
            </div>
          </div>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold shrink-0 w-max ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Progress Tracker */}
      <div className="relative mt-8 mb-2 px-2 md:px-8">
        <div className="absolute top-3 left-6 right-6 md:left-12 md:right-12 h-1 bg-surface-border rounded-full -z-10" />
        <div 
          className="absolute top-3 left-6 md:left-12 h-1 bg-citizen-500 rounded-full transition-all duration-500 -z-10" 
          style={{ width: `calc(${((currentStep - 1) / 3) * 100}% - ${currentStep === 1 ? 0 : 24}px)` }} 
        />
        <div className="flex justify-between">
          {[1, 2, 3, 4].map(step => {
            const isCompleted = step <= currentStep;
            const isCurrent = step === currentStep;
            return (
              <div key={step} className="flex flex-col items-center gap-2 relative group w-1/4">
                <div 
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors bg-surface-card ${
                    isCompleted 
                      ? "border-citizen-500 text-citizen-400" 
                      : "border-surface-border text-gray-600"
                  } ${isCurrent ? "ring-4 ring-citizen-500/20 bg-citizen-500/10" : ""}`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />}
                </div>
                <span className={`text-[10px] sm:text-xs font-medium text-center ${isCurrent ? "text-citizen-400" : isCompleted ? "text-gray-300" : "text-gray-600"}`}>
                  {labels[step-1]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
