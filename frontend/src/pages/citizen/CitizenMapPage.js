import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "../../context/LocationContext";

// Fix Leaflet default icons just in case, though we use custom icons mostly
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const API_URL = import.meta.env.VITE_API_URL || "https://trashtrack-ai.onrender.com/api/v1";

const STATUS_COLORS = {
  SUBMITTED:   "#64748b", // gray-500
  PENDING:     "#f59e0b", // amber-500
  IN_PROGRESS: "#3b82f6", // blue-500
  RESOLVED:    "#10b981", // emerald-500
  CLOSED:      "#10b981",
  VERIFIED:    "#10b981",
};

const createStatusIcon = (status) => {
  const color = STATUS_COLORS[status] || STATUS_COLORS.SUBMITTED;
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 3px 6px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

const userIcon = L.divIcon({
  className: 'custom-leaflet-icon',
  html: `<div style="
    background-color: #3b82f6;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.4);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8]
});

export default function CitizenMapPage() {
  const { getToken } = useAuth();
  const { location: userLocation } = useLocation();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const token = getToken();
        if (!token) return;
        const res = await fetch(`${API_URL}/complaints/me?limit=100`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setComplaints(data.complaints.filter(c => c.latitude && c.longitude));
          }
        }
      } catch (err) {
        console.error("Failed to fetch complaints for map:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchComplaints();
  }, [getToken]);

  // Determine initial center
  const initialCenter = complaints.length > 0 
    ? [complaints[0].latitude, complaints[0].longitude] 
    : userLocation 
      ? [userLocation.latitude, userLocation.longitude] 
      : [20.5937, 78.9629]; // Default fallback

  return (
    <div className="p-4 md:p-6 pb-28 lg:pb-6 max-w-5xl mx-auto space-y-6 h-[calc(100vh-100px)] flex flex-col">
      <div className="shrink-0">
        <h1 className="font-display font-bold text-xl text-white">Interactive Map</h1>
        <p className="text-gray-400 text-sm mt-0.5">Explore your reported waste issues across the area</p>
      </div>

      <div className="flex-1 card overflow-hidden border-surface-border relative rounded-xl shadow-lg" style={{ minHeight: "500px" }}>
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-card z-10">
            <Loader2 className="w-8 h-8 text-citizen-400 animate-spin mb-4" />
            <p className="text-gray-400 text-sm">Loading map data...</p>
          </div>
        ) : (
          <MapContainer 
            center={initialCenter} 
            zoom={13} 
            scrollWheelZoom={true} 
            style={{ height: "100%", width: "100%", zIndex: 0 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* User Location */}
            {userLocation && (
              <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon}>
                <Popup>
                  <div className="font-semibold text-gray-900 text-center">You are here</div>
                </Popup>
              </Marker>
            )}

            {/* Complaint Markers */}
            {complaints.map(complaint => (
              <Marker 
                key={complaint.id} 
                position={[complaint.latitude, complaint.longitude]}
                icon={createStatusIcon(complaint.status)}
              >
                <Popup className="citizen-map-popup">
                  <div className="p-1 min-w-[200px] max-w-[240px]">
                    <div className="font-bold text-gray-900 mb-1">{complaint.title}</div>
                    <div className="text-xs text-gray-600 mb-2 leading-tight">
                      {complaint.address || "Location unavailable"}
                    </div>
                    
                    {complaint.image_url && (
                      <img 
                        src={complaint.image_url} 
                        alt="Reported waste" 
                        className="w-full h-32 object-cover rounded-lg mb-3 shadow-sm border border-gray-200" 
                      />
                    )}
                    
                    <div className="flex justify-between items-center mt-1 border-t border-gray-100 pt-2">
                      <span className="text-[10px] text-gray-500 font-mono tracking-wide">
                        {new Date(complaint.created_at).toLocaleDateString()}
                      </span>
                      <span 
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase" 
                        style={{
                          backgroundColor: `${STATUS_COLORS[complaint.status] || STATUS_COLORS.SUBMITTED}15`,
                          color: STATUS_COLORS[complaint.status] || STATUS_COLORS.SUBMITTED
                        }}
                      >
                        {complaint.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
