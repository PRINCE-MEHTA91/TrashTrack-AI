import { Link } from "react-router-dom";
import { Trash2, Leaf, Shield, Users } from "lucide-react";

const TRUST_ITEMS = [
  { icon: Leaf, label: "AI-powered", sub: "waste classification" },
  { icon: Shield, label: "Secure & transparent", sub: "complaint trail" },
  { icon: Users, label: "Citizens · Workers", sub: "· Municipalities" },
];

export default function AuthLayout({
  children,
  topLinkLabel,
  topLinkTo,
  topLinkQuestion,
  heroHeadline,
  heroSub,
}) {
  return (
    
    <div
      className="
      relative bg-surface flex flex-col
      min-h-screen overflow-y-auto
      lg:h-screen lg:overflow-hidden
    "
    >
      
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <img
          src="/assets/auth-illustration.png"
          alt=""
          className="w-full h-full object-cover object-center"
          draggable={false}
        />

        <div className="absolute inset-0 bg-surface/55" />
        <div className="absolute inset-0 bg-gradient-to-b from-surface/70 via-transparent to-surface/85" />
        <div className="absolute inset-0 bg-gradient-to-r from-surface/65 via-transparent to-surface/40" />
      </div>

      <header className="relative z-20 flex-shrink-0 flex items-center justify-between px-5 sm:px-10 h-16">
        <Link
          to="/"
          className="flex items-center gap-2.5 group"
          aria-label="TrashTrack AI — home"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary-500 group-hover:bg-primary-400 transition-colors shadow-glow-sm">
            <Trash2 className="w-4 h-4 text-white" strokeWidth={2.5} />
          </span>
          <div className="leading-none">
            <span className="font-display font-bold text-white text-sm block">
              TrashTrack<span className="text-primary-400"> AI</span>
            </span>
            <span className="text-gray-400 text-[9px] font-medium tracking-wide hidden sm:block">
              Cleaner Today, Greener Tomorrow
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-300 text-xs hidden sm:inline">
            {topLinkQuestion}
          </span>
          <Link
            to={topLinkTo}
            className="px-4 py-1.5 rounded-lg border border-white/25 text-white text-sm font-semibold
                       hover:bg-white/10 hover:border-white/40 transition-all duration-200 backdrop-blur-sm"
          >
            {topLinkLabel}
          </Link>
        </div>
      </header>

      <main
        className="
        relative z-10 flex-1 flex items-center justify-center
        px-4 py-4
        lg:overflow-hidden
      "
      >
        <div className="w-full max-w-6xl flex items-center justify-between gap-10">
          
          <div className="w-full max-w-[420px] mx-auto lg:mx-0 lg:ml-auto">
            <div
              className="
              bg-surface/72 backdrop-blur-xl border border-white/10 rounded-2xl
              shadow-[0_8px_60px_rgba(0,0,0,0.65)]
              p-5 sm:p-7
            "
            >
              {children}
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 flex-shrink-0 py-3 px-6">
        {}
        <div className="hidden sm:flex items-center justify-center gap-8 mb-2">
          {TRUST_ITEMS.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-2 text-center">
              <span
                className="w-7 h-7 rounded-lg bg-primary-500/15 border border-primary-500/20
                               flex items-center justify-center backdrop-blur-sm shrink-0"
              >
                <Icon className="w-3.5 h-3.5 text-primary-400" />
              </span>
              <div className="text-left">
                <span className="text-white text-[11px] font-semibold leading-none block">
                  {label}
                </span>
                <span className="text-gray-500 text-[10px] leading-none">
                  {sub}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-gray-600 text-[10px] tracking-wide">
          Clean Cities &nbsp;·&nbsp; Smart Systems &nbsp;·&nbsp; Sustainable
          Tomorrow
        </p>
      </footer>
    </div>
  );
}
