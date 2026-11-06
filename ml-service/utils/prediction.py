# Inference utilities for the TrashTrack MobileNetV2 waste classifier.

from __future__ import annotations

import numpy as np

# Class mapping – alphabetical order from training dataset
CLASS_NAMES: list[str] = [
    "Cardboard",          # 0
    "Food Organics",      # 1
    "Glass",              # 2
    "Metal",              # 3
    "Miscellaneous Trash",# 4
    "Paper",              # 5
    "Plastic",            # 6
    "Textile Trash",      # 7
    "Vegetation",         # 8
]

NUM_CLASSES = len(CLASS_NAMES)  # 9
TOP_K = 3  # number of top predictions to return


def run_prediction(model, preprocessed_image: np.ndarray) -> dict:
    """Run inference; return top-1 class + top-3 predictions with confidence %."""
    raw_output = model.predict(preprocessed_image, verbose=0)  # (1, 9)
    probabilities: np.ndarray = raw_output[0]                  # (9,)

    # If the model outputs logits, apply softmax here:
    # from scipy.special import softmax; probabilities = softmax(probabilities)

    # Top-1
    top1_idx: int = int(np.argmax(probabilities))
    top1_conf: float = round(float(probabilities[top1_idx]) * 100, 2)
    top1_class: str = CLASS_NAMES[top1_idx]

    # Top-K
    top_k_indices = np.argsort(probabilities)[::-1][:TOP_K]
    top_predictions = [
        {
            "class": CLASS_NAMES[int(i)],
            "confidence": round(float(probabilities[int(i)]) * 100, 2),
        }
        for i in top_k_indices
    ]

    return {
        "success": True,
        "waste_type": top1_class,
        "confidence": top1_conf,
        "top_predictions": top_predictions,
    }

