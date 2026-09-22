import { ArrowRight, Leaf, Zap, Shield } from "lucide-react";

const BADGES = [
  { icon: Zap, text: "AI-Powered Analysis" },
  { icon: Leaf, text: "Eco-Friendly" },
  { icon: Shield, text: "Secure & Auditable" },
];

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center overflow-hidden"
      aria-label="Hero"
    >
      <div
        className="absolute inset-0 bg-hero-mesh pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse-slow pointer-events-none"
        aria-hidden="true"
      />

      <div
        className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-brand-lime/8 rounded-full blur-3xl animate-pulse-slow delay-300 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(rgba(26,172,114,0.3) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(26,172,114,0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
        aria-hidden="true"
      />

      <div className="section-container relative z-10 py-32 md:py-40">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-fade-in flex justify-center mb-8">
            <span className="badge bg-primary-500/15 text-primary-400 border border-primary-500/30 text-xs uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse inline-block" />
              AI-Powered Waste Management
            </span>
          </div>
          <h1 className="font-display font-extrabold text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-none tracking-tight mb-6 animate-slide-up delay-100">
            <span className="text-white">Smarter Cities.</span>
            <br />
            <span className="gradient-text">Cleaner Communities.</span>
          </h1>
          <p className="text-gray-400 text-lg sm:text-xl md:text-2xl leading-relaxed mb-10 max-w-2xl mx-auto animate-slide-up delay-200">
            TrashTrack AI connects citizens, field workers, and municipalities
            on one intelligent platform — from waste report to verified cleanup,
            every step tracked.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up delay-300">
            <a
              id="hero-cta-primary"
              href="/register"
              className="btn-primary text-base px-8 py-4 w-full sm:w-auto justify-center"
            >
              Report Waste Now
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              id="hero-cta-secondary"
              href="#how-it-works"
              onClick={(e) => {
                e.preventDefault();
                document
                  .querySelector("#how-it-works")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="btn-outline text-base px-8 py-4 w-full sm:w-auto justify-center"
            >
              See How It Works
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-3 animate-slide-up delay-400">
            {BADGES.map(({ icon: Icon, text }) => (
              <span
                key={text}
                className="flex items-center gap-2 text-sm text-gray-400 bg-surface-muted border border-surface-border rounded-full px-4 py-2"
              >
                <Icon className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                {text}
              </span>
            ))}
          </div>
        </div>

        {}
        <div className="mt-20 animate-slide-up delay-500 max-w-3xl mx-auto">
          <div className="glass-card p-1 shadow-glow">
            <div className="bg-surface-card rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">
                  LIVE COMPLAINT FEED
                </span>
                <span className="flex items-center gap-1.5 text-xs text-primary-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
                  3 active
                </span>
              </div>
              {[
                {
                  id: "TT-2847",
                  type: "Plastic Waste",
                  severity: "HIGH",
                  status: "IN PROGRESS",
                  ward: "Ward 12",
                  time: "2 min ago",
                  color: "text-amber-400",
                  dot: "bg-amber-400",
                },
                {
                  id: "TT-2846",
                  type: "Mixed Garbage",
                  severity: "MEDIUM",
                  status: "ASSIGNED",
                  ward: "Ward 7",
                  time: "15 min ago",
                  color: "text-blue-400",
                  dot: "bg-blue-400",
                },
                {
                  id: "TT-2845",
                  type: "Organic Waste",
                  severity: "LOW",
                  status: "VERIFIED",
                  ward: "Ward 3",
                  time: "1 hr ago",
                  color: "text-primary-400",
                  dot: "bg-primary-400",
                },
              ].map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between bg-surface-muted border border-surface-border rounded-xl px-4 py-3 gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`}
                    />
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {c.type}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {c.id} · {c.ward}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-xs font-semibold ${c.color} hidden sm:block`}
                    >
                      {c.severity}
                    </span>
                    <span className="badge bg-surface border border-surface-border text-gray-400 text-xs hidden md:flex">
                      {c.status}
                    </span>
                    <span className="text-gray-500 text-xs">{c.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
