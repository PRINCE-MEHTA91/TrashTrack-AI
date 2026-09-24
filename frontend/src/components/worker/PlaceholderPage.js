/**
 * PlaceholderPage – reusable clean placeholder for unimplemented worker sections.
 *
 * Props:
 *   id            – HTML id for the outer container (for testing)
 *   icon          – Lucide icon component
 *   title         – Page title
 *   description   – Descriptive text about what will be here
 *   badge         – Optional badge text (e.g. "Coming Soon")
 *   badgeVariant  – "default" | "primary"
 */
export default function PlaceholderPage({
  id,
  icon: Icon,
  title,
  description,
  badge = "Coming Soon",
  badgeVariant = "default",
}) {
  const badgeClass =
    badgeVariant === "primary"
      ? "bg-primary-500/15 border-primary-500/30 text-primary-400"
      : "bg-surface-muted border-surface-border text-gray-400";

  return (
    <div
      id={id}
      className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6"
    >
      <div className="max-w-sm w-full text-center flex flex-col items-center gap-5">
        {/* Icon circle */}
        <div className="w-20 h-20 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center shadow-card">
          <Icon className="w-9 h-9 text-primary-400" />
        </div>

        {/* Badge */}
        <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold ${badgeClass}`}>
          {badge}
        </span>

        {/* Title */}
        <h1 className="font-display font-bold text-xl text-white">{title}</h1>

        {/* Description */}
        <p className="text-gray-400 text-sm leading-relaxed">{description}</p>

        {/* Return link */}
        <a
          href="/worker/home"
          className="btn-outline text-sm py-2 px-5 mt-2"
        >
          ← Back to Home
        </a>
      </div>
    </div>
  );
}
