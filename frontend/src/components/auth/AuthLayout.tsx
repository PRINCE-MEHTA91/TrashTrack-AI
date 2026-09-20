import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, Leaf, Shield, Users } from 'lucide-react'

interface AuthLayoutProps {
  children: ReactNode
  topLinkLabel: string
  topLinkTo: string
  topLinkQuestion: string
  heroHeadline?: ReactNode
  heroSub?: string
}

const TRUST_ITEMS = [
  { icon: Leaf,   label: 'AI-powered',         sub: 'waste classification'   },
  { icon: Shield, label: 'Secure & transparent', sub: 'complaint trail'      },
  { icon: Users,  label: 'Citizens · Workers',  sub: '· Municipalities'      },
]

export default function AuthLayout({
  children,
  topLinkLabel,
  topLinkTo,
  topLinkQuestion,
  heroHeadline,
  heroSub,
}: AuthLayoutProps) {
  return (
    /*
      Mobile  (< lg) : min-h-screen, overflow-y-auto  → naturally scrollable
      Desktop (≥ lg) : h-screen,     overflow-hidden  → locked to viewport, no page scroll
    */
    <div className="
      relative bg-surface flex flex-col
      min-h-screen overflow-y-auto
      lg:h-screen lg:overflow-hidden
    ">

      {/* ── Full-bleed background illustration ── */}
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

      {/* ── Top navbar (fixed height, never scrolls away) ── */}
      <header className="relative z-20 flex-shrink-0 flex items-center justify-between px-5 sm:px-10 h-16">
        <Link to="/" className="flex items-center gap-2.5 group" aria-label="TrashTrack AI — home">
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
          <span className="text-gray-300 text-xs hidden sm:inline">{topLinkQuestion}</span>
          <Link
            to={topLinkTo}
            className="px-4 py-1.5 rounded-lg border border-white/25 text-white text-sm font-semibold
                       hover:bg-white/10 hover:border-white/40 transition-all duration-200 backdrop-blur-sm"
          >
            {topLinkLabel}
          </Link>
        </div>
      </header>

      {/* ── Centre stage: hero + form card ──
            Desktop: flex-1 with overflow-hidden so the card can scroll internally
            Mobile:  natural flow
      ── */}
      <main className="
        relative z-10 flex-1 flex items-center justify-center
        px-4 py-4
        lg:overflow-hidden
      ">
        <div className="w-full max-w-6xl flex items-center justify-between gap-10">

          {/* Left hero – desktop only, vertically centred */}
          {heroHeadline && (
            <div className="hidden lg:flex flex-col gap-4 flex-1 max-w-lg">
              <span className="inline-flex items-center gap-2 bg-primary-500/20 border border-primary-500/30
                               text-primary-400 text-xs font-semibold px-3 py-1.5 rounded-full w-fit backdrop-blur-sm">
                <Leaf className="w-3 h-3" />
                AI Powered Clean Cities
              </span>

              <h1 className="font-display font-extrabold text-3xl xl:text-4xl text-white leading-tight">
                {heroHeadline}
              </h1>

              {heroSub && (
                <p className="text-gray-300 text-sm leading-relaxed">{heroSub}</p>
              )}

              <ul className="space-y-2.5">
                {TRUST_ITEMS.map(({ icon: Icon, label, sub }) => (
                  <li key={label} className="flex items-center gap-3 text-gray-300 text-sm">
                    <span className="w-7 h-7 rounded-lg bg-primary-500/20 border border-primary-500/30
                                     flex items-center justify-center shrink-0 backdrop-blur-sm">
                      <Icon className="w-3.5 h-3.5 text-primary-400" />
                    </span>
                    <span><strong className="text-white font-semibold">{label}</strong> {sub}</span>
                  </li>
                ))}
              </ul>

              {/* Decorative dots */}
              <div className="flex items-center gap-1.5">
                {[0,1,2,3,4].map(i => (
                  <span key={i} className={`rounded-full ${i===0 ? 'w-5 h-1.5 bg-primary-400' : 'w-1.5 h-1.5 bg-white/20'}`} />
                ))}
              </div>
            </div>
          )}

          {/* ── Glass form card ──
                Desktop: fixed max-height so it never overflows viewport; scrolls internally
                Mobile:  no max-height, content expands naturally
          ── */}
          <div className="w-full max-w-[420px] mx-auto lg:mx-0 lg:ml-auto">
            <div className="
              bg-surface/72 backdrop-blur-xl border border-white/10 rounded-2xl
              shadow-[0_8px_60px_rgba(0,0,0,0.65)]
              p-5 sm:p-7
            ">
              {children}
            </div>
          </div>

        </div>
      </main>

      {/* ── Bottom trust strip (compact, always visible on desktop) ── */}
      <footer className="relative z-10 flex-shrink-0 py-3 px-6">
        {/* Icons row — hidden on very small screens to save space */}
        <div className="hidden sm:flex items-center justify-center gap-8 mb-2">
          {TRUST_ITEMS.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-2 text-center">
              <span className="w-7 h-7 rounded-lg bg-primary-500/15 border border-primary-500/20
                               flex items-center justify-center backdrop-blur-sm shrink-0">
                <Icon className="w-3.5 h-3.5 text-primary-400" />
              </span>
              <div className="text-left">
                <span className="text-white text-[11px] font-semibold leading-none block">{label}</span>
                <span className="text-gray-500 text-[10px] leading-none">{sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Tagline */}
        <p className="text-center text-gray-600 text-[10px] tracking-wide">
          Clean Cities &nbsp;·&nbsp; Smart Systems &nbsp;·&nbsp; Sustainable Tomorrow
        </p>
      </footer>

    </div>
  )
}
