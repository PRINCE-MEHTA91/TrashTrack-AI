import { useState, useRef } from "react";
import { User, Mail, Shield, Calendar, CheckCircle2, MapPin, Edit2, Save, Camera, Phone, Home, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { CitizenAvatar } from "../../components/citizen/CitizenLayout";

const API_URL = import.meta.env.VITE_API_URL;

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function CitizenProfilePage() {
  const { user, getToken, refetch } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: user?.full_name || "",
    phone_number: user?.phone_number || "",
    address: user?.address || "",
    profile_image: user?.profile_image || ""
  });
  
  const fileInputRef = useRef(null);

  const initials = getInitials(user?.full_name);

  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const accountStatus = user?.status ?? "active";
  const isActive = accountStatus === "active";

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, profile_image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (formData.phone_number && formData.phone_number.trim() !== "") {
      const cleanPhone = formData.phone_number.trim();
      if (!/^\d{10}$/.test(cleanPhone)) {
        alert("Please enter exactly a 10-digit phone number.");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          phone_number: formData.phone_number,
          address: formData.address,
          profile_image: formData.profile_image
        }),
      });

      if (res.ok) {
        await refetch();
        setIsEditing(false);
      } else {
        const errorData = await res.json();
        alert(`Failed to save profile: ${errorData.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 pb-28 lg:pb-6 max-w-2xl mx-auto space-y-6">
      {/* Profile card */}
      <div className="card p-6 flex flex-col items-center text-center gap-4 relative">
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="absolute top-4 right-4 p-2 rounded-xl bg-surface-muted hover:bg-surface-border transition-colors text-gray-400 hover:text-white"
            title="Edit Profile"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving}
            className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-citizen-500 hover:bg-citizen-400 transition-colors text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save"}
          </button>
        )}

        {/* Large avatar */}
        <div className="relative group">
          <div 
            className={`w-24 h-24 rounded-full bg-gradient-to-br from-citizen-500 to-citizen-700 flex items-center justify-center text-3xl font-bold text-white ring-4 ring-citizen-500/20 overflow-hidden ${(!isEditing && formData.profile_image) ? "cursor-pointer hover:ring-citizen-400 transition-all" : ""}`}
            onClick={() => {
              if (!isEditing && formData.profile_image) {
                setIsImageViewerOpen(true);
              }
            }}
            title={(!isEditing && formData.profile_image) ? "Click to view image" : ""}
          >
            {formData.profile_image ? (
              <img src={formData.profile_image} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          {isEditing && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Camera className="w-6 h-6 text-white" />
            </button>
          )}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleImageChange}
          />
        </div>

        <div className="space-y-2 w-full max-w-sm">
          {isEditing ? (
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              className="w-full bg-surface-muted border border-surface-border rounded-lg px-3 py-2 text-white text-center font-display font-bold text-xl focus:outline-none focus:border-citizen-500"
              placeholder="Full Name"
            />
          ) : (
            <h1 id="citizen-profile-name" className="font-display font-bold text-xl text-white">
              {user?.full_name ?? "—"}
            </h1>
          )}
          <p className="text-gray-400 text-sm">{user?.email ?? "—"}</p>
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-citizen-500/15 border border-citizen-500/30 text-citizen-400 text-xs font-bold">
              Citizen
            </span>
            <span
              id="citizen-profile-status"
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                isActive
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-red-500/15 border-red-500/30 text-red-400"
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              {isActive ? "Active" : accountStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Account details */}
      <div className="card p-5 space-y-1">
        <h2 className="font-display font-semibold text-white text-sm mb-3">Account Details</h2>

        <ProfileRow icon={User} label="Full Name" value={user?.full_name} />
        <ProfileRow icon={Mail} label="Email Address" value={user?.email} />
        
        {isEditing ? (
          <div className="flex items-center gap-3 py-2.5 border-b border-surface-border">
            <div className="w-8 h-8 rounded-lg bg-surface-muted border border-surface-border flex items-center justify-center shrink-0">
              <Phone className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-1">Phone Number</p>
              <input
                type="text"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleInputChange}
                className="w-full bg-surface-card border border-surface-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-citizen-500"
                placeholder="Enter phone number"
              />
            </div>
          </div>
        ) : (
          <ProfileRow icon={Phone} label="Phone Number" value={user?.phone_number} />
        )}

        {isEditing ? (
          <div className="flex items-center gap-3 py-2.5 border-b border-surface-border">
            <div className="w-8 h-8 rounded-lg bg-surface-muted border border-surface-border flex items-center justify-center shrink-0">
              <Home className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-1">Address</p>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full bg-surface-card border border-surface-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-citizen-500"
                placeholder="Enter address"
              />
            </div>
          </div>
        ) : (
          <ProfileRow icon={Home} label="Address" value={user?.address} />
        )}

        <ProfileRow icon={Shield} label="Role" value="Citizen" highlight />
        <ProfileRow
          icon={CheckCircle2}
          label="Account Status"
          value={isActive ? "Active" : accountStatus}
          highlight={isActive}
        />
        <ProfileRow icon={MapPin} label="Municipal Zone" value={user?.municipality_name ?? "—"} note={!user?.municipality_name ? "[To be assigned by admin]" : undefined} />
        <ProfileRow icon={Calendar} label="Member Since" value={joinedDate} />
      </div>

      {/* Full-screen image viewer */}
      {isImageViewerOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setIsImageViewerOpen(false)}
        >
          <button 
            onClick={() => setIsImageViewerOpen(false)}
            className="absolute top-6 right-6 p-2 rounded-full bg-surface-muted/50 hover:bg-surface-muted text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={formData.profile_image} 
            alt="Profile Full View" 
            className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl animate-in fade-in zoom-in duration-200" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function ProfileRow({ icon: Icon, label, value, highlight, note }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-surface-border last:border-0">
      <div className="w-8 h-8 rounded-lg bg-surface-muted border border-surface-border flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-sm font-medium truncate ${highlight ? "text-citizen-400" : "text-white"}`}>
          {value ?? "—"}
          {note && <span className="ml-1 text-xs text-gray-500">{note}</span>}
        </p>
      </div>
    </div>
  );
}
