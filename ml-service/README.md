# TrashTrack ML Service

Standalone Python microservice that classifies waste images using a trained **MobileNetV2** model.

## Stack

| Technology | Purpose |
|---|---|
| **FastAPI** | HTTP framework |
| **Uvicorn** | ASGI server |
| **TensorFlow 2.18** | Model loading & inference |
| **Pillow** | Image decoding & resizing |
| **NumPy** | Tensor manipulation |

## Waste Classes (9)

| Index | Class |
|---|---|
| 0 | Cardboard |
| 1 | Food Organics |
| 2 | Glass |
| 3 | Metal |
| 4 | Miscellaneous Trash |
| 5 | Paper |
| 6 | Plastic |
| 7 | Textile Trash |
| 8 | Vegetation |

---

## Quick Start

### 1 — Add the model file

Place your trained model in:

```
ml-service/models/trashtrack_mobilenet_best.keras
```

> The model is **not** committed to Git. It is excluded by `.gitignore`.

### 2 — Create a Python virtual environment

```bash
cd ml-service
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 3 — Install dependencies

```bash
pip install -r requirements.txt
```

### 4 — Set environment variables

```bash
cp .env.example .env
# Edit .env if you need a custom PORT or MODEL_PATH
```

### 5 — Start the service

```bash
# Development (auto-reload)
uvicorn app:app --reload --port 8000

# Production
uvicorn app:app --host 0.0.0.0 --port 8000 --workers 1
```

---

## API Endpoints

### `GET /`

Returns service metadata.

### `GET /health`

```json
{ "status": "ok", "model_loaded": true, "model_path": "..." }
```

Returns `503` when the model failed to load.

### `POST /predict`

**Content-type:** `multipart/form-data`  
**Field name:** `file` (image file)

**Success response (200):**

```json
{
  "success": true,
  "waste_type": "Plastic",
  "confidence": 92.45,
  "top_predictions": [
    { "class": "Plastic",   "confidence": 92.45 },
    { "class": "Metal",     "confidence":  4.21 },
    { "class": "Glass",     "confidence":  2.11 }
  ]
}
```

**Error responses:**

| Status | Meaning |
|---|---|
| `422` | Invalid or corrupt image |
| `503` | Model not loaded |
| `500` | Internal inference error |

---

## Manual API Test

Using `curl`:

```bash
# Health
curl http://localhost:8000/health

# Classify an image
curl -X POST http://localhost:8000/predict \
  -F "file=@/path/to/waste_image.jpg"
```

---

## Docker

```bash
# Build
docker build -t trashtrack-ml-service .

# Run (mount the models directory)
docker run -p 8000:8000 \
  -v "$(pwd)/models:/app/models" \
  trashtrack-ml-service
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8000` | Server port |
| `MODEL_PATH` | `models/trashtrack_mobilenet_best.keras` | Path to the `.keras` model |
| `ML_ALLOWED_ORIGINS` | `http://localhost:5000,...` | Comma-separated CORS origins |

---

## Integration with the Node.js Backend

The Node.js backend communicates with this service via:

```
POST http://localhost:8000/predict
```

The URL is configured in `backend/.env`:

```env
ML_SERVICE_URL=http://localhost:8000
```

The backend exposes a proxied endpoint at:

```
POST /api/v1/classify
```

This keeps the ML service URL hidden from the React frontend.

---

## Preprocessing Details

The preprocessing in `utils/preprocessing.py` exactly mirrors the training pipeline:

1. **RGB conversion** — alpha channel and greyscale images are normalised to RGB.
2. **Resize to 224 × 224** — LANCZOS resampling.
3. **MobileNetV2 normalisation** — `pixel = (pixel / 127.5) - 1.0` → range `[-1, 1]`.
4. **Batch dimension** — shape `(1, 224, 224, 3)`.

> **Important:** If your training notebook used a different normalisation (e.g. `/255.0`), update `preprocess_image()` in `utils/preprocessing.py` accordingly.

