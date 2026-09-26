import { FileText, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CitizenComplaintsPage() {
  const navigate = useNavigate();
  return (
    <div className="p-4 md:p-6 pb-28 lg:pb-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-xl text-white">My Complaints</h1>
          <p className="text-gray-400 text-sm mt-0.5">Track all your submitted waste reports</p>
        </div>
        <button
          id="citizen-complaints-report-btn"
          onClick={() => navigate("/citizen/report")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-citizen-500 hover:bg-citizen-400 text-white font-semibold text-sm transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          New Report
        </button>
      </div>

      <div className="card p-10 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-citizen-500/10 border border-citizen-500/20 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-citizen-400/60" />
        </div>
        <h2 className="font-display font-semibold text-white text-lg mb-2">Complaints List</h2>
        <p className="text-gray-400 text-sm max-w-sm leading-relaxed">
          Full complaint listing with status tracking, filtering, and detail view is coming soon.
        </p>
      </div>
    </div>
  );
}
