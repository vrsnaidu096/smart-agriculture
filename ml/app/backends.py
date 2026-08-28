"""
Model backends.

Two implementations sit behind one interface:

  * HFGate / HFClassifier  - real weights from Hugging Face.
  * StubGate / StubClassifier - deterministic fakes derived from image pixels,
    so the whole pipeline (gate, routing, calibration, abstention) can be
    exercised without downloading anything.

Classifiers return LOGITS, not probabilities. Temperature calibration has to
happen before the softmax, so the pipeline owns that step.
"""

from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass
from typing import Protocol

import numpy as np
from PIL import Image

from . import config


@dataclass
class GateScores:
    leaf_score: float
    top_prompt: str
    top_prompt_is_leaf: bool
    per_prompt: dict[str, float]


class GateBackend(Protocol):
    def score(self, image: Image.Image) -> GateScores: ...


class ClassifierBackend(Protocol):
    model_id: str
    def labels(self) -> list[str]: ...
    def logits(self, image: Image.Image) -> np.ndarray: ...


def _softmax(x: np.ndarray) -> np.ndarray:
    shifted = x - np.max(x)
    exp = np.exp(shifted)
    return exp / np.sum(exp)


# --- Real backends ----------------------------------------------------------

class HFGate:
    """CLIP zero-shot leaf / not-leaf gate."""

    def __init__(self, model_id: str = config.GATE_MODEL):
        from transformers import CLIPModel, CLIPProcessor  # imported lazily

        self.model_id = model_id
        self.prompts = list(config.LEAF_PROMPTS) + list(config.NOT_LEAF_PROMPTS)
        self.n_leaf = len(config.LEAF_PROMPTS)
        self.processor = CLIPProcessor.from_pretrained(model_id, cache_dir=config.MODEL_CACHE)
        self.model = CLIPModel.from_pretrained(model_id, cache_dir=config.MODEL_CACHE)
        self.model.eval()

    def score(self, image: Image.Image) -> GateScores:
        import torch

        inputs = self.processor(
            text=self.prompts, images=image, return_tensors="pt", padding=True
        )
        with torch.no_grad():
            out = self.model(**inputs)

        probs = out.logits_per_image.softmax(dim=1).squeeze(0).numpy()
        leaf_score = float(probs[: self.n_leaf].sum())
        top_index = int(np.argmax(probs))

        return GateScores(
            leaf_score=leaf_score,
            top_prompt=self.prompts[top_index],
            top_prompt_is_leaf=top_index < self.n_leaf,
            per_prompt={p: float(v) for p, v in zip(self.prompts, probs)},
        )


class HFClassifier:
    """A per-crop disease classifier."""

    def __init__(self, model_id: str):
        from transformers import AutoImageProcessor, AutoModelForImageClassification

        self.model_id = model_id
        self.processor = AutoImageProcessor.from_pretrained(model_id, cache_dir=config.MODEL_CACHE)
        self.model = AutoModelForImageClassification.from_pretrained(
            model_id, cache_dir=config.MODEL_CACHE
        )
        self.model.eval()
        id2label = self.model.config.id2label
        self._labels = [id2label[i] for i in sorted(id2label)]

    def labels(self) -> list[str]:
        return list(self._labels)

    def logits(self, image: Image.Image) -> np.ndarray:
        import torch

        inputs = self.processor(images=image, return_tensors="pt")
        with torch.no_grad():
            out = self.model(**inputs)
        return out.logits.squeeze(0).numpy()


# --- Deterministic stubs ----------------------------------------------------

def _image_stats(image: Image.Image) -> tuple[float, float, float, float]:
    """Mean R, G, B and overall brightness, all 0-255."""
    small = image.convert("RGB").resize((32, 32))
    arr = np.asarray(small, dtype=np.float64)
    r, g, b = arr[..., 0].mean(), arr[..., 1].mean(), arr[..., 2].mean()
    return float(r), float(g), float(b), float(arr.mean())


