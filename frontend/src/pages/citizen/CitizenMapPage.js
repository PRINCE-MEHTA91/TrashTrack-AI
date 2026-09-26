import { Map } from "lucide-react";

export default function CitizenMapPage() {
  return (
    <div className="p-4 md:p-6 pb-28 lg:pb-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-xl text-white">Map</h1>
        <p className="text-gray-400 text-sm mt-0.5">View waste reports in your area</p>
      </div>

      <div className="card p-10 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-citizen-500/10 border border-citizen-500/20 flex items-center justify-center mb-4">
          <Map className="w-8 h-8 text-citizen-400/60" />
        </div>
        <h2 className="font-display font-semibold text-white text-lg mb-2">Interactive Map</h2>
        <p className="text-gray-400 text-sm max-w-sm leading-relaxed">
          Map view showing complaint locations and status in your municipal area is coming soon.
        </p>
      </div>
    </div>
  );
}
