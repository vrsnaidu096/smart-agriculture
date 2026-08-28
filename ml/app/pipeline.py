"""
The inference pipeline.

    gate -> route by declared crop -> classify -> calibrate -> answer or abstain

There is no mock path. If a model cannot run, the result is UNAVAILABLE and the
caller must say so - it must never invent a diagnosis.
"""

from __future__ import annotations

import base64
import binascii
import io
import logging
from dataclasses import dataclass, field, asdict

import numpy as np
from PIL import Image, UnidentifiedImageError

from . import backends, config

log = logging.getLogger(__name__)

# Status values
OK = "OK"
REJECTED = "REJECTED"
ABSTAINED = "ABSTAINED"
UNAVAILABLE = "UNAVAILABLE"

# Reject reasons
NOT_A_LEAF = "NOT_A_LEAF"
LOW_CONFIDENCE = "LOW_CONFIDENCE"
UNDECODABLE = "UNDECODABLE"
TOO_LARGE = "TOO_LARGE"

_MAGIC = (
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
)


@dataclass
class Result:
    status: str
    crop: str | None = None
    label: str | None = None
    confidence: float | None = None
    health_status: str | None = None
    reject_reason: str | None = None
    message: str | None = None
    gate: dict | None = None
    model_version: str | None = None
    threshold: float | None = None
    top_k: list[dict] = field(default_factory=list)
    source: str = "live"
    tta_agreement: float | None = None
    energy: float | None = None

    def to_dict(self) -> dict:
        return asdict(self)


def decode_image(payload: str | bytes) -> Image.Image:
    """Decode a base64 data URL or raw bytes into a PIL image."""
    if isinstance(payload, str):
        if "," in payload and payload.lstrip().startswith("data:"):
            payload = payload.split(",", 1)[1]
        try:
            raw = base64.b64decode(payload, validate=False)
        except (binascii.Error, ValueError) as exc:
            raise ValueError(UNDECODABLE) from exc
    else:
        raw = payload

    if not raw:
        raise ValueError(UNDECODABLE)
    if len(raw) > config.MAX_IMAGE_BYTES:
        raise ValueError(TOO_LARGE)

    # Check the actual bytes rather than trusting the data-URL mime type.
    if not any(raw.startswith(sig) for sig, _ in _MAGIC):
        # WebP: RIFF....WEBP
        if not (raw[:4] == b"RIFF" and raw[8:12] == b"WEBP"):
            raise ValueError(UNDECODABLE)

    try:
        image = Image.open(io.BytesIO(raw))
        image.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError(UNDECODABLE) from exc

    return image.convert("RGB")


def _is_healthy(label: str, crop: config.CropConfig) -> bool:
    lowered = label.strip().lower()
    return any(h in lowered for h in crop.healthy_labels)


