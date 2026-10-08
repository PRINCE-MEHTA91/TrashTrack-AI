/**
 * Centralised API base URL.
 *
 * VITE_API_URL may be set to either:
 *   - the bare origin:  https://trashtrack-ai.onrender.com
 *   - or with the path: https://trashtrack-ai.onrender.com/api/v1
 *
 * Either way, this module always exports the full base that ends with /api/v1,
 * so every fetch in the app can safely do `${API_URL}/auth/login` etc.
 */

const _raw =
  import.meta.env.VITE_API_URL || "https://trashtrack-ai.onrender.com";

// If the env var already contains /api/v1 (e.g. from .env on localhost) keep
// it as-is; otherwise append the versioned path.
export const API_URL = _raw.endsWith("/api/v1")
  ? _raw
  : `${_raw.replace(/\/$/, "")}/api/v1`;
