import { Trash2, GitBranch, MessageCircle, Briefcase, Heart } from 'lucide-react'
import { Link } from 'react-router-dom'

const FOOTER_LINKS = {
  Platform: [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Pricing', href: '#' },
    { label: 'Roadmap', href: '#' },
  ],
  Roles: [
    { label: 'For Citizens', href: '#roles' },
    { label: 'For Workers', href: '#roles' },
    { label: 'For Municipalities', href: '#roles' },
  ],
  Support: [
    { label: 'Documentation', href: '#' },
    { label: 'API Reference', href: '#' },
    { label: 'Contact Us', href: '#' },
    { label: 'Privacy Policy', href: '#' },
  ],
}

const SOCIAL = [
  { icon: GitBranch,     label: 'GitHub',   href: '#' },
  { icon: MessageCircle, label: 'Twitter',  href: '#' },
  { icon: Briefcase,     label: 'LinkedIn', href: '#' },
]

export default function Footer() {
  return (
    <footer className="border-t border-surface-border bg-surface-card">
      <div className="section-container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-500 shadow-glow-sm">
                <Trash2 className="w-5 h-5 text-white" strokeWidth={2.5} />
              </span>
              <span className="font-display font-bold text-white text-lg">
                TrashTrack<span className="text-primary-400"> AI</span>
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Empowering municipalities, workers, and citizens to build cleaner,
              smarter communities through AI-driven waste management.
            </p>
            <div className="flex items-center gap-3 mt-6">
              {SOCIAL.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-surface-border text-gray-400 hover:text-white hover:border-primary-500 hover:bg-surface-muted transition-all duration-200"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link groups */}
          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group}>
              <h3 className="text-white font-semibold text-sm mb-4">{group}</h3>
              <ul className="space-y-3">
                {links.map(link => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-gray-400 hover:text-primary-400 text-sm transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} TrashTrack AI. All rights reserved.
          </p>
          <p className="text-gray-500 text-sm flex items-center gap-1.5">
            Made with <Heart className="w-3.5 h-3.5 text-primary-500 fill-current" /> for cleaner cities
          </p>
        </div>
      </div>
    </footer>
  )
}
