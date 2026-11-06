# Image preprocessing for the TrashTrack MobileNetV2 classifier.
# Normalisation: (pixel / 127.5) - 1.0 → [-1, 1], resize to 224×224 RGB.

import io
import numpy as np
from PIL import Image, UnidentifiedImageError


# Constants
TARGET_SIZE = (224, 224)        # (height, width) expected by the model
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB hard limit


# Allowed MIME types (Pillow validates the actual bytes too)
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/tiff",
}


def validate_and_load_image(file_bytes: bytes, content_type: str = "") -> Image.Image:
    """Validate uploaded bytes and return a PIL Image. Raises ValueError on bad input."""
    # Size guard
    if len(file_bytes) > MAX_FILE_BYTES:
        raise ValueError(
            f"Uploaded file is too large ({len(file_bytes) // 1024} KB). "
            f"Maximum allowed size is {MAX_FILE_BYTES // (1024 * 1024)} MB."
        )

    # MIME-type check (advisory)
    if content_type and content_type.split(";")[0].strip().lower() not in ALLOWED_MIME_TYPES:
        raise ValueError(
            f"Unsupported file type '{content_type}'. "
            f"Accepted types: JPEG, PNG, WebP, BMP, TIFF."
        )

    # Decode bytes → PIL Image (catches corrupt payloads)
    try:
        img = Image.open(io.BytesIO(file_bytes))
        img.verify()  # validate without decoding pixel data
    except (UnidentifiedImageError, Exception) as exc:
        raise ValueError(f"The uploaded file is not a valid image: {exc}") from exc

    # Re-open after verify() — it leaves the file pointer unusable
    img = Image.open(io.BytesIO(file_bytes))
    return img


def preprocess_image(img: Image.Image) -> np.ndarray:
    """RGB → resize 224×224 → float32 → MobileNetV2 normalise → add batch dim."""
    img = img.convert("RGB")                              # Step 1 – RGB
    img = img.resize(TARGET_SIZE, Image.Resampling.LANCZOS)  # Step 2 – resize
    arr = np.array(img, dtype=np.float32)                 # Step 3 – float32
    arr = (arr / 127.5) - 1.0                             # Step 4 – normalise [-1, 1]
    arr = np.expand_dims(arr, axis=0)                     # Step 5 – (1, 224, 224, 3)
    return arr

