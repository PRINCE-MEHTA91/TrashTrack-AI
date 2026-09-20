import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, UserCircle2, HardHat, Building2, Smartphone } from 'lucide-react'
import AuthLayout from '../components/auth/AuthLayout'
import { FormField, TextInput, OrDivider, GoogleButton } from '../components/auth/FormField'
import PhoneOTPFlow from '../components/auth/PhoneOTPFlow'

/* ── Types ──────────────────────────────────────────────── */
type LoginRole = 'citizen' | 'worker' | 'municipal'

interface LoginForm {
  role: LoginRole | ''
  email: string
  password: string
  rememberMe: boolean
}

interface FormErrors {
  role?: string
  email?: string
  password?: string
  general?: string
}

/* ── Validation ─────────────────────────────────────────── */
function validate(form: LoginForm): FormErrors {
  const errors: FormErrors = {}

  if (!form.role) {
    errors.role = 'Please select your role.'
  }

  const emailOrPhoneRe = /^(\+?[0-9\s\-]{7,15}|[^\s@]+@[^\s@]+\.[^\s@]+)$/
  if (!form.email.trim()) {
    errors.email = 'Email or phone number is required.'
  } else if (!emailOrPhoneRe.test(form.email.trim())) {
    errors.email = 'Enter a valid email address or phone number.'
  }

  if (!form.password) {
    errors.password = 'Password is required.'
  } else if (form.password.length < 6) {
    errors.password = 'Password must be at least 6 characters.'
  }

  return errors
}

