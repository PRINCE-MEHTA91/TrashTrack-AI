import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Landmark,
  Map,
  Grid,
  Activity,
  Layers,
  MapPin,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config/api.js";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Fix Leaflet icon paths in Vite/Webpack builds
try {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
} catch (_) {}

const TABS = [
  { id: "map",        label: "Waste Collection Map",    icon: Map },
  { id: "zones",      label: "Municipal Zones/Wards",   icon: Grid },
  { id: "monitoring", label: "Collection Monitoring",   icon: Activity },
  { id: "categories", label: "Waste Categories",        icon: Layers },
];

const WASTE_CATEGORIES = [
  { name: "Organic Waste",   description: "Food scraps, garden waste, biodegradable materials", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: "🌿" },
  { name: "Plastic Waste",   description: "Bottles, bags, packaging, synthetic materials",      color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20",       icon: "♻️" },
  { name: "Hazardous Waste", description: "Chemicals, batteries, medical, electronic waste",    color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20",         icon: "⚠️" },
  { name: "Bulk Waste",      description: "Furniture, appliances, construction debris",         color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20",     icon: "📦" },
  { name: "Other",           description: "Miscellaneous waste not fitting above categories",   color: "text-gray-400",    bg: "bg-gray-500/10 border-gray-500/20",       icon: "🗑️" },
];

function ComingSoonCard({ label, description }) {
  return (
    <div className="card p-10 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4">
        <Landmark className="w-7 h-7 text-primary-400" />
      </div>
      <h3 className="font-display font-semibold text-white text-lg mb-2">{label}</h3>
      <p className="text-gray-400 text-sm max-w-sm leading-relaxed">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-400 text-xs font-bold">
        API Pending
      </span>
    </div>
  );
}

export default function AdminMunicipalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { getToken } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  const tabParam  = searchParams.get("tab") || "map";
  const activeTab = TABS.find(t => t.id === tabParam)?.id || "map";

  function setTab(id) {
    if (id === "map") setSearchParams({});
    else setSearchParams({ tab: id });
  }

  // Fetch complaints with coordinates for the map
  useEffect(() => {
    if (activeTab !== "map") { setLoading(false); return; }
    async function load() {
      setLoading(true);
      try {
        const token = getToken();
        if (!token) return;
        const res = await fetch(`${API_URL}/complaints/me?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setComplaints((data.complaints || []).filter(c => c.latitude && c.longitude));
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, [getToken, activeTab]);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 id="admin-municipal-title" className="font-display font-bold text-2xl text-white flex items-center gap-2">
          <Landmark className="w-6 h-6 text-primary-400" />
          Municipal Operations
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">
          Manage zones, monitor collection, and track waste categories across the municipality
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-surface-card border border-surface-border rounded-xl overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`admin-municipal-tab-${tab.id}`}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "map" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <MapPin className="w-3.5 h-3.5 text-primary-400" />
            <span>Complaint locations across the municipality — green markers are active reports</span>
          </div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
              <p className="text-gray-400 text-sm">Loading map data…</p>
            </div>
          ) : (
            <div className="card overflow-hidden" style={{ height: "520px" }}>
              <MapContainer
                center={[complaints[0]?.latitude || 19.076, complaints[0]?.longitude || 72.8777]}
                zoom={12}
                style={{ width: "100%", height: "100%" }}
                scrollWheelZoom={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                {complaints.map((c) => (
                  <Marker key={c.id} position={[c.latitude, c.longitude]}>
                    <Popup>
                      <div style={{ minWidth: 160 }}>
                        <strong>{c.title}</strong>
                        <br />
                        <span style={{ fontSize: 12 }}>{c.waste_type} · {c.status}</span>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {["ORGANIC","PLASTIC","HAZARDOUS","BULK"].map(type => {
              const count = complaints.filter(c => c.waste_type === type).length;
              return (
                <div key={type} className="card px-4 py-3 text-center">
                  <p className="font-display font-bold text-xl text-white">{count}</p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{type.toLowerCase()}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "zones" && (
        <ComingSoonCard
          label="Municipal Zones & Wards"
          description="Zone and ward management will be available once the geo-division API is implemented. You'll be able to assign workers to zones and track collection per ward."
        />
      )}

      {activeTab === "monitoring" && (
        <ComingSoonCard
          label="Collection Monitoring"
          description="Real-time collection monitoring will show vehicle locations, collection schedules, and completion rates per zone."
        />
      )}

      {activeTab === "categories" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">All supported waste categories used across complaints and collection operations.</p>
          {WASTE_CATEGORIES.map((cat) => (
            <div key={cat.name} className={`card p-4 flex items-start gap-4 border ${cat.bg} hover:border-primary-500/30 transition-colors`}>
              <span className="text-2xl shrink-0">{cat.icon}</span>
              <div>
                <h3 className={`font-semibold text-sm ${cat.color}`}>{cat.name}</h3>
                <p className="text-gray-400 text-xs mt-0.5">{cat.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
