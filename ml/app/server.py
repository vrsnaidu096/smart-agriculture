"""
FastAPI sidecar.

The Node backend calls POST /predict with one base64 image and the crop the
farmer selected. Everything about model loading, gating and abstention lives on
this side; diseaseModel.js stays a plain HTTP call.
"""

from __future__ import annotations

import logging
import os

from fastapi import FastAPI
from pydantic import BaseModel, Field

from . import backends, config, pipeline

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
log = logging.getLogger(__name__)

app = FastAPI(title="Smart Agriculture - Disease Inference", version="1.0.0")


class PredictRequest(BaseModel):
    image: str = Field(..., description="Base64 image, with or without a data: URL prefix")
    crop: str | None = Field(None, description="Crop the farmer selected, e.g. 'rice'")


class PredictResponse(BaseModel):
    status: str
    crop: str | None = None
    label: str | None = None
    confidence: float | None = None
    healthStatus: str | None = None
    rejectReason: str | None = None
    message: str | None = None
    gate: dict | None = None
    modelVersion: str | None = None
    threshold: float | None = None
    topK: list[dict] = []
    source: str = "live"
    ttaAgreement: float | None = None
    energy: float | None = None


def _to_response(result: pipeline.Result) -> PredictResponse:
    return PredictResponse(
        status=result.status,
        crop=result.crop,
        label=result.label,
        confidence=result.confidence,
        healthStatus=result.health_status,
        rejectReason=result.reject_reason,
        message=result.message,
        gate=result.gate,
        modelVersion=result.model_version,
        threshold=result.threshold,
        topK=result.top_k,
        source=result.source,
        ttaAgreement=result.tta_agreement,
        energy=result.energy,
    )


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "backend": config.BACKEND,
        "gateModel": config.GATE_MODEL,
        "crops": {
            key: {
                "model": cfg.model_id,
                "minConfidence": cfg.min_confidence,
                "temperature": cfg.temperature,
            }
            for key, cfg in config.CROPS.items()
        },
    }


@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest) -> PredictResponse:
    result = pipeline.analyze(request.image, request.crop)
    log.info(
        "predict crop=%s status=%s label=%s conf=%s",
        result.crop, result.status, result.label, result.confidence,
    )
    return _to_response(result)


@app.post("/warmup")
def warmup() -> dict:
    """Load models eagerly so the first farmer request is not the slow one."""
    loaded = []
    try:
        backends.get_gate()
        loaded.append(config.GATE_MODEL)
        for cfg in config.CROPS.values():
            backends.get_classifier(cfg)
            loaded.append(cfg.model_id)
    except Exception as exc:
        log.exception("Warmup failed")
        return {"status": "error", "loaded": loaded, "error": str(exc)}
    return {"status": "ok", "loaded": loaded}