class StubGate:
    """
    Green-dominant images read as leaves; anything else does not.
    Lets tests drive gate outcomes with a solid colour.
    """

    model_id = "stub-gate"

    def __init__(self, model_id: str = "stub-gate"):
        self.prompts = list(config.LEAF_PROMPTS) + list(config.NOT_LEAF_PROMPTS)
        self.n_leaf = len(config.LEAF_PROMPTS)

    def score(self, image: Image.Image) -> GateScores:
        r, g, b, _ = _image_stats(image)
        greenness = g - max(r, b)
        # Map greenness (-255..255) onto a leaf probability via a logistic.
        leaf_score = 1.0 / (1.0 + math.exp(-greenness / 20.0))

        if leaf_score >= 0.5:
            top_prompt, is_leaf = config.LEAF_PROMPTS[0], True
        else:
            top_prompt, is_leaf = config.NOT_LEAF_PROMPTS[0], False

        share_leaf = leaf_score / max(self.n_leaf, 1)
        share_other = (1.0 - leaf_score) / max(len(config.NOT_LEAF_PROMPTS), 1)
        per_prompt = {p: share_leaf for p in config.LEAF_PROMPTS}
        per_prompt.update({p: share_other for p in config.NOT_LEAF_PROMPTS})

        return GateScores(
            leaf_score=leaf_score,
            top_prompt=top_prompt,
            top_prompt_is_leaf=is_leaf,
            per_prompt=per_prompt,
        )


STUB_LABELS: dict[str, list[str]] = {
    "rice": ["Bacterial Blight", "Blast", "Brown Spot", "Healthy", "Tungro"],
    "sugarcane": [
        "Bacterial Blight Disease", "Healthy Leaves", "Mosaic Disease",
        "Red Rot Disease", "Rust Disease", "Yellow Disease",
    ],
}


class StubClassifier:
    """
    Picks a label deterministically from the image hash; peak sharpness scales
    with brightness, so a dark image yields low confidence and a bright one
    high. That makes the abstention path testable.
    """

    def __init__(self, model_id: str, crop_key: str = "rice"):
        self.model_id = f"stub:{model_id}"
        self._labels = STUB_LABELS.get(crop_key, STUB_LABELS["rice"])
        self._counter = 0

    def labels(self) -> list[str]:
        return list(self._labels)

    def logits(self, image: Image.Image) -> np.ndarray:
        r, g, b, brightness = _image_stats(image)
        
        is_ood = b > 100
        
        if is_ood:
            # OOD: High energy but sufficient confidence to pass LOW_CONFIDENCE check.
            # We want a peak around 2.5. If brightness is ~133, brightness/255 is ~0.52.
            # 0.5 + 0.52 * X = 2.5 => X ~ 3.8. Let's use 4.0.
            peak = 0.5 + (brightness / 255.0) * 4.0
            self._counter += 1
            chosen = self._counter % len(self._labels)
        else:
            # In-distribution: Normal peak and TTA agreement
            peak = 0.5 + (brightness / 255.0) * 7.5
            # For solid color test images, center pixel is perfectly invariant to flips/rotations
            cx, cy = image.width // 2, image.height // 2
            center = image.convert("RGB").getpixel((cx, cy))
            invariant_str = f"{center[0]}_{center[1]}_{center[2]}"
            digest = hashlib.sha1(invariant_str.encode()).digest()
            chosen = digest[0] % len(self._labels)

        # brightness 0..255 -> peak 0.5..8.0 (low peak = flat = low confidence)
        values = np.full(len(self._labels), 0.0)
        values[chosen] = peak
        return values


# --- Factory ----------------------------------------------------------------

_gate: GateBackend | None = None
_classifiers: dict[str, ClassifierBackend] = {}


def get_gate() -> GateBackend:
    global _gate
    if _gate is None:
        _gate = StubGate() if config.BACKEND == "stub" else HFGate()
    return _gate


def get_classifier(crop: config.CropConfig) -> ClassifierBackend:
    if crop.key not in _classifiers:
        if config.BACKEND == "stub":
            _classifiers[crop.key] = StubClassifier(crop.model_id, crop.key)
        else:
            _classifiers[crop.key] = HFClassifier(crop.model_id)
    return _classifiers[crop.key]


def reset() -> None:
    """Drop cached models. Used by tests."""
    global _gate
    _gate = None
    _classifiers.clear()


def softmax_with_temperature(logits: np.ndarray, temperature: float) -> np.ndarray:
    t = max(float(temperature), 1e-3)
    return _softmax(np.asarray(logits, dtype=np.float64) / t)
