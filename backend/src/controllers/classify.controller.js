/**
 * classify.controller.js
 *
 * Handles POST /api/v1/classify — receives a base64-encoded image from the
 * React frontend, converts it to a binary multipart upload, forwards it to
 * the Python ML service, and returns the prediction to the client.
 *
 * Security notes:
 *  - The ML_SERVICE_URL is never exposed to the frontend.
 *  - File size and MIME type are validated before forwarding.
 *  - Internal ML service errors are sanitised before reaching the client.
 *  - Request timeout prevents hanging when the ML service is slow/down.
 */

import fetch from "node-fetch";
import FormData from "form-data";

// ── Constants ──────────────────────────────────────────────────────────────────
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

/** Maximum base64 string length ≈ 10 MB binary (base64 is ~4/3 overhead) */
const MAX_BASE64_LENGTH = 10 * 1024 * 1024 * (4 / 3) + 4; // ~13.7 M chars

/** Allowed image MIME types */
const ALLOWED_MIME_PREFIXES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/bmp"];

/** ML service request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 30_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse a data URL (e.g. "data:image/jpeg;base64,/9j/...")
 * Returns { mimeType, buffer } or throws if the format is invalid.
 */
function parseDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) {
    throw Object.assign(new Error("Invalid image format. Expected a base64 data URL."), {
      statusCode: 422,
    });
  }
  const mimeType = match[1].toLowerCase();
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, "base64");
  return { mimeType, buffer };
}

/**
 * Derive an appropriate file extension from a MIME type.
 */
function extensionForMime(mime) {
  const map = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/bmp": "bmp",
  };
  return map[mime] || "jpg";
}

// ── Controller ────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/classify
 *
 * Request body (JSON):
 *   { "image": "<base64 data URL>" }
 *
 * Response (JSON):
 *   {
 *     success: true,
 *     waste_type: "Plastic",
 *     confidence: 92.45,
 *     top_predictions: [{ class: "Plastic", confidence: 92.45 }, ...]
 *   }
 */
export const classifyWasteImage = async (req, res, next) => {
  try {
    const { image } = req.body;

    // ── 1. Presence check ───────────────────────────────────────────────────
    if (!image || typeof image !== "string") {
      return res.status(400).json({
        success: false,
        message: "Request body must include an 'image' field containing a base64 data URL.",
      });
    }

    // ── 2. Size guard (before decoding) ────────────────────────────────────
    if (image.length > MAX_BASE64_LENGTH) {
      return res.status(413).json({
        success: false,
        message: "Image is too large. Maximum size is 10 MB.",
      });
    }

    // ── 3. Parse & validate data URL ───────────────────────────────────────
    let mimeType, imageBuffer;
    try {
      ({ mimeType, buffer: imageBuffer } = parseDataUrl(image));
    } catch (err) {
      return res.status(422).json({ success: false, message: err.message });
    }

    if (!ALLOWED_MIME_PREFIXES.includes(mimeType)) {
      return res.status(422).json({
        success: false,
        message: `Unsupported image type '${mimeType}'. Accepted: JPEG, PNG, WebP, BMP.`,
      });
    }

    // Binary-size guard (after decoding)
    if (imageBuffer.byteLength > 10 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        message: "Image binary data exceeds 10 MB limit.",
      });
    }

    // ── 4. Build multipart/form-data payload ───────────────────────────────
    const form = new FormData();
    const filename = `upload.${extensionForMime(mimeType)}`;
    form.append("file", imageBuffer, {
      filename,
      contentType: mimeType,
      knownLength: imageBuffer.byteLength,
    });

    // ── 5. Forward to ML service ───────────────────────────────────────────
    const mlUrl = `${ML_SERVICE_URL.replace(/\/$/, "")}/predict`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let mlResponse;
    try {
      mlResponse = await fetch(mlUrl, {
        method: "POST",
        body: form,
        headers: form.getHeaders(),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        return res.status(504).json({
          success: false,
          message: "Classification request timed out. Please try again.",
        });
      }
      // ML service unreachable
      console.error("[classify] ML service unreachable:", err.message);
      return res.status(503).json({
        success: false,
        message: "Classification service is currently unavailable. Please try again later.",
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // ── 6. Parse ML response ───────────────────────────────────────────────
    let mlData;
    try {
      mlData = await mlResponse.json();
    } catch {
      return res.status(502).json({
        success: false,
        message: "Received an invalid response from the classification service.",
      });
    }

    if (!mlResponse.ok) {
      // Forward a sanitised error (no internal detail) to the client
      const detail = mlData?.detail || mlData?.message || "Classification failed.";
      return res.status(mlResponse.status >= 500 ? 503 : mlResponse.status).json({
        success: false,
        message: detail,
      });
    }

    // ── 7. Return prediction ───────────────────────────────────────────────
    return res.status(200).json(mlData);
  } catch (err) {
    next(err); // Delegate unexpected errors to the Express error handler
  }
};

