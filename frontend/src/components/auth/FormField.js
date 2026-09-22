import { forwardRef } from "react";

export function FormField({ id, label, error, children }) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block text-xs font-semibold text-gray-300 uppercase tracking-wide"
      >
        {label}
      </label>
      {children}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs text-red-400 flex items-center gap-1"
        >
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
          {error}
        </p>
      )}
    </div>
  );
}

export const TextInput = forwardRef(
  ({ id, hasError, leftIcon, rightSlot, className = "", ...rest }, ref) => {
    return (
      <div className="relative flex items-center">
        {leftIcon && (
          <span
            className="absolute left-3.5 text-gray-500 pointer-events-none"
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={hasError ? "true" : undefined}
          className={`
            w-full bg-white border rounded-xl px-4 py-2.5 text-sm text-black
            placeholder-gray-500 outline-none transition-all duration-200
            ${leftIcon ? "pl-10" : ""}
            ${rightSlot ? "pr-12" : ""}
            ${
              hasError
                ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/40"
                : "border-gray-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 hover:border-gray-300"
            }
            ${className}
          `}
          {...rest}
        />

        {rightSlot && (
          <span className="absolute right-3.5 flex items-center">
            {rightSlot}
          </span>
        )}
      </div>
    );
  },
);
TextInput.displayName = "TextInput";

export function OrDivider() {
  return (
    <div className="relative flex items-center gap-3 my-4">
      <span className="flex-1 h-px bg-surface-border" />
      <span className="text-gray-500 text-xs font-medium shrink-0">
        or continue with
      </span>
      <span className="flex-1 h-px bg-surface-border" />
    </div>
  );
}

export function GoogleButton({
  label = "Continue with Google",
  disabled = false,
  onClick,
}) {
  return (
    <button
      type="button"
      id="google-oauth-btn"
      disabled={disabled}
      onClick={onClick}
      className={`
        w-full flex items-center justify-center gap-3
        px-4 py-3 rounded-xl border border-surface-border
        bg-surface-muted hover:bg-white/5 hover:border-white/20
        text-gray-200 text-sm font-medium
        transition-all duration-200 hover:-translate-y-0.5
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
        active:scale-[0.98]
      `}
      aria-label="Sign in with Google"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
          fill="#4285F4"
        />

        <path
          d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
          fill="#34A853"
        />

        <path
          d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
          fill="#FBBC05"
        />

        <path
          d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
          fill="#EA4335"
        />
      </svg>
      {label}
    </button>
  );
}