def analyze(payload: str | bytes, declared_crop: str | None = None) -> Result:
    crop = config.crop_config(declared_crop)

    # 1. Decode -------------------------------------------------------------
    try:
        image = decode_image(payload)
    except ValueError as exc:
        reason = str(exc)
        return Result(
            status=REJECTED,
            crop=crop.key,
            reject_reason=reason,
            health_status="INVALID_IMAGE",
            message=(
                "That file is too large to process."
                if reason == TOO_LARGE
                else "That does not look like a photo. Please take a new picture."
            ),
        )

    # 2. Gate: is this a leaf at all? ---------------------------------------
    try:
        gate = backends.get_gate().score(image)
    except Exception as exc:  # model missing, OOM, corrupt weights
        log.exception("Gate failed")
        return Result(
            status=UNAVAILABLE,
            crop=crop.key,
            message="Crop analysis is temporarily unavailable. Please try again shortly.",
        )

    gate_detail = {
        "leafScore": round(gate.leaf_score, 4),
        "topPrompt": gate.top_prompt,
        "topPromptIsLeaf": gate.top_prompt_is_leaf,
        "threshold": config.GATE_MIN_LEAF_SCORE,
    }

    if gate.leaf_score < config.GATE_MIN_LEAF_SCORE or not gate.top_prompt_is_leaf:
        return Result(
            status=REJECTED,
            crop=crop.key,
            reject_reason=NOT_A_LEAF,
            health_status="INVALID_IMAGE",
            gate=gate_detail,
            message=(
                "We could not find a crop leaf in this photo. Hold the camera close "
                "so a single leaf fills the frame."
            ),
        )

    # 3. Route + classify ---------------------------------------------------
    try:
        classifier = backends.get_classifier(crop)
        logits = classifier.logits(image)
        labels = classifier.labels()

        energy = None
        if config.ENABLE_ENERGY:
            max_l = np.max(logits)
            energy_val = -(max_l + np.log(np.sum(np.exp(logits - max_l))))
            energy = float(energy_val)

        tta_agreement = None
        if config.ENABLE_TTA:
            from collections import Counter
            # Support both older and newer PIL versions
            flip_lr = Image.Transpose.FLIP_LEFT_RIGHT if hasattr(Image, "Transpose") else Image.FLIP_LEFT_RIGHT
            flip_tb = Image.Transpose.FLIP_TOP_BOTTOM if hasattr(Image, "Transpose") else Image.FLIP_TOP_BOTTOM
            variants = [
                image,
                image.transpose(flip_lr),
                image.transpose(flip_tb),
                image.rotate(15),
                image.rotate(-15)
            ]
            predictions = []
            for var in variants:
                v_logits = classifier.logits(var)
                predictions.append(int(np.argmax(v_logits)))
            
            most_common, count = Counter(predictions).most_common(1)[0]
            tta_agreement = count / len(variants)

    except Exception:
        log.exception("Classifier failed for crop=%s", crop.key)
        return Result(
            status=UNAVAILABLE,
            crop=crop.key,
            gate=gate_detail,
            message="Crop analysis is temporarily unavailable. Please try again shortly.",
        )

    # 4. Calibrate ----------------------------------------------------------
    probs = backends.softmax_with_temperature(logits, crop.temperature)

    order = np.argsort(probs)[::-1]
    top_k = [
        {"label": labels[i], "confidence": round(float(probs[i]), 4)}
        for i in order[:3]
    ]
    best_index = int(order[0])
    best_label = labels[best_index]
    best_conf = float(probs[best_index])

    # 5. Abstain rather than guess -----------------------------------------
    reject_reason = None
    if best_conf < crop.min_confidence:
        reject_reason = LOW_CONFIDENCE
    elif config.ENABLE_ENERGY and energy is not None and energy > config.ENERGY_THRESHOLD:
        reject_reason = "HIGH_ENERGY_OOD"
    elif config.ENABLE_TTA and tta_agreement is not None and tta_agreement < config.TTA_AGREEMENT_THRESHOLD:
        reject_reason = "TTA_DISAGREEMENT"

    if reject_reason:
        return Result(
            status=ABSTAINED,
            crop=crop.key,
            confidence=round(best_conf, 4),
            reject_reason=reject_reason,
            health_status="UNKNOWN",
            gate=gate_detail,
            model_version=classifier.model_id,
            threshold=crop.min_confidence,
            top_k=top_k,
            tta_agreement=tta_agreement,
            energy=energy,
            message=(
                "We are not confident enough to name a disease from this photo. "
                "Try again in better light, with one leaf filling the frame."
            ),
        )

    healthy = _is_healthy(best_label, crop)

    return Result(
        status=OK,
        crop=crop.key,
        label=best_label,
        confidence=round(best_conf, 4),
        health_status="HEALTHY" if healthy else "DISEASE_DETECTED",
        gate=gate_detail,
        model_version=classifier.model_id,
        threshold=crop.min_confidence,
        top_k=top_k,
        tta_agreement=tta_agreement,
        energy=energy,
    )
