import { useRef, useCallback } from "react";

export default function OTPInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  hasError = false,
}) {
  const inputs = useRef([]);

  const focusAt = (i) => {
    const el = inputs.current[Math.max(0, Math.min(i, length - 1))];
    el?.focus();
    el?.select();
  };

  const handleChange = useCallback(
    (i, raw) => {
      const digit = raw.replace(/\D/g, "").slice(-1);
      const chars = value.padEnd(length, " ").split("");
      chars[i] = digit || " ";
      const next = chars.join("").replace(/ /g, "");
      onChange(chars.map((c) => (c === " " ? "" : c)).join(""));
      if (digit) focusAt(i + 1);
    },
    [value, length, onChange],
  );

  const handleKeyDown = useCallback(
    (i, e) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        const chars = value.padEnd(length, "").split("");
        if (chars[i]) {
          chars[i] = "";
          onChange(chars.join(""));
        } else {
          focusAt(i - 1);
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        focusAt(i - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        focusAt(i + 1);
      }
    },
    [value, length, onChange],
  );

  const handlePaste = useCallback(
    (e) => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, length);
      onChange(pasted);
      focusAt(pasted.length < length ? pasted.length : length - 1);
    },
    [length, onChange],
  );

  return (
    <div
      className="flex items-center gap-2 justify-center"
      role="group"
      aria-label="One-time password"
    >
      {Array.from({ length }).map((_, i) => {
        const digit = value[i] ?? "";
        const isFilled = digit !== "";
        return (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            id={`otp-box-${i}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            disabled={disabled}
            autoComplete="one-time-code"
            aria-label={`Digit ${i + 1} of ${length}`}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className={`
              w-11 h-13 text-center text-xl font-bold rounded-xl border-2
              bg-white text-black outline-none
              transition-all duration-200 caret-transparent
              focus:scale-105
              disabled:opacity-40 disabled:cursor-not-allowed
              ${
                hasError
                  ? "border-red-500 bg-red-50 text-red-600"
                  : isFilled
                    ? "border-primary-500 text-black shadow-glow-sm"
                    : "border-gray-200 hover:border-gray-300 focus:border-primary-400"
              }
            `}
            style={{ width: "2.75rem", height: "3.25rem" }}
          />
        );
      })}
    </div>
  );
}
