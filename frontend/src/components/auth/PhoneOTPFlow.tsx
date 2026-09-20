import { useState, useEffect } from 'react'
import { Phone, ArrowRight, Loader2, UserCircle2, HardHat, Building2, User, ShieldAlert } from 'lucide-react'
import OTPInput from './OTPInput'
import { FormField, TextInput } from './FormField'

type FlowStep = 'phone' | 'otp' | 'profile'
type Role = 'citizen' | 'worker' | 'municipal'

interface PhoneOTPFlowProps {
  isSignup?: boolean // If true, bias towards new user flow if needed
}

export default function PhoneOTPFlow({ isSignup = false }: PhoneOTPFlowProps) {
  const [step, setStep] = useState<FlowStep>('phone')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  // State
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role | ''>('')
  
  // Timer
  const [timeLeft, setTimeLeft] = useState(30)
  
  useEffect(() => {
    if (step === 'otp' && timeLeft > 0) {
      const t = setTimeout(() => setTimeLeft(prev => prev - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [step, timeLeft])

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (phone.length < 10) {
      setError('Please enter a valid 10-digit phone number.')
      return
    }
    setError('')
    setIsLoading(true)
    // Simulate network
    await new Promise(r => setTimeout(r, 1200))
    setIsLoading(false)
    setStep('otp')
    setTimeLeft(30)
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length < 6) {
      setError('Please enter the 6-digit code.')
      return
    }
    setError('')
    setIsLoading(true)
    await new Promise(r => setTimeout(r, 1500))
    setIsLoading(false)
    
    // UI Demo logic: If phone ends in '1', simulate existing user, else new user.
    if (phone.endsWith('1') && !isSignup) {
      setError('Existing user demo — would redirect to dashboard.')
    } else {
      setStep('profile')
    }
  }

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Please enter your full name.'); return }
    if (!role) { setError('Please select a role.'); return }
    
    setError('')
    setIsLoading(true)
    await new Promise(r => setTimeout(r, 1500))
    setIsLoading(false)
    setError('Profile created demo — would redirect to dashboard.')
  }

  const ROLES = [
    { value: 'citizen', icon: UserCircle2, label: 'Citizen', accent: 'text-primary-400 border-primary-500 bg-primary-500/10' },
    { value: 'worker', icon: HardHat, label: 'Worker', accent: 'text-amber-400 border-amber-500 bg-amber-500/10' },
    { value: 'municipal', icon: Building2, label: 'Municipal', accent: 'text-blue-400 border-blue-500 bg-blue-500/10' },
  ]

  // Filter out municipal for signups
  const availableRoles = isSignup ? ROLES.filter(r => r.value !== 'municipal') : ROLES

  return (
    <div className="w-full">
      {error && (
        <div role="alert" className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* STEP 1: Phone & Role */}
      {step === 'phone' && (
        <form onSubmit={handleSendOTP} className="space-y-4">
          
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold text-gray-300 uppercase tracking-wide">
              {isSignup ? 'I am a...' : 'Sign in as'}
            </span>
            <div className={`grid gap-2 ${isSignup ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {availableRoles.map(({ value, icon: Icon, label, accent }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setRole(value as Role); setError('') }}
                  disabled={isLoading}
                  className={`
                    flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-center
                    transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60
                    ${role === value
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
            {isSignup && <p className="text-[10px] text-gray-500 mt-1">* Municipal/Admin accounts are created internally.</p>}
          </div>

          <div className="space-y-1 mt-3">
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wide">
              Phone Number
            </label>
            <div className="flex gap-2">
              {/* Country Code */}
              <div className="w-[85px] shrink-0 bg-white/8 border border-white/15 rounded-xl flex items-center justify-center text-white text-sm font-medium">
                🇮🇳 +91
              </div>
              {/* Phone Input */}
              <div className="relative flex-1">
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98765 43210"
                  disabled={isLoading}
                  className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 pl-10 text-sm text-white placeholder-gray-500 outline-none transition-all duration-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 hover:border-white/25"
                />
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              </div>
            </div>
          </div>
          
          <button type="submit" disabled={isLoading || phone.length < 10 || !role} className="btn-primary w-full justify-center py-2.5 text-sm mt-2 disabled:opacity-60">
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Sending OTP…</> : <>Continue <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>
      )}

      {/* STEP 2: OTP */}
      {step === 'otp' && (
        <form onSubmit={handleVerifyOTP} className="space-y-5">
          <div className="text-center mb-4 text-sm text-gray-300">
            Enter the 6-digit code sent to <br />
            <span className="font-semibold text-white">+91 {phone}</span>
            {' · '}
            <button type="button" onClick={() => { setStep('phone'); setOtp(''); setError('') }} className="text-primary-400 hover:underline">
              Change
            </button>
          </div>

          <OTPInput value={otp} onChange={setOtp} disabled={isLoading} hasError={!!error} />

          <button type="submit" disabled={isLoading || otp.length < 6} className="btn-primary w-full justify-center py-2.5 text-sm disabled:opacity-60">
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying…</> : <>Verify OTP <ArrowRight className="w-4 h-4" /></>}
          </button>

          <div className="text-center text-xs text-gray-500 mt-3">
            {timeLeft > 0 ? (
              <span>Resend code in <strong className="text-gray-300">{timeLeft}s</strong></span>
            ) : (
              <button type="button" onClick={() => setTimeLeft(30)} className="text-primary-400 hover:underline font-medium">
                Resend Code
              </button>
            )}
          </div>
        </form>
      )}

      {/* STEP 3: Profile Setup */}
      {step === 'profile' && (
        <form onSubmit={handleCompleteProfile} className="space-y-4">
          <div className="text-sm text-gray-300 mb-4 bg-primary-500/10 border border-primary-500/20 p-3 rounded-xl">
            Phone verified! Let's finish setting up your account.
          </div>

          <FormField id="otp-name" label="Full Name">
            <TextInput
              id="otp-name" type="text" value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Jane Smith" disabled={isLoading}
              leftIcon={<User className="w-4 h-4" />}
            />
          </FormField>

          <button type="submit" disabled={isLoading || !name} className="btn-primary w-full justify-center py-2.5 text-sm mt-3 disabled:opacity-60">
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating Account…</> : <>Complete Signup <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>
      )}
    </div>
  )
}
