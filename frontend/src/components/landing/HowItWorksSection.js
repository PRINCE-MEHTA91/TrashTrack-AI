import {
  Camera,
  MapPin,
  Brain,
  UserCheck,
  CheckCircle2,
  Star,
} from "lucide-react";

const STEPS = [
  {
    step: "01",
    icon: Camera,
    title: "Citizen Reports Waste",
    description:
      "A citizen opens TrashTrack in any browser, uploads a photo, confirms their location, and submits a complaint in under 60 seconds.",
    color: "text-rose-400",
    border: "border-rose-400/30",
    bg: "bg-rose-400/10",
  },
  {
    step: "02",
    icon: Brain,
    title: "AI Analyzes the Report",
    description:
      "Our Python AI service classifies the waste type, estimates severity, checks for duplicates, and surfaces priority signals automatically.",
    color: "text-purple-400",
    border: "border-purple-400/30",
    bg: "bg-purple-400/10",
  },
  {
    step: "03",
    icon: MapPin,
    title: "Smart Worker Assignment",
    description:
      "The system selects the best available worker using PostGIS distance queries, priority score, and current workload — instantly.",
    color: "text-blue-400",
    border: "border-blue-400/30",
    bg: "bg-blue-400/10",
  },
  {
    step: "04",
    icon: UserCheck,
    title: "Worker Completes Task",
    description:
      "The assigned worker sees the task on their dashboard, navigates to the location, performs cleanup, and uploads photo evidence.",
    color: "text-amber-400",
    border: "border-amber-400/30",
    bg: "bg-amber-400/10",
  },
  {
    step: "05",
    icon: CheckCircle2,
    title: "Verification & Closure",
    description:
      "The citizen or municipality admin reviews the evidence and verifies the cleanup. The complaint is closed and audit logged.",
    color: "text-primary-400",
    border: "border-primary-400/30",
    bg: "bg-primary-400/10",
  },
  {
    step: "06",
    icon: Star,
    title: "Feedback & Analytics",
    description:
      "Citizens rate the experience. Analytics update in real time — helping municipalities improve resource allocation over time.",
    color: "text-brand-lime",
    border: "border-lime-400/30",
    bg: "bg-lime-400/10",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 md:py-32 relative">
      <div
        className="absolute inset-0 bg-radial-glow opacity-40 pointer-events-none"
        aria-hidden="true"
      />

      <div className="section-container relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="badge bg-primary-500/10 text-primary-400 border border-primary-500/20 mb-4">
            The Workflow
          </span>
          <h2 className="font-display font-bold text-4xl md:text-5xl text-white mb-4">
            From report to{" "}
            <span className="gradient-text">verified cleanup</span>
          </h2>
          <p className="text-gray-400 text-lg">
            A transparent, auditable 6-step process that keeps every stakeholder
            informed at each stage of the waste lifecycle.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {STEPS.map((step) => (
            <div
              key={step.step}
              className={`card p-6 border ${step.border} hover:shadow-card transition-all duration-300 group hover:-translate-y-1`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className={`w-12 h-12 rounded-2xl ${step.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}
                >
                  <step.icon className={`w-6 h-6 ${step.color}`} />
                </div>
                <span className="font-display font-bold text-3xl text-surface-border leading-none mt-1">
                  {step.step}
                </span>
              </div>
              <h3 className="text-white font-semibold text-base mb-2">
                {step.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-16 card p-6 overflow-x-auto">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-4 font-medium">
            Complaint Lifecycle States
          </p>
          <div className="flex items-center gap-2 min-w-max">
            {[
              { label: "SUBMITTED", color: "bg-gray-500/20 text-gray-400" },
              { label: "ANALYZING", color: "bg-purple-500/20 text-purple-400" },
              {
                label: "PENDING ASSIGNMENT",
                color: "bg-amber-500/20 text-amber-400",
              },
              { label: "ASSIGNED", color: "bg-blue-500/20 text-blue-400" },
              { label: "IN PROGRESS", color: "bg-cyan-500/20 text-cyan-400" },
              {
                label: "CLEANUP SUBMITTED",
                color: "bg-indigo-500/20 text-indigo-400",
              },
              {
                label: "PENDING VERIFY",
                color: "bg-orange-500/20 text-orange-400",
              },
              {
                label: "VERIFIED",
                color: "bg-primary-500/20 text-primary-400",
              },
              { label: "CLOSED", color: "bg-primary-700/30 text-primary-300" },
            ].map((s, i, arr) => (
              <div key={s.label} className="flex items-center gap-2">
                <span className={`badge ${s.color} whitespace-nowrap text-xs`}>
                  {s.label}
                </span>
                {i < arr.length - 1 && (
                  <span className="text-surface-border text-xs">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
