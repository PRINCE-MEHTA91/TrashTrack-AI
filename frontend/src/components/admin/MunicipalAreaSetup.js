import { useState, useEffect, useCallback } from "react";
import { Search, Loader2, Map as MapIcon, CheckCircle2, ShieldAlert, Save, Layers } from "lucide-react";
import { API_URL } from "../../config/api.js";
import { useAuth } from "../../context/AuthContext";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";

if (!L.Icon.Default.prototype._iconFixed) {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
  L.Icon.Default.prototype._iconFixed = true;
}

function MapUpdater({ geojson }) {
  const map = useMap();
  useEffect(() => {
    if (geojson) {
      const layer = L.geoJSON(geojson);
      map.fitBounds(layer.getBounds(), { padding: [20, 20] });
    }
  }, [geojson, map]);
  return null;
}

export default function MunicipalAreaSetup() {
  const { getToken } = useAuth();
  
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  
  const [selectedArea, setSelectedArea] = useState(null);
  const [isDiscoveringWards, setIsDiscoveringWards] = useState(false);
  const [wards, setWards] = useState([]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [myMunicipality, setMyMunicipality] = useState(null);
  const [loadingMyMuni, setLoadingMyMuni] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const fetchMyMuni = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/municipalities/my`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyMunicipality(data.municipality);
      }
    } catch (e) {} finally {
      setLoadingMyMuni(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchMyMuni();
  }, [fetchMyMuni]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    setSelectedArea(null);
    setWards([]);
    try {
      const res = await fetch(`${API_URL}/municipalities/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (e) {
      alert("Error searching location");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectArea = async (place) => {
    setSelectedArea(place);
    setWards([]);
    setIsDiscoveringWards(true);
    try {
      const res = await fetch(`${API_URL}/municipalities/discover-wards?osm_id=${place.osm_id}&osm_type=${place.osm_type}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWards(data.wards || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDiscoveringWards(false);
    }
  };

  const handleSave = async () => {
    if (!selectedArea) return;
    setIsSaving(true);
    
    // Attempt to parse state/district from display_name
    const parts = selectedArea.display_name.split(",").map(p => p.trim());
    const state = parts.length >= 2 ? parts[parts.length - 2] : "Unknown State";
    const district = parts.length >= 3 ? parts[parts.length - 3] : "Unknown District";
    
    const payload = {
      state,
      district,
      name: selectedArea.name || parts[0],
      geojson: selectedArea.geojson,
      bbox: selectedArea.boundingbox,
      source: "OSM/Nominatim",
      isVerified: true,
      wards
    };

    try {
      const res = await fetch(`${API_URL}/municipalities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok) {
        alert("Municipal Area Setup Successful!");
        window.location.reload(); // Reload to refresh AdminLayout header and Overview
      } else {
        alert("Failed to save: " + data.message);
      }
    } catch (e) {
      alert("Error saving municipal area");
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingMyMuni) {
    return <div className="flex items-center gap-2 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /> Loading configuration...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="card p-6 space-y-4">
        <h2 className="font-display font-semibold text-white text-base flex items-center gap-2">
          <MapIcon className="w-5 h-5 text-primary-400" />
          Municipal Area Discovery & Setup
        </h2>
        
        {myMunicipality && !isEditing ? (
          <div className="space-y-4">
            <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-white font-medium">Currently Configured: {myMunicipality.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{myMunicipality.district}, {myMunicipality.state}</p>
                  <p className="text-xs text-primary-300 mt-1 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    {myMunicipality.wards?.length || 0} Wards discovered & stored
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 rounded-lg bg-surface-muted hover:bg-surface-border transition-colors text-xs font-semibold text-white border border-surface-border"
              >
                Change Area
              </button>
            </div>
            {myMunicipality.geojson && (
              <div className="h-[300px] rounded-xl overflow-hidden border border-surface-border relative z-0">
                <MapContainer style={{ width: "100%", height: "100%" }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                  <GeoJSON data={myMunicipality.geojson} style={{ color: "#10b981", weight: 2, fillOpacity: 0.1 }} />
                  {myMunicipality.wards?.map(w => (
                    <GeoJSON key={w.id} data={w.geojson || w.boundary} style={{ color: "#3b82f6", weight: 1, fillOpacity: 0.05 }} />
                  ))}
                  <MapUpdater geojson={myMunicipality.geojson} />
                </MapContainer>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {myMunicipality && (
               <div className="flex justify-end">
                 <button onClick={() => setIsEditing(false)} className="text-xs text-gray-400 hover:text-white transition-colors">Cancel Edit</button>
               </div>
            )}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="e.g. Raghogarh, Guna, Madhya Pradesh"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-surface-muted border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:border-primary-500 focus:outline-none"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
              <button
                type="submit"
                disabled={isSearching || !query}
                className="bg-primary-500 hover:bg-primary-400 text-white px-4 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search
              </button>
            </form>

            {searchResults.length > 0 && !selectedArea && (
              <div className="bg-surface-muted border border-surface-border rounded-xl divide-y divide-surface-border overflow-hidden">
                {searchResults.map((res) => (
                  <button
                    key={res.place_id}
                    onClick={() => handleSelectArea(res)}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex flex-col"
                  >
                    <span className="text-sm font-medium text-white">{res.name}</span>
                    <span className="text-xs text-gray-400 truncate">{res.display_name}</span>
                    <span className="text-[10px] text-primary-400 mt-1">Type: {res.type} | Class: {res.class} {res.geojson ? "| Has Boundary" : ""}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedArea && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-semibold text-white text-lg">{selectedArea.name}</h3>
              <p className="text-sm text-gray-400">{selectedArea.display_name}</p>
            </div>
            <button
              onClick={() => setSelectedArea(null)}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="h-[300px] rounded-xl overflow-hidden border border-surface-border relative z-0">
            {selectedArea.geojson ? (
              <MapContainer center={[selectedArea.lat, selectedArea.lon]} zoom={12} style={{ width: "100%", height: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                <GeoJSON data={selectedArea.geojson} style={{ color: "#10b981", weight: 2, fillOpacity: 0.1 }} />
                {wards.map(w => (
                  <GeoJSON key={w.id} data={w.geojson} style={{ color: "#3b82f6", weight: 1, fillOpacity: 0.05 }} />
                ))}
                <MapUpdater geojson={selectedArea.geojson} />
              </MapContainer>
            ) : (
              <div className="w-full h-full bg-surface-muted flex items-center justify-center text-gray-500 text-sm">
                No boundary data available in OSM for this location.
              </div>
            )}
          </div>

          <div className="bg-surface-muted border border-surface-border rounded-xl p-4 flex items-start justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Ward Discovery
              </h4>
              {isDiscoveringWards ? (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Querying Overpass API for wards...</p>
              ) : wards.length > 0 ? (
                <p className="text-xs text-blue-300 mt-1">Found {wards.length} wards with boundary data.</p>
              ) : (
                <div className="mt-1">
                  <p className="text-xs text-amber-400 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Ward boundary data unavailable.</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">We will save the main municipality boundary. Wards can be imported later.</p>
                </div>
              )}
            </div>
            
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary-500 hover:bg-primary-400 text-white px-4 py-2 rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center gap-2 transition-colors shrink-0"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Review & Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
