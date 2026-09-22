const STATS = [
  {
    value: "10K+",
    label: "Complaints Resolved",
    sub: "Across all municipalities",
  },
  { value: "98%", label: "Complaint Closure Rate", sub: "Within SLA windows" },
  {
    value: "<2 hr",
    label: "Avg. Resolution Time",
    sub: "P0 high-severity complaints",
  },
  {
    value: "3 Roles",
    label: "Unified Platform",
    sub: "Citizen · Worker · Admin",
  },
];

export default function StatsSection() {
  return (
    <section
      id="about"
      className="py-16 border-y border-surface-border relative overflow-hidden"
    >
      <div
        className="absolute inset-0 bg-surface-card pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-radial-glow opacity-30 pointer-events-none"
        aria-hidden="true"
      />

      <div className="section-container relative z-10">
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="stat-number font-display text-4xl md:text-5xl block mb-1 gradient-text">
                  {stat.value}
                </span>
                <span className="text-white font-semibold text-sm block mb-1">
                  {stat.label}
                </span>
                <span className="text-gray-500 text-xs">{stat.sub}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
