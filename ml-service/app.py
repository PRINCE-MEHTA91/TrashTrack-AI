# TrashTrack AI — ML Service
# FastAPI app serving the MobileNetV2 waste classifier.

from __future__ import annotations

import os
import logging
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from utils.preprocessing import validate_and_load_image, preprocess_image
from utils.prediction import run_prediction

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ml-service")

# Environment
load_dotenv()

# Model path: env var takes precedence, then the default relative path
_model_env = os.getenv("MODEL_PATH", "")
MODEL_PATH: Path = (
    Path(_model_env)
    if _model_env
    else Path(__file__).parent / "models" / "trashtrack_mobilenet_best.keras"
)

# CORS origins – comma-separated list from env
_raw_origins = os.getenv(
    "ML_ALLOWED_ORIGINS",
    "http://localhost:5000,http://localhost:5173,http://localhost:5174",
)
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

# App state – shared across requests
app_state: dict = {
    "model": None,
    "model_loaded": False,
    "model_error": None,
}


# Load model once at startup, release on shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan: load model on startup, clean up on shutdown."""
    logger.info("ML Service starting up…")
    logger.info(f"Looking for model at: {MODEL_PATH.resolve()}")

    if not MODEL_PATH.exists():
        msg = (
            f"Model file not found: {MODEL_PATH.resolve()}. "
            "Place 'trashtrack_mobilenet_best.keras' in ml-service/models/ "
            "and restart the service."
        )
        logger.error(msg)
        app_state["model_error"] = msg
        app_state["model_loaded"] = False
    else:
        try:
            # Lazy TF import for descriptive startup errors
            import tensorflow as tf

            logger.info(f"TensorFlow version: {tf.__version__}")
            logger.info("Loading model (this may take a few seconds)…")

            model = tf.keras.models.load_model(str(MODEL_PATH))
            app_state["model"] = model
            app_state["model_loaded"] = True

            logger.info(
                f"Model loaded successfully. "
                f"Input shape: {model.input_shape}, "
                f"Output shape: {model.output_shape}"
            )
        except Exception as exc:
            msg = f"Failed to load model: {exc}"
            logger.error(msg, exc_info=True)
            app_state["model_error"] = msg
            app_state["model_loaded"] = False

    yield  # app runs

    logger.info("ML Service shutting down.")
    app_state["model"] = None


# FastAPI app
app = FastAPI(
    title="TrashTrack ML Service",
    description=(
        "Waste image classification API powered by a trained MobileNetV2 model. "
        "Accepts uploaded images and returns the predicted waste category with "
        "confidence scores."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Request-Source"],
)


# Routes

@app.get("/", summary="Service info", tags=["Meta"])
async def root():
    """Return service metadata."""
    return {
        "service": "TrashTrack ML Service",
        "version": "1.0.0",
        "model": "MobileNetV2",
        "classes": 9,
        "input_shape": "224x224x3",
        "model_loaded": app_state["model_loaded"],
        "endpoints": {
            "health": "GET /health",
            "predict": "POST /predict  (multipart/form-data, field name: 'file')",
        },
    }


@app.get("/health", summary="Health check", tags=["Meta"])
async def health():
    """200 when model is ready, 503 otherwise."""
    if app_state["model_loaded"]:
        return {
            "status": "ok",
            "model_loaded": True,
            "model_path": str(MODEL_PATH.resolve()),
        }

    return JSONResponse(
        status_code=503,
        content={
            "status": "unavailable",
            "model_loaded": False,
            "error": app_state.get("model_error") or "Model not loaded.",
        },
    )


@app.post("/predict", summary="Classify a waste image", tags=["Inference"])
async def predict(file: UploadFile = File(..., description="Waste image to classify")):
    """Accept an image, run inference, return top-3 predictions."""
    # Model must be ready
    if not app_state["model_loaded"]:
        raise HTTPException(
            status_code=503,
            detail="ML model is not loaded. Check /health for details.",
        )

    # 1. Read bytes
    try:
        file_bytes = await file.read()
    except Exception as exc:
        logger.warning(f"Failed to read uploaded file: {exc}")
        raise HTTPException(status_code=400, detail="Could not read the uploaded file.")

    # 2. Validate → PIL Image
    try:
        img = validate_and_load_image(file_bytes, content_type=file.content_type or "")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # 3. Preprocess
    try:
        preprocessed = preprocess_image(img)
    except Exception as exc:
        logger.error(f"Preprocessing error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Image preprocessing failed.")

    # 4. Inference
    try:
        result = run_prediction(app_state["model"], preprocessed)
    except Exception as exc:
        logger.error(f"Inference error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Prediction failed.")

    logger.info(
        f"Prediction: {result['waste_type']} ({result['confidence']}%) "
        f"| file={file.filename!r} content_type={file.content_type!r}"
    )

    return result

