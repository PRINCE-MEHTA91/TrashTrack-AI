import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Trash2, Menu, X, Leaf } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Roles', href: '#roles' },
  { label: 'About', href: '#about' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false) }, [location])

  const handleAnchor = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    setMenuOpen(false)
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-surface/90 backdrop-blur-lg border-b border-surface-border shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <div className="section-container">
        <nav className="flex items-center justify-between h-16 md:h-18">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group" aria-label="TrashTrack AI Home">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-500 group-hover:bg-primary-400 transition-colors shadow-glow-sm">
              <Trash2 className="w-5 h-5 text-white" strokeWidth={2.5} />
            </span>
            <span className="font-display font-bold text-white text-lg leading-none">
              TrashTrack<span className="text-primary-400"> AI</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <a
                key={link.label}
                href={link.href}
                onClick={handleAnchor(link.href)}
                className="nav-link px-3 py-2 rounded-lg hover:bg-surface-muted"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <a href="/login" className="btn-ghost">Sign In</a>
            <a href="/register" className="btn-primary py-2">
              <Leaf className="w-4 h-4" />
              Get Started
            </a>
          </div>

          {/* Mobile menu toggle */}
          <button
            id="mobile-menu-toggle"
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-surface-muted transition-colors"
            onClick={() => setMenuOpen(v => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-surface-border bg-surface/95 backdrop-blur-lg animate-slide-down">
          <div className="section-container py-4 flex flex-col gap-1">
            {NAV_LINKS.map(link => (
              <a
                key={link.label}
                href={link.href}
                onClick={handleAnchor(link.href)}
                className="text-gray-300 hover:text-white hover:bg-surface-muted px-4 py-3 rounded-xl text-sm font-medium transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 mt-2 border-t border-surface-border flex flex-col gap-2">
              <a href="/login" className="btn-outline justify-center">Sign In</a>
              <a href="/register" className="btn-primary justify-center">
                <Leaf className="w-4 h-4" />
                Get Started Free
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