/* ── Component ──────────────────────────────────────────── */
export default function LoginPage() {
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone')
  
  const [form, setForm] = useState<LoginForm>({
    role: '',
    email: '',
    password: '',
    rememberMe: false,
  })
  const [errors, setErrors]         = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading]   = useState(false)
  const [touched, setTouched]       = useState<Record<string, boolean>>({})

  const handleChange = useCallback(
    (field: keyof LoginForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
      setForm(prev => ({ ...prev, [field]: value }))
      if (touched[field]) {
        setErrors(prev => ({ ...prev, [field]: undefined, general: undefined }))
      }
    },
    [touched],
  )

  const handleBlur = useCallback(
    (field: keyof LoginForm) => () => {
      setTouched(prev => ({ ...prev, [field]: true }))
      const fieldErrors = validate(form)
      setErrors(prev => ({ ...prev, [field]: fieldErrors[field as keyof FormErrors] as string | undefined }))
    },
    [form],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ role: true, email: true, password: true })
    const fieldErrors = validate(form)
    if (Object.keys(fieldErrors).length > 0) { setErrors(fieldErrors); return }
    setIsLoading(true)
    setErrors({})
    await new Promise(r => setTimeout(r, 1500))
    setIsLoading(false)
    setErrors({ general: 'Authentication API not connected yet. (UI demo)' })
  }

  const ROLES = [
    { value: 'citizen'   as LoginRole, icon: UserCircle2, label: 'Citizen',   accent: 'border-primary-500 text-primary-400 bg-primary-500/15' },
    { value: 'worker'    as LoginRole, icon: HardHat,     label: 'Worker',    accent: 'border-amber-500   text-amber-400   bg-amber-500/15'   },
    { value: 'municipal' as LoginRole, icon: Building2,   label: 'Municipal', accent: 'border-blue-500    text-blue-400    bg-blue-500/15'    },
  ] as const

  return (
    <AuthLayout
      topLinkQuestion="Don't have an account?"
      topLinkLabel="Sign Up"
      topLinkTo="/signup"
      heroHeadline={<>Welcome back to <span className="text-primary-400">TrashTrack AI</span></>}
      heroSub="Sign in to report waste, manage tasks, or run your city dashboard — all from one place."
    >
      {/* Heading */}
      <div className="mb-4">
        <h2 className="font-display font-bold text-xl text-white mb-0.5">Welcome back</h2>
        <p className="text-gray-400 text-xs">Sign in to your TrashTrack AI account.</p>
      </div>

      {/* Auth Method Tabs */}
      <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 mb-5">
        <button
          type="button"
          onClick={() => setAuthMethod('phone')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
            authMethod === 'phone' ? 'bg-primary-500/20 text-primary-400 shadow-sm' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-4 h-4" /> Phone
        </button>
        <button
          type="button"
          onClick={() => setAuthMethod('email')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
            authMethod === 'email' ? 'bg-primary-500/20 text-primary-400 shadow-sm' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Mail className="w-4 h-4" /> Email
        </button>
      </div>

      {/* General error */}
      {errors.general && (
        <div role="alert" className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {errors.general}
        </div>
      )}

      {authMethod === 'phone' ? (
        <PhoneOTPFlow />
      ) : (
        <form id="login-form" onSubmit={handleSubmit} noValidate aria-label="Login form" className="space-y-3">

          {/* Role selector */}
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold text-gray-300 uppercase tracking-wide">Sign in as</span>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(({ value, icon: Icon, label, accent }) => (
                <button
                  key={value}
                  type="button"
                  id={`login-role-${value}`}
                  aria-pressed={form.role === value}
                  onClick={() => { setForm(prev => ({ ...prev, role: value })); setErrors(prev => ({ ...prev, role: undefined })) }}
                  disabled={isLoading}
                  className={`
                    flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-center
                    transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60
                    ${form.role === value
                      ? accent
                      : 'border-white/10 text-gray-500 bg-white/5 hover:bg-white/10 hover:text-gray-400'
                    }
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-semibold">{label}</span>
                </button>
              ))}
            </div>
            {errors.role && touched.role && (
              <p role="alert" className="text-xs text-red-400 flex items-center gap-1">
                <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                {errors.role}
              </p>
            )}
          </div>

          {/* Email */}
          <FormField id="login-email" label="Email">
            <TextInput
              id="login-email" type="email" name="email"
              placeholder="you@example.com"
              autoComplete="email" value={form.email}
              onChange={handleChange('email')} onBlur={handleBlur('email')}
              hasError={!!errors.email} disabled={isLoading}
              leftIcon={<Mail className="w-4 h-4" />}
            />
          </FormField>

          {/* Password */}
          <FormField id="login-password" label="Password" error={errors.password}>
            <TextInput
              id="login-password" type={showPassword ? 'text' : 'password'} name="password"
              placeholder="Enter your password" autoComplete="current-password"
              value={form.password} onChange={handleChange('password')} onBlur={handleBlur('password')}
              hasError={!!errors.password} disabled={isLoading}
              leftIcon={<Lock className="w-4 h-4" />}
              rightSlot={
                <button type="button" id="login-toggle-password"
                  onClick={() => setShowPassword(v => !v)}
                  className="text-gray-500 hover:text-gray-300 transition-colors p-0.5"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
          </FormField>

          {/* Remember me + Forgot password */}
          <div className="flex items-center justify-between mt-1 mb-2">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input
                id="login-remember-me" type="checkbox"
                checked={form.rememberMe} onChange={handleChange('rememberMe')} disabled={isLoading}
                className="w-4 h-4 rounded border-white/20 bg-white/10 cursor-pointer accent-[#1aac72]"
              />
              <span className="text-xs text-gray-400 group-hover:text-gray-300 select-none">Remember me</span>
            </label>
            <Link to="/forgot-password" id="login-forgot-password"
              className="text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <button id="login-submit" type="submit" disabled={isLoading} aria-busy={isLoading}
            className="btn-primary w-full justify-center py-2.5 text-sm
                       disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0">
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</> : <>Sign In<ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>
      )}

      {/* Google */}
      <OrDivider />
      <GoogleButton label="Continue with Google" disabled={isLoading}
        onClick={() => alert('Google OAuth — coming soon.')} />

      {/* Sign up link */}
      <p className="mt-6 text-center text-sm text-gray-500">
        Don't have an account?{' '}
        <Link to="/signup" id="login-goto-signup"
          className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
          Create one free
        </Link>
      </p>
    </AuthLayout>
  )
}
