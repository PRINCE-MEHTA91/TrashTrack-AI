import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  ArrowRight,
  Loader2,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import AuthLayout from "../components/auth/AuthLayout";
import { FormField, TextInput } from "../components/auth/FormField";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState("request");

  const validate = (val) => {
    if (!val.trim()) return "Email or phone number is required.";
    const re = /^(\+?[0-9\s\-]{7,15}|[^\s@]+@[^\s@]+\.[^\s@]+)$/;
    if (!re.test(val.trim()))
      return "Enter a valid email address or phone number.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    const err = validate(email);
    if (err) {
      setError(err);
      return;
    }
    setIsLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 1500));
    setIsLoading(false);
    setStep("sent");
  };

  return (
    <AuthLayout
      topLinkQuestion="Remember your password?"
      topLinkLabel="Sign In"
      topLinkTo="/login"
      heroHeadline={
        <>
          Reset your <span className="text-primary-400">TrashTrack AI</span>{" "}
          password
        </>
      }
      heroSub="Enter your email or phone and we'll send you a secure link to reset your password."
    >
      {step === "request" ? (
        <>
          <div className="mb-6">
            <h2 className="font-display font-bold text-2xl text-white mb-1">
              Forgot password?
            </h2>
            <p className="text-gray-400 text-sm">
              No worries. Enter your email or phone and we'll send a reset link.
            </p>
          </div>

          <form
            id="forgot-password-form"
            onSubmit={handleSubmit}
            noValidate
            aria-label="Forgot password form"
            className="space-y-4"
          >
            <FormField
              id="forgot-email"
              label="Email or Phone Number"
              error={touched ? error : undefined}
            >
              <TextInput
                id="forgot-email"
                type="text"
                name="email"
                placeholder="you@example.com or +91 98765 43210"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (touched) setError(validate(e.target.value));
                }}
                onBlur={() => {
                  setTouched(true);
                  setError(validate(email));
                }}
                hasError={touched && !!error}
                disabled={isLoading}
                leftIcon={<Mail className="w-4 h-4" />}
              />
            </FormField>

            <button
              id="forgot-submit"
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
              className="btn-primary w-full justify-center py-3 text-base mt-1
                         disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  Send Reset Link <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            <Link
              to="/login"
              id="forgot-back-to-login"
              className="inline-flex items-center gap-1.5 text-primary-400 hover:text-primary-300 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </Link>
          </p>
        </>
      ) : (
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-primary-500/15 border border-primary-500/30 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-primary-400" />
          </div>
          <h2 className="font-display font-bold text-2xl text-white mb-2">
            Check your inbox
          </h2>
          <p className="text-gray-400 text-sm mb-1">
            We've sent a password reset link to:
          </p>
          <p className="text-primary-400 font-semibold text-sm mb-6 break-all">
            {email}
          </p>
          <p className="text-gray-500 text-xs mb-8 leading-relaxed">
            Didn't receive it? Check your spam folder, or{" "}
            <button
              onClick={() => setStep("request")}
              className="text-primary-400 hover:text-primary-300 underline underline-offset-2 cursor-pointer"
            >
              try again
            </button>
            .
          </p>
          <Link
            to="/login"
            id="forgot-success-login"
            className="btn-primary w-full justify-center py-3 text-base"
          >
            Back to Sign In
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
