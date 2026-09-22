import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  HardHat,
  UserCircle2,
  CheckCircle2,
  Building2,
  Smartphone,
} from "lucide-react";
import AuthLayout from "../components/auth/AuthLayout";
import {
  FormField,
  TextInput,
  OrDivider,
  GoogleButton,
} from "../components/auth/FormField";
function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { score: 1, label: "Weak", color: "bg-red-500" },
    { score: 2, label: "Fair", color: "bg-amber-500" },
    { score: 3, label: "Good", color: "bg-blue-500" },
    { score: 4, label: "Strong", color: "bg-primary-500" },
  ];
  return map[Math.min(score, 4) - 1] ?? { score: 0, label: "", color: "" };
}
function validate(form) {
  const errors = {};
  if (!form.fullName.trim()) errors.fullName = "Full name is required.";
  else if (form.fullName.trim().length < 2)
    errors.fullName = "Name must be at least 2 characters.";
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!form.email.trim()) errors.email = "Email ID is required.";
  else if (!emailRe.test(form.email.trim()))
    errors.email = "Enter a valid email address.";
  if (!form.password) errors.password = "Password is required.";
  else if (form.password.length < 8)
    errors.password = "Password must be at least 8 characters.";
  if (!form.confirmPassword)
    errors.confirmPassword = "Please confirm your password.";
  else if (form.confirmPassword !== form.password)
    errors.confirmPassword = "Passwords do not match.";
  if (!form.role) errors.role = "Please select your role.";
  if (!form.agreeTerms) errors.agreeTerms = "You must agree to continue.";
  return errors;
}

