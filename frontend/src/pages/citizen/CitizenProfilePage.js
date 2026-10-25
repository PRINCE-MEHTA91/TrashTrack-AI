import { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Shield,
  Calendar,
  CheckCircle2,
  MapPin,
  Edit2,
  Save,
  Camera,
  Phone,
  Home,
  X,
  Navigation,
  Bot,
  Ticket,
  PhoneCall,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  Send,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  FileQuestion,
  Headphones,
  Clock,
  Loader2,
  LifeBuoy,
  Check,
  AlertCircle,
  FileText,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "../../context/LocationContext";
import { API_URL } from "../../config/api.js";

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const PROFILE_SECTIONS = [
  {
    id: "personal",
    title: "Personal Details",
    subtitle: "Profile & Identity",
    icon: User,
    badge: null,
  },
  {
    id: "help",
    title: "Help Assistant",
    subtitle: "AI Support Guide",
    icon: Bot,
    badge: "AI",
  },
  {
    id: "tickets",
    title: "My Support Tickets",
    subtitle: "Inquiries & Issues",
    icon: Ticket,
    badge: null,
  },
  {
    id: "contact",
    title: "Contact Support",
    subtitle: "Helpline & Office",
    icon: PhoneCall,
    badge: "24/7",
  },
  {
    id: "problem",
    title: "Report a Problem",
    subtitle: "App / Tech Issues",
    icon: AlertTriangle,
    badge: null,
  },
  {
    id: "faqs",
    title: "FAQs",
    subtitle: "Common Answers",
    icon: HelpCircle,
    badge: "Help",
  },
];

const INITIAL_FAQS = [
  {
    q: "How do I report garbage or waste in my area?",
    a: "Click 'Report Waste' from your navigation bar or home screen. Take a live photo of the waste pile using your device's camera, confirm your GPS coordinates or select your location on the map, choose the waste category (Organic, Plastic, Hazardous, Bulk, Other), and click 'Submit Verified Report'.",
    cat: "reporting",
  },
  {
    q: "How does TrashTrack AI assign workers to my complaints?",
    a: "TrashTrack AI uses PostGIS spatial proximity algorithms to locate the nearest active, available municipal worker within your ward or service radius. If a worker is available, an instant assignment offer is dispatched. If no eligible worker is nearby, the complaint is queued for administrator assignment.",
    cat: "workers",
  },
  {
    q: "Can I delete a complaint after I raise it?",
    a: "Yes! As the citizen who submitted the complaint, you have exclusive control to delete your complaint from either 'My Complaints' or the 'Community Complaints' details view. No other citizen or worker can delete your report. Once a cleanup is verified and closed by administrators, deletion is locked to preserve municipal audit records.",
    cat: "reporting",
  },
  {
    q: "Why is GPS location required for reporting?",
    a: "Accurate GPS coordinates ensure that municipal sanitation workers and collection trucks navigate directly to the exact pile. It also maps your complaint to the correct municipal ward and administrative jurisdiction.",
    cat: "account",
  },
  {
    q: "What waste categories are supported?",
    a: "TrashTrack AI supports five standardized categories: Organic (kitchen/food waste, leaves), Plastic (packaging, bottles, polythene), Hazardous (batteries, chemical containers, e-waste), Bulk / Debris (furniture, demolition debris, construction rubble), and Other (mixed municipal solid waste).",
    cat: "reporting",
  },
  {
    q: "How does cleanup verification work?",
    a: "Once an assigned worker finishes cleaning up the reported site, they must submit resolution notes and an on-site completion photo. The municipal administrator inspects the photo evidence. If satisfied, they approve and verify the cleanup; if incomplete, rework is requested from the worker.",
    cat: "workers",
  },
  {
    q: "Will I receive real-time notifications about my reports?",
    a: "Yes! TrashTrack AI sends real-time Server-Sent Event (SSE) updates to your notification bell for key events: submission confirmation, worker assignment, worker starting work, progress notes, cleanup completion photos, and administrative verification.",
    cat: "account",
  },
  {
    q: "How can I update my phone number or residential address?",
    a: "Click on 'Personal Details' at the top of this page, click the 'Edit Profile' button, enter your updated 10-digit mobile number or address, and click 'Save'. Your profile is updated instantly across the municipal system.",
    cat: "account",
  },
];

const INITIAL_TICKETS = [
  {
    id: "TT-8421",
    subject: "Collection route schedule timing inquiry for Ward 4",
    category: "General Query",
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    createdAt: "2026-10-24T10:30:00Z",
    response: "Municipal sanitation supervisor has reviewed your area schedule. Regular morning collection runs between 7:30 AM and 9:00 AM.",
  },
  {
    id: "TT-6219",
    subject: "Request to verify household residential ward boundary",
    category: "Zone Dispute",
    priority: "LOW",
    status: "RESOLVED",
    createdAt: "2026-10-22T14:15:00Z",
    response: "Your municipal boundary was verified with Ward 3 GIS mapping. No changes needed.",
  },
];

export default function CitizenProfilePage() {
  const { user, getToken, refetch } = useAuth();
  const { displayLabel } = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active section management (sync with ?section= query param)
  const initialSection = searchParams.get("section") || "personal";
  const [activeSection, setActiveSection] = useState(
    PROFILE_SECTIONS.some((s) => s.id === initialSection) ? initialSection : "personal"
  );

  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
    setSearchParams({ section: sectionId });
  };

  // Personal details state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || "",
    phone_number: user?.phone_number || "",
    address: user?.address || "",
    profile_image: user?.profile_image || "",
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
          profile_image: formData.profile_image,
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
    <div className="p-4 md:p-6 pb-28 lg:pb-6 max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Citizen Profile & Support</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          Manage your personal identity, access dedicated municipal support, and resolve inquiries.
        </p>
      </div>

      {/* ── 6 SECTIONS IN A SINGLE HORIZONTAL ROW ── */}
      <div className="w-full">
        <div className="flex items-stretch gap-2.5 sm:gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-surface-border scrollbar-track-transparent snap-x snap-mandatory">
          {PROFILE_SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isSelected = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                id={`citizen-profile-section-${sec.id}`}
                onClick={() => handleSectionChange(sec.id)}
                className={`flex-1 min-w-[135px] sm:min-w-[145px] p-3.5 rounded-2xl border text-left transition-all duration-200 snap-start flex flex-col justify-between group cursor-pointer ${
                  isSelected
                    ? "bg-citizen-500/15 border-citizen-500 shadow-glow-sm ring-1 ring-citizen-500/40"
                    : "bg-surface-card border-surface-border hover:border-citizen-500/30 hover:bg-surface-muted/60"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-citizen-500 text-white"
                        : "bg-surface-muted text-gray-400 group-hover:text-citizen-400 group-hover:bg-citizen-500/10"
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  {sec.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                        isSelected
                          ? "bg-citizen-500/20 text-citizen-300 border-citizen-500/40"
                          : "bg-surface-muted text-gray-400 border-surface-border"
                      }`}
                    >
                      {sec.badge}
                    </span>
                  )}
                </div>
                <div>
                  <h4
                    className={`text-xs font-bold leading-tight ${
                      isSelected ? "text-white" : "text-gray-200 group-hover:text-white"
                    }`}
                  >
                    {sec.title}
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">{sec.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SECTION CONTENTS ── */}

      {/* 1. PERSONAL DETAILS SECTION */}
      {activeSection === "personal" && (
        <div className="space-y-6 animate-fade-in">
          {/* Profile card */}
          <div className="card p-6 flex flex-col items-center text-center gap-4 relative">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-surface-muted hover:bg-surface-border transition-colors text-gray-400 hover:text-white cursor-pointer"
                title="Edit Profile"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-citizen-500 hover:bg-citizen-400 transition-colors text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save"}
              </button>
            )}

            {/* Large avatar */}
            <div className="relative group">
              <div
                className={`w-24 h-24 rounded-full bg-gradient-to-br from-citizen-500 to-citizen-700 flex items-center justify-center text-3xl font-bold text-white ring-4 ring-citizen-500/20 overflow-hidden ${
                  !isEditing && formData.profile_image
                    ? "cursor-pointer hover:ring-citizen-400 transition-all"
                    : ""
                }`}
                onClick={() => {
                  if (!isEditing && formData.profile_image) {
                    setIsImageViewerOpen(true);
                  }
                }}
                title={!isEditing && formData.profile_image ? "Click to view image" : ""}
              >
                {formData.profile_image ? (
                  <img
                    src={formData.profile_image}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              {isEditing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
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
                <h2 id="citizen-profile-name" className="font-display font-bold text-xl text-white">
                  {user?.full_name ?? "—"}
                </h2>
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
            <h3 className="font-display font-semibold text-white text-sm mb-3">Account Details</h3>

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
            <ProfileRow
              icon={MapPin}
              label="Municipal Zone"
              value={user?.municipality_name ?? "—"}
              note={!user?.municipality_name ? "[To be assigned by admin]" : undefined}
            />
            <ProfileRow
              icon={Navigation}
              label="Detected Location"
              value={displayLabel}
              note={!displayLabel ? "[Enable location to detect]" : undefined}
            />
            <ProfileRow icon={Calendar} label="Member Since" value={joinedDate} />
          </div>
        </div>
      )}

      {/* 2. HELP ASSISTANT SECTION */}
      {activeSection === "help" && <HelpAssistantSection onReport={() => navigate("/citizen/report")} />}

      {/* 3. MY SUPPORT TICKETS SECTION */}
      {activeSection === "tickets" && <SupportTicketsSection />}

      {/* 4. CONTACT SUPPORT SECTION */}
      {activeSection === "contact" && <ContactSupportSection />}

      {/* 5. REPORT A PROBLEM SECTION */}
      {activeSection === "problem" && (
        <ReportProblemSection onReportWaste={() => navigate("/citizen/report")} />
      )}

      {/* 6. FAQS SECTION */}
      {activeSection === "faqs" && (
        <FaqSection onContactSupport={() => handleSectionChange("contact")} />
      )}

      {/* Full-screen image viewer */}
      {isImageViewerOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setIsImageViewerOpen(false)}
        >
          <button
            onClick={() => setIsImageViewerOpen(false)}
            className="absolute top-6 right-6 p-2 rounded-full bg-surface-muted/50 hover:bg-surface-muted text-white transition-colors cursor-pointer"
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

// ── Profile row helper component ──────────────────────────────
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

// ── 2. Help Assistant Component ───────────────────────────────
function HelpAssistantSection({ onReport }) {
  const [selectedTopic, setSelectedTopic] = useState(0);
  const [userQuery, setUserQuery] = useState("");
  const [customAnswer, setCustomAnswer] = useState(null);

  const TOPICS = [
    {
      q: "How to report waste with live photo & GPS?",
      a: "1. Navigate to 'Report Waste'.\n2. Allow camera & GPS permissions to capture real-time photo evidence.\n3. Verify your location on the map.\n4. Select the waste category and submit. A nearby worker is instantly assigned.",
      actionLabel: "Open Report Waste",
      action: onReport,
    },
    {
      q: "How does worker nearest assignment work?",
      a: "TrashTrack AI computes the real-time distance using PostGIS geography functions between your waste report and available active sanitation workers. The closest active worker receives an assignment offer.",
    },
    {
      q: "Can I delete or cancel my complaint?",
      a: "Yes! If you made a mistake or the issue is already resolved, open your complaint from 'My Complaints' and click 'Delete Complaint'. Only you as the creator can delete it.",
    },
    {
      q: "How does Admin cleanup verification work?",
      a: "When a worker marks a task complete, they submit resolution notes and evidence photos. Municipal administrators inspect the photos before marking the complaint officially verified.",
    },
    {
      q: "What waste categories should I pick?",
      a: "• Organic: Food/kitchen waste, biodegradable matter.\n• Plastic: Packaging, polythene, bottles.\n• Hazardous: Chemicals, batteries, medical/e-waste.\n• Bulk: Construction debris, bulky rubble.",
    },
  ];

  const handleAsk = (e) => {
    e.preventDefault();
    if (!userQuery.trim()) return;

    const lower = userQuery.toLowerCase();
    if (lower.includes("delete") || lower.includes("cancel")) {
      setCustomAnswer(
        "You can delete any complaint you submitted by going to 'My Complaints' and clicking the Delete button on the complaint card. Strictly only you can delete your reports."
      );
    } else if (lower.includes("worker") || lower.includes("assign")) {
      setCustomAnswer(
        "Workers are matched automatically based on nearest GPS proximity within your municipal zone. If no worker is available, administrators can assign one manually."
      );
    } else if (lower.includes("photo") || lower.includes("camera") || lower.includes("report")) {
      setCustomAnswer(
        "When reporting waste, the app requires live camera capture to prevent fraudulent or outdated photos. GPS coordinates are automatically embedded."
      );
    } else {
      setCustomAnswer(
        `Thank you for asking about "${userQuery}". For immediate municipal assistance, you can also check our FAQs or contact the 24/7 municipal helpline.`
      );
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Bot introduction banner */}
      <div className="card p-6 bg-gradient-to-br from-citizen-950/40 via-surface-card to-surface-card border-citizen-500/20 relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-citizen-500/20 border border-citizen-500/30 flex items-center justify-center text-citizen-400 shrink-0">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-white text-base">TrashTrack Help Assistant</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-citizen-500/15 border border-citizen-500/30 text-citizen-300 text-[10px] font-bold">
                <Sparkles className="w-2.5 h-2.5" /> AI Powered
              </span>
            </div>
            <p className="text-gray-400 text-xs mt-1 leading-relaxed">
              Ask questions about waste segregation, reporting workflows, worker assignment, and cleanup verification.
            </p>
          </div>
        </div>
      </div>

      {/* Quick topic pills */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quick Topics</p>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((topic, i) => (
            <button
              key={i}
              onClick={() => {
                setSelectedTopic(i);
                setCustomAnswer(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                selectedTopic === i && !customAnswer
                  ? "bg-citizen-500/20 border-citizen-500/40 text-citizen-300 shadow-sm"
                  : "bg-surface-card border-surface-border text-gray-400 hover:text-white hover:bg-surface-muted"
              }`}
            >
              {topic.q}
            </button>
          ))}
        </div>
      </div>

      {/* Answer display card */}
      <div className="card p-5 border-citizen-500/20 bg-surface-card/90 space-y-3">
        <div className="flex items-center gap-2 text-citizen-400 font-semibold text-sm">
          <Sparkles className="w-4 h-4" />
          <span>{customAnswer ? "Assistant Answer" : TOPICS[selectedTopic].q}</span>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
          {customAnswer ? customAnswer : TOPICS[selectedTopic].a}
        </p>
        {TOPICS[selectedTopic].action && !customAnswer && (
          <div className="pt-2">
            <button
              onClick={TOPICS[selectedTopic].action}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-citizen-500 hover:bg-citizen-400 text-white font-semibold text-xs transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> {TOPICS[selectedTopic].actionLabel}
            </button>
          </div>
        )}
      </div>

      {/* Ask box */}
      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          type="text"
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          placeholder="Ask a question about TrashTrack AI..."
          className="flex-1 bg-surface-card border border-surface-border rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-citizen-500"
        />
        <button
          type="submit"
          className="px-4 py-2.5 rounded-xl bg-citizen-500 hover:bg-citizen-400 text-white font-semibold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Ask</span>
        </button>
      </form>
    </div>
  );
}

// ── 3. My Support Tickets Component ───────────────────────────
function SupportTicketsSection() {
  const [tickets, setTickets] = useState(() => {
    try {
      const saved = localStorage.getItem("tt_citizen_tickets");
      return saved ? JSON.parse(saved) : INITIAL_TICKETS;
    } catch {
      return INITIAL_TICKETS;
    }
  });

  const [filter, setFilter] = useState("all");
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("General Query");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newDescription, setNewDescription] = useState("");
  const [banner, setBanner] = useState("");

  const handleCreateTicket = (e) => {
    e.preventDefault();
    if (!newSubject.trim()) return;

    const newTicket = {
      id: `TT-${Math.floor(1000 + Math.random() * 9000)}`,
      subject: newSubject.trim(),
      category: newCategory,
      priority: newPriority,
      status: "OPEN",
      createdAt: new Date().toISOString(),
      response: "Ticket received. Municipal support officer will review within 24 hours.",
    };

    const updated = [newTicket, ...tickets];
    setTickets(updated);
    try {
      localStorage.setItem("tt_citizen_tickets", JSON.stringify(updated));
    } catch {}

    setShowNewModal(false);
    setNewSubject("");
    setNewDescription("");
    setBanner(`Ticket ${newTicket.id} registered successfully!`);
    setTimeout(() => setBanner(""), 5000);
  };

  const filteredTickets = tickets.filter((t) => {
    if (filter === "open") return t.status === "OPEN";
    if (filter === "in_progress") return t.status === "IN_PROGRESS";
    if (filter === "resolved") return t.status === "RESOLVED";
    return true;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-white text-base">My Support Tickets</h3>
          <p className="text-gray-400 text-xs">Track municipal inquiries and citizen support requests</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-citizen-500 hover:bg-citizen-400 text-white font-semibold text-xs transition-all shadow-md cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" /> Create New Ticket
        </button>
      </div>

      {banner && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{banner}</span>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2 border-b border-surface-border pb-2 text-xs">
        {["all", "open", "in_progress", "resolved"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-colors cursor-pointer ${
              filter === f
                ? "bg-citizen-500/15 text-citizen-400 font-bold"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {filteredTickets.length === 0 ? (
          <div className="card p-8 text-center text-gray-500 text-xs">
            No support tickets match this filter.
          </div>
        ) : (
          filteredTickets.map((t) => (
            <div key={t.id} className="card p-4 space-y-2 border-surface-border hover:border-citizen-500/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-citizen-400">{t.id}</span>
                    <span className="text-gray-500 text-xs">•</span>
                    <span className="text-xs text-gray-400 font-medium">{t.category}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white mt-1">{t.subject}</h4>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
                    t.status === "RESOLVED"
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                      : t.status === "IN_PROGRESS"
                      ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                      : "bg-amber-500/15 border-amber-500/30 text-amber-400"
                  }`}
                >
                  {t.status.replace("_", " ")}
                </span>
              </div>
              {t.response && (
                <div className="mt-2 p-2.5 bg-surface-muted/60 rounded-lg text-xs text-gray-300 border border-surface-border flex items-start gap-2">
                  <LifeBuoy className="w-3.5 h-3.5 text-citizen-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{t.response}</p>
                </div>
              )}
              <p className="text-[10px] text-gray-500 pt-1">
                Submitted on {new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Create Ticket Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-card border border-surface-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-white text-base">Create Support Ticket</h3>
              <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Brief summary of your inquiry..."
                  className="w-full bg-surface-muted border border-surface-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-citizen-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-surface-muted border border-surface-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-citizen-500"
                  >
                    <option value="General Query">General Query</option>
                    <option value="Missed Cleanup">Missed Cleanup</option>
                    <option value="Worker Conduct">Worker Conduct</option>
                    <option value="Zone Dispute">Zone Dispute</option>
                    <option value="Account & Profile">Account & Profile</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full bg-surface-muted border border-surface-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-citizen-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Provide detailed information to help our support team..."
                  className="w-full bg-surface-muted border border-surface-border rounded-xl p-3 text-xs text-white focus:outline-none focus:border-citizen-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-citizen-500 hover:bg-citizen-400 text-white font-semibold text-xs transition-all shadow-md"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 4. Contact Support Component ──────────────────────────────
function ContactSupportSection() {
  const [sentMessage, setSentMessage] = useState(false);
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!msgSubject || !msgBody) return;
    setSentMessage(true);
    setMsgSubject("");
    setMsgBody("");
    setTimeout(() => setSentMessage(false), 6000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="font-display font-bold text-white text-base">Contact Support</h3>
        <p className="text-gray-400 text-xs">Reach out to our municipal sanitation coordination team</p>
      </div>

      {/* Contact Channels Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <a
          href="tel:18001234567"
          className="card p-4 flex flex-col items-start justify-between gap-3 hover:border-citizen-500/40 transition-colors group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-citizen-500/15 border border-citizen-500/30 flex items-center justify-center text-citizen-400 group-hover:scale-105 transition-transform">
            <PhoneCall className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Toll-Free Helpline</h4>
            <p className="text-citizen-400 font-mono text-xs mt-0.5">1800-123-4567</p>
            <p className="text-[10px] text-gray-500 mt-1">24/7 Rapid Response</p>
          </div>
        </a>

        <a
          href="mailto:support@trashtrack.ai"
          className="card p-4 flex flex-col items-start justify-between gap-3 hover:border-citizen-500/40 transition-colors group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-citizen-500/15 border border-citizen-500/30 flex items-center justify-center text-citizen-400 group-hover:scale-105 transition-transform">
            <Mail className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Email Helpdesk</h4>
            <p className="text-citizen-400 font-mono text-xs mt-0.5">support@trashtrack.ai</p>
            <p className="text-[10px] text-gray-500 mt-1">Response within 4 hrs</p>
          </div>
        </a>

        <div className="card p-4 flex flex-col items-start justify-between gap-3 border-surface-border">
          <div className="w-9 h-9 rounded-xl bg-surface-muted border border-surface-border flex items-center justify-center text-gray-400">
            <Clock className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Civic Operations</h4>
            <p className="text-gray-300 text-xs mt-0.5">Mon – Sat, 8AM – 7PM</p>
            <p className="text-[10px] text-gray-500 mt-1">Ward Control Center</p>
          </div>
        </div>
      </div>

      {/* Direct Message Form */}
      <div className="card p-5 space-y-4">
        <h4 className="font-display font-semibold text-white text-sm">Send a Direct Message</h4>
        {sentMessage && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Message sent to municipal coordination desk. Reference ID dispatched.</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Subject</label>
            <input
              type="text"
              required
              value={msgSubject}
              onChange={(e) => setMsgSubject(e.target.value)}
              placeholder="What do you need assistance with?"
              className="w-full bg-surface-muted border border-surface-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-citizen-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Message</label>
            <textarea
              rows={4}
              required
              value={msgBody}
              onChange={(e) => setMsgBody(e.target.value)}
              placeholder="Describe your issue or municipal query in detail..."
              className="w-full bg-surface-muted border border-surface-border rounded-xl p-3 text-xs text-white focus:outline-none focus:border-citizen-500 resize-none"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-citizen-500 hover:bg-citizen-400 text-white font-semibold text-xs transition-all shadow-md cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" /> Send Message
          </button>
        </form>
      </div>
    </div>
  );
}

// ── 5. Report a Problem Component ─────────────────────────────
function ReportProblemSection({ onReportWaste }) {
  const [submitted, setSubmitted] = useState(false);
  const [category, setCategory] = useState("GPS / Location Not Detecting");
  const [severity, setSeverity] = useState("MEDIUM");
  const [description, setDescription] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitted(true);
    setDescription("");
    setTimeout(() => setSubmitted(false), 6000);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h3 className="font-display font-bold text-white text-base">Report a Problem</h3>
        <p className="text-gray-400 text-xs">Report software bugs, map inaccuracies, or service issues</p>
      </div>

      {/* Helpful banner pointing to Report Waste for physical trash */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300 leading-relaxed">
            <strong>Looking to report physical trash, debris, or overflow?</strong> Use the dedicated Waste Reporting workflow.
          </p>
        </div>
        <button
          onClick={onReportWaste}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 transition-all shrink-0 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" /> Report Waste
        </button>
      </div>

      {/* Form Card */}
      <div className="card p-5 space-y-4">
        {submitted && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Problem report filed. Engineering & civic operations will investigate.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Issue Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-surface-muted border border-surface-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-citizen-500"
              >
                <option value="GPS / Location Not Detecting">GPS / Location Not Detecting</option>
                <option value="Camera Upload Problem">Camera Upload Problem</option>
                <option value="Notification Not Delivered">Notification Not Delivered</option>
                <option value="Worker Attendance Delay">Worker Attendance Delay</option>
                <option value="Other Technical Bug">Other Technical Bug</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Impact Level</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full bg-surface-muted border border-surface-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-citizen-500"
              >
                <option value="LOW">Low (Minor Glitch)</option>
                <option value="MEDIUM">Medium (Feature Disrupted)</option>
                <option value="HIGH">High (Cannot Submit Report)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Details of Problem</label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened? What error message or behavior did you encounter?"
              className="w-full bg-surface-muted border border-surface-border rounded-xl p-3 text-xs text-white focus:outline-none focus:border-citizen-500 resize-none"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-citizen-500 hover:bg-citizen-400 text-white font-semibold text-xs transition-all shadow-md cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Submit Problem Report
          </button>
        </form>
      </div>
    </div>
  );
}

// ── 6. FAQs Component ─────────────────────────────────────────
function FaqSection({ onContactSupport }) {
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [expandedIndex, setExpandedIndex] = useState(null);

  const filteredFaqs = INITIAL_FAQS.filter((faq) => {
    const matchesCat = selectedCat === "all" || faq.cat === selectedCat;
    const matchesSearch =
      faq.q.toLowerCase().includes(search.toLowerCase()) ||
      faq.a.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-white text-base">Frequently Asked Questions</h3>
          <p className="text-gray-400 text-xs">Instant answers to common citizen questions</p>
        </div>
        <button
          onClick={onContactSupport}
          className="text-xs text-citizen-400 hover:text-citizen-300 font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
        >
          Still need help? Contact Us <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search & Category Pills */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search FAQs by keywords..."
            className="w-full pl-9 pr-4 py-2 bg-surface-card border border-surface-border rounded-xl text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-citizen-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {[
            { id: "all", label: "All Topics" },
            { id: "reporting", label: "Reporting Waste" },
            { id: "workers", label: "Workers & Cleanup" },
            { id: "account", label: "Account & GPS" },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer shrink-0 font-medium ${
                selectedCat === c.id
                  ? "bg-citizen-500/20 text-citizen-300 font-bold border border-citizen-500/30"
                  : "bg-surface-card border border-surface-border text-gray-400 hover:text-white"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Accordion List */}
      <div className="space-y-2.5">
        {filteredFaqs.length === 0 ? (
          <div className="card p-6 text-center text-xs text-gray-500">
            No questions matched your search query. Try another term or contact support.
          </div>
        ) : (
          filteredFaqs.map((faq, i) => {
            const isExpanded = expandedIndex === i;
            return (
              <div
                key={i}
                className="card border-surface-border hover:border-citizen-500/30 transition-colors overflow-hidden"
              >
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : i)}
                  className="w-full p-4 text-left flex items-center justify-between gap-3 cursor-pointer"
                >
                  <span className="text-xs sm:text-sm font-semibold text-white">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${
                      isExpanded ? "rotate-180 text-citizen-400" : ""
                    }`}
                  />
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 text-xs text-gray-300 leading-relaxed border-t border-surface-border/60">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

