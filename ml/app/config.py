"""
Configuration for the disease inference sidecar.

Everything tunable lives here: model ids, the CLIP gate's prompt sets, and the
per-crop abstention thresholds. Thresholds are deliberately NOT guessed inline
anywhere else in the codebase — they are fitted by harness/evaluate.py and
written back here, so every number has a measurement behind it.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

# --- Model identities -------------------------------------------------------

GATE_MODEL = os.getenv("GATE_MODEL", "openai/clip-vit-base-patch32")

RICE_MODEL = os.getenv("RICE_MODEL", "prithivMLmods/Rice-Leaf-Disease")
SUGARCANE_MODEL = os.getenv("SUGARCANE_MODEL", "dwililiya/sugarcane-plant-diseases-classification")

# 'hf' loads real weights; 'stub' uses a deterministic fake for testing the
# pipeline without downloading anything.
BACKEND = os.getenv("ML_BACKEND", "hf").lower()

MODEL_CACHE = os.getenv("MODEL_CACHE", None)

ENABLE_TTA = os.getenv("ENABLE_TTA", "false").lower() in ("true", "1", "yes")
TTA_AGREEMENT_THRESHOLD = float(os.getenv("TTA_AGREEMENT_THRESHOLD", "0.6"))

ENABLE_ENERGY = os.getenv("ENABLE_ENERGY", "true").lower() in ("true", "1", "yes")
ENERGY_THRESHOLD = float(os.getenv("ENERGY_THRESHOLD", "-3.0"))


# --- The gate ---------------------------------------------------------------
# CLIP scores an image against every prompt below and softmaxes across all of
# them. Anything whose probability mass lands outside LEAF_PROMPTS is not a
# crop photo. Adding a new reject category means writing a sentence here — no
# retraining. Negative prompts are deliberately specific: vague ones ("a
# photo") absorb probability from everything and blunt the gate.

LEAF_PROMPTS: list[str] = [
    "a close-up photo of a plant leaf",
    "a close-up photo of a diseased crop leaf with spots or lesions",
    "a photo of a rice paddy leaf",
    "a photo of a sugarcane leaf",
    "a close-up photo of green foliage filling the frame",
]

NOT_LEAF_PROMPTS: list[str] = [
    "a photo of a road or street",
    "a photo of a building or wall",
    "a photo of a person or a human hand",
    "a photo of bare soil, sand or mud",
    "a photo of the sky or clouds",
    "a photo of a car or machinery",
    "a photo of an indoor room",
    "a photo of food on a plate",
    "a photo of an animal",
    "a screenshot of text or a document",
    "a photo of water, a river or a lake",
    "a distant photo of a whole field or landscape",
]

# Minimum share of probability mass that must fall on LEAF_PROMPTS.
GATE_MIN_LEAF_SCORE = float(os.getenv("GATE_MIN_LEAF_SCORE", "0.55"))


# --- Per-crop settings ------------------------------------------------------

@dataclass(frozen=True)
class CropConfig:
    key: str
    model_id: str
    # Softmax floor below which we abstain instead of answering. Fitted from
    # the precision/abstention curve in the harness.
    min_confidence: float
    # Temperature for calibration. 1.0 = uncalibrated raw softmax. Values > 1
    # soften overconfident models. Fitted on a validation split.
    temperature: float = 1.0
    # Labels the model can emit that mean "nothing wrong".
    healthy_labels: tuple[str, ...] = ("healthy", "normal", "healthy leaves")
    notes: str = ""


CROPS: dict[str, CropConfig] = {
    "rice": CropConfig(
        key="rice",
        model_id=RICE_MODEL,
        min_confidence=float(os.getenv("RICE_MIN_CONFIDENCE", "0.70")),
        temperature=float(os.getenv("RICE_TEMPERATURE", "1.0")),
        notes="SigLIP2-base, 5 classes, 94.77% on its own test split (Apache-2.0).",
    ),
    "sugarcane": CropConfig(
        key="sugarcane",
        model_id=SUGARCANE_MODEL,
        # Deliberately stricter: this model reports ~86.8% versus rice's ~94.8%,
        # so more of its output is pushed into "retake the photo" rather than
        # shown to a farmer as a diagnosis.
        min_confidence=float(os.getenv("SUGARCANE_MIN_CONFIDENCE", "0.85")),
        temperature=float(os.getenv("SUGARCANE_TEMPERATURE", "1.0")),
        notes="EfficientNet, 6 classes, ~86.8% test accuracy (CDLA-Sharing-1.0). "
              "Weaker than rice - abstains more aggressively by design.",
    ),
}

DEFAULT_CROP = "rice"


def crop_config(crop_name: str | None) -> CropConfig:
    """Resolve a user-supplied crop name to a config, falling back to default."""
    key = (crop_name or DEFAULT_CROP).strip().lower()
    return CROPS.get(key, CROPS[DEFAULT_CROP])


# --- Limits -----------------------------------------------------------------

MAX_IMAGE_BYTES = int(os.getenv("MAX_IMAGE_BYTES", str(8 * 1024 * 1024)))
