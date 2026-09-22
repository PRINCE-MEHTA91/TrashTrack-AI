import { User, HardHat, Building2, ArrowRight } from "lucide-react";

const ROLES = [
  {
    icon: User,
    role: "Citizen",
    tagline: "Report. Track. Verify.",
    description:
      "Any resident can report waste in seconds — no app download needed. Just open a browser, snap a photo, and submit. Track your complaint from submission to verified cleanup, all in one place.",
    features: [
      "Submit waste reports with photo & GPS",
      "Track complaint status in real time",
      "Verify cleanup and rate workers",
      "View full complaint history",
    ],
    cta: "Report Waste",
    href: "/register?role=citizen",
    color: "from-primary-500/20 to-transparent",
    border: "hover:border-primary-500/50",
    badge: "bg-primary-500/15 text-primary-400 border-primary-500/25",
    btnClass: "btn-primary",
  },
  {
    icon: HardHat,
    role: "Worker",
    tagline: "Assigned. Navigate. Complete.",
    description:
      "Field workers receive task assignments with location, priority, and complaint details instantly. Navigate directly, upload before/after evidence, and mark tasks complete — all from a mobile browser.",
    features: [
      "View active and upcoming tasks",
      "See priority and location for each task",
      "Upload before/after cleanup evidence",
      "Track work history and performance",
    ],
    cta: "View Tasks",
    href: "/login?role=worker",
    color: "from-amber-500/20 to-transparent",
    border: "hover:border-amber-500/50",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    btnClass:
      "btn-outline border-amber-500/50 text-amber-400 hover:bg-amber-500/10",
  },
  {
    icon: Building2,
    role: "Municipality / Admin",
    tagline: "Manage. Analyze. Optimize.",
    description:
      "Municipality administrators get a data-rich command center. Manage complaints, workers, and ward areas. Analyze resolution metrics, configure priority rules, and generate reports for governance.",
    features: [
      "Full complaint & worker management",
      "Interactive map with ward overlays",
      "Analytics: KPIs, resolution times, trends",
      "Configurable AI priority rules",
    ],
    cta: "Admin Portal",
    href: "/login?role=admin",
    color: "from-blue-500/20 to-transparent",
    border: "hover:border-blue-500/50",
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    btnClass:
      "btn-outline border-blue-500/50 text-blue-400 hover:bg-blue-500/10",
  },
];

export default function RolesSection() {
  return (
    <section id="roles" className="py-24 md:py-32">
      <div className="section-container">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="badge bg-primary-500/10 text-primary-400 border border-primary-500/20 mb-4">
            Built for Everyone
          </span>
          <h2 className="font-display font-bold text-4xl md:text-5xl text-white mb-4">
            One platform,{" "}
            <span className="gradient-text">three powerful roles</span>
          </h2>
          <p className="text-gray-400 text-lg">
            The interface adapts to who you are. Each role gets a tailored
            experience optimized for their workflow and device.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {ROLES.map((role) => (
            <div
              key={role.role}
              className={`card p-8 border ${role.border} transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-sm flex flex-col relative overflow-hidden`}
            >
              <div
                className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${role.color} pointer-events-none`}
                aria-hidden="true"
              />

              <div className="relative z-10">
                {}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-surface-muted border border-surface-border flex items-center justify-center">
                    <role.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className={`badge border ${role.badge} text-xs`}>
                    {role.role}
                  </span>
                </div>
                <h3 className="font-display font-bold text-xl text-white mb-1">
                  {role.role}
                </h3>
                <p className="text-primary-400 text-sm font-medium mb-4">
                  {role.tagline}
                </p>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                  {role.description}
                </p>
                <ul className="space-y-2.5 mb-8">
                  {role.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm text-gray-300"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={role.href}
                  className={`${role.btnClass} mt-auto inline-flex items-center justify-center gap-2 w-full`}
                >
                  {role.cta}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