function RoleCard({
  value,
  selected,
  onSelect,
  disabled,
  icon: Icon,
  label,
  description,
  accent,
  borderAccent,
}) {
  return (
    <button
      type="button"
      id={`signup-role-${value}`}
      onClick={() => onSelect(value)}
      disabled={disabled}
      aria-pressed={selected}
      className={`
        relative flex-1 flex flex-col items-center text-center p-3 rounded-xl border-2 transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60
        ${selected ? `${borderAccent} bg-white/10 shadow-glow-sm` : "border-white/10 bg-white/5 hover:bg-white/10"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:-translate-y-0.5"}
      `}
    >
      {selected && (
        <CheckCircle2
          className={`absolute top-2 right-2 w-3.5 h-3.5 ${accent}`}
          aria-hidden="true"
        />
      )}
      <span
        className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 ${selected ? `${accent} bg-white/5` : "text-gray-500 bg-white/5"} transition-colors`}
      >
        <Icon className="w-4 h-4" />
      </span>
      <span
        className={`text-xs font-semibold ${selected ? "text-white" : "text-gray-400"}`}
      >
        {label}
      </span>
      <span className="text-[10px] text-gray-500 leading-tight mt-0.5">
        {description}
      </span>
    </button>
  );
}
const ErrorIcon = () => (
  <svg
    className="w-3 h-3 shrink-0"
    fill="currentColor"
    viewBox="0 0 20 20"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
      clipRule="evenodd"
    />
  </svg>
);
export default function SignupPage() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    agreeTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({});

  const pwStrength = getPasswordStrength(form.password);

  const handleChange = useCallback(
    (field) => (e) => {
      const value =
        e.target.type === "checkbox" ? e.target.checked : e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
      if (touched[field])
        setErrors((prev) => ({
          ...prev,
          [field]: undefined,
          general: undefined,
        }));
      if (field === "password" && touched.confirmPassword) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword:
            form.confirmPassword && form.confirmPassword !== value
              ? "Passwords do not match."
              : undefined,
        }));
      }
    },
    [touched, form.confirmPassword],
  );

  const handleBlur = useCallback(
    (field) => () => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const fe = validate(form);
      setErrors((prev) => ({ ...prev, [field]: fe[field] }));
    },
    [form],
  );

  const handleRoleSelect = (role) => {
    setForm((prev) => ({ ...prev, role }));
    setErrors((prev) => ({ ...prev, role: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(Object.keys(form).map((k) => [k, true])));
    const fe = validate(form);
    if (Object.keys(fe).length > 0) {
      setErrors(fe);
      return;
    }
    setIsLoading(true);
    setErrors({});
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: form.fullName, email: form.email, password: form.password, role: form.role }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        setErrors({ general: data.message || "An error occurred during signup." });
        setIsLoading(false);
        return;
      }
      
      localStorage.setItem("token", data.token);
      window.location.href = `/${data.user.role}/dashboard`;
    } catch (err) {
      setErrors({ general: "Unable to connect to the server." });
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      topLinkQuestion="Already have an account?"
      topLinkLabel="Login"
      topLinkTo="/login"
      heroHeadline={
        <>
          Join thousands building{" "}
          <span className="text-primary-400">cleaner,</span>{" "}
          <span className="gradient-text">smarter</span> cities.
        </>
      }
      heroSub="Report waste, track cleanups, and make a difference. Free to join."
    >
      <div className="mb-4">
        <h2 className="font-display font-bold text-xl text-white mb-0.5">
          Create your account
        </h2>
        <p className="text-gray-400 text-xs">
          Free to join. Be part of a cleaner, greener future.
        </p>
      </div>
      {errors.general && (
        <div
          role="alert"
          className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2"
        >
          <ErrorIcon />
          {errors.general}
        </div>
      )}

      <form
        id="signup-form"
        onSubmit={handleSubmit}
        noValidate
        aria-label="Sign up form"
        className="space-y-3"
      >
          <FormField
            id="signup-fullname"
            label="Full Name"
            error={errors.fullName}
          >
            <TextInput
              id="signup-fullname"
              type="text"
              name="fullName"
              placeholder="Jane Smith"
              autoComplete="name"
              value={form.fullName}
              onChange={handleChange("fullName")}
              onBlur={handleBlur("fullName")}
              hasError={!!errors.fullName}
              disabled={isLoading}
              leftIcon={<User className="w-4 h-4" />}
            />
          </FormField>
          <FormField id="signup-email" label="Email ID" error={errors.email}>
            <TextInput
              id="signup-email"
              type="email"
              name="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={form.email}
              onChange={handleChange("email")}
              onBlur={handleBlur("email")}
              hasError={!!errors.email}
              disabled={isLoading}
              leftIcon={<Mail className="w-4 h-4" />}
            />
          </FormField>
          <div className="space-y-1.5">
            <FormField
              id="signup-password"
              label="Password"
              error={errors.password}
            >
              <TextInput
                id="signup-password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Min 8 characters"
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange("password")}
                onBlur={handleBlur("password")}
                hasError={!!errors.password}
                disabled={isLoading}
                leftIcon={<Lock className="w-4 h-4" />}
                rightSlot={
                  <button
                    type="button"
                    id="signup-toggle-password"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-gray-500 hover:text-gray-300 transition-colors p-0.5"
                    aria-label={showPassword ? "Hide" : "Show"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
              />
            </FormField>
            {form.password && (
              <div className="space-y-1">
                <div
                  className="flex gap-1.5"
                  role="meter"
                  aria-label="Password strength"
                  aria-valuenow={pwStrength.score}
                  aria-valuemin={0}
                  aria-valuemax={4}
                >
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= pwStrength.score ? pwStrength.color : "bg-white/10"}`}
                    />
                  ))}
                </div>
                {pwStrength.label && (
                  <p className="text-xs text-gray-500">
                    Strength:{" "}
                    <span
                      className={`font-medium ${pwStrength.score === 4 ? "text-primary-400" : pwStrength.score === 3 ? "text-blue-400" : pwStrength.score === 2 ? "text-amber-400" : "text-red-400"}`}
                    >
                      {pwStrength.label}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
          <FormField
            id="signup-confirm-password"
            label="Confirm Password"
            error={errors.confirmPassword}
          >
            <TextInput
              id="signup-confirm-password"
              type={showConfirm ? "text" : "password"}
              name="confirmPassword"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={handleChange("confirmPassword")}
              onBlur={handleBlur("confirmPassword")}
              hasError={!!errors.confirmPassword}
              disabled={isLoading}
              leftIcon={<Lock className="w-4 h-4" />}
              rightSlot={
                <button
                  type="button"
                  id="signup-toggle-confirm"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="text-gray-500 hover:text-gray-300 transition-colors p-0.5"
                  aria-label={showConfirm ? "Hide" : "Show"}
                >
                  {showConfirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
            />
          </FormField>
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold text-gray-300 uppercase tracking-wide">
              I am a…
            </span>
            <div className="grid grid-cols-3 gap-2">
              <RoleCard
                value="citizen"
                selected={form.role === "citizen"}
                onSelect={handleRoleSelect}
                disabled={isLoading}
                icon={UserCircle2}
                label="Citizen"
                description="Report waste"
                accent="text-primary-400"
                borderAccent="border-primary-500"
              />
              <RoleCard
                value="worker"
                selected={form.role === "worker"}
                onSelect={handleRoleSelect}
                disabled={isLoading}
                icon={HardHat}
                label="Worker"
                description="Cleanups"
                accent="text-amber-400"
                borderAccent="border-amber-500"
              />
              <RoleCard
                value="admin"
                selected={form.role === "admin"}
                onSelect={handleRoleSelect}
                disabled={isLoading}
                icon={Building2}
                label="Admin"
                description="City ops"
                accent="text-blue-400"
                borderAccent="border-blue-500"
              />
            </div>
            {errors.role && touched.role && (
              <p
                role="alert"
                className="text-xs text-red-400 flex items-center gap-1"
              >
                <ErrorIcon />
                {errors.role}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label className="flex items-start gap-2.5 cursor-pointer group">
              <input
                id="signup-agree-terms"
                type="checkbox"
                checked={form.agreeTerms}
                onChange={handleChange("agreeTerms")}
                onBlur={handleBlur("agreeTerms")}
                disabled={isLoading}
                className="w-4 h-4 mt-0.5 rounded border-white/20 bg-white/10 cursor-pointer accent-[#1aac72] shrink-0"
              />
              <span className="text-xs text-gray-400 group-hover:text-gray-300 leading-relaxed">
                I agree to the{" "}
                <a
                  href="#"
                  className="text-primary-400 hover:text-primary-300 underline underline-offset-2"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="#"
                  className="text-primary-400 hover:text-primary-300 underline underline-offset-2"
                >
                  Privacy Policy
                </a>
              </span>
            </label>
            {errors.agreeTerms && touched.agreeTerms && (
              <p
                role="alert"
                className="text-xs text-red-400 flex items-center gap-1 pl-6"
              >
                <ErrorIcon />
                {errors.agreeTerms}
              </p>
            )}
          </div>
          <button
            id="signup-submit"
            type="submit"
            disabled={isLoading}
            aria-busy={isLoading}
            className="btn-primary w-full justify-center py-2.5 text-sm
                       disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating account…
              </>
            ) : (
              <>
                Create Account <ArrowRight className="w-4 h-4" />
              </>
            )}
        </button>
      </form>
      <OrDivider />
      <GoogleButton
        label="Sign up with Google"
        disabled={isLoading}
        onClick={() => alert("Google OAuth — coming soon.")}
      />
      <p className="mt-5 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link
          to="/login"
          id="signup-goto-login"
          className="text-primary-400 hover:text-primary-300 font-semibold transition-colors"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
