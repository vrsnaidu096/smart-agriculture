"""
Pipeline tests against the deterministic stub backend.

These prove the control flow - gate rejection, routing, calibration,
abstention, and that no path ever fabricates a diagnosis - without needing
model weights. Run with:  ML_BACKEND=stub python3 -m pytest ml/tests -q
"""

import base64
import io
import os
import sys

os.environ.setdefault("ML_BACKEND", "stub")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from PIL import Image

from ml.app import backends, config, pipeline


def make_image(colour, size=(224, 224), fmt="JPEG") -> str:
    img = Image.new("RGB", size, colour)
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


BRIGHT_LEAF = (40, 200, 40)     # green, bright  -> passes gate, high confidence
DARK_LEAF = (5, 40, 5)          # green, dark    -> passes gate, low confidence
ROAD = (120, 120, 125)          # grey           -> fails gate
SOIL = (150, 90, 40)            # brown          -> fails gate
SKY = (110, 150, 235)           # blue           -> fails gate
OOD_LEAF = (50, 200, 150)       # green, but high blue -> passes gate, classifier flags as OOD

results = []


def check(name, condition, detail=""):
    results.append((name, bool(condition), detail))


def run():
    backends.reset()

    # --- Gate: non-crop images must be rejected before any classifier runs ---
    for label, colour in [("road", ROAD), ("soil", SOIL), ("sky", SKY)]:
        r = pipeline.analyze(make_image(colour), "rice")
        check(
            f"gate rejects {label}",
            r.status == pipeline.REJECTED and r.reject_reason == pipeline.NOT_A_LEAF,
            f"got status={r.status} reason={r.reject_reason} leafScore={r.gate['leafScore'] if r.gate else None}",
        )
        check(f"{label} carries no disease label", r.label is None, f"label={r.label}")
        check(f"{label} has farmer-readable message", bool(r.message), "")

    # --- Gate: a leaf passes ------------------------------------------------
    r = pipeline.analyze(make_image(BRIGHT_LEAF), "rice")
    check("gate passes a leaf", r.status == pipeline.OK, f"status={r.status} msg={r.message}")
    check("leaf gets a label", bool(r.label), f"label={r.label}")
    check("leaf confidence above threshold",
          r.confidence is not None and r.confidence >= config.CROPS['rice'].min_confidence,
          f"conf={r.confidence} thr={config.CROPS['rice'].min_confidence}")
    check("top_k populated", len(r.top_k) == 3, f"top_k={r.top_k}")
    check("health status set", r.health_status in ("DISEASE_DETECTED", "HEALTHY"), f"hs={r.health_status}")

    # --- Abstention: low-confidence leaf must not be diagnosed --------------
    r = pipeline.analyze(make_image(DARK_LEAF), "rice")
    check("dark leaf abstains", r.status == pipeline.ABSTAINED, f"status={r.status} conf={r.confidence}")
    check("abstention names the reason", r.reject_reason == pipeline.LOW_CONFIDENCE, f"reason={r.reject_reason}")
    check("abstention gives no label", r.label is None, f"label={r.label}")
    check("abstention reports threshold", r.threshold is not None, f"thr={r.threshold}")

    # --- Routing: crop selection picks the right label space ----------------
    rice = pipeline.analyze(make_image(BRIGHT_LEAF), "rice")
    cane = pipeline.analyze(make_image(BRIGHT_LEAF), "sugarcane")
    check("rice routes to rice model", "Rice" in rice.model_version or "rice" in rice.model_version.lower(),
          f"model={rice.model_version}")
    check("sugarcane routes to sugarcane model", "sugarcane" in cane.model_version.lower(),
          f"model={cane.model_version}")
    check("sugarcane threshold is stricter than rice",
          config.CROPS['sugarcane'].min_confidence > config.CROPS['rice'].min_confidence,
          f"cane={config.CROPS['sugarcane'].min_confidence} rice={config.CROPS['rice'].min_confidence}")

    # --- Unknown crop falls back rather than crashing -----------------------
    r = pipeline.analyze(make_image(BRIGHT_LEAF), "dragonfruit")
    check("unknown crop falls back to default", r.crop == config.DEFAULT_CROP, f"crop={r.crop}")

    # --- Malformed input ----------------------------------------------------
    r = pipeline.analyze("not-base64-at-all!!!", "rice")
    check("garbage input rejected", r.status == pipeline.REJECTED, f"status={r.status}")
    check("garbage gets no label", r.label is None, f"label={r.label}")

    r = pipeline.analyze(base64.b64encode(b"plain text, not an image").decode(), "rice")
    check("non-image bytes rejected by magic-byte check",
          r.status == pipeline.REJECTED and r.reject_reason == pipeline.UNDECODABLE,
          f"status={r.status} reason={r.reject_reason}")

    r = pipeline.analyze("", "rice")
    check("empty payload rejected", r.status == pipeline.REJECTED, f"status={r.status}")

    # --- Oversize -----------------------------------------------------------
    original = config.MAX_IMAGE_BYTES
    config.MAX_IMAGE_BYTES = 100
    r = pipeline.analyze(make_image(BRIGHT_LEAF), "rice")
    check("oversize image rejected", r.reject_reason == pipeline.TOO_LARGE, f"reason={r.reject_reason}")
    config.MAX_IMAGE_BYTES = original

    # --- Temperature calibration actually changes confidence ---------------
    import numpy as np
    logits = np.array([4.0, 1.0, 0.5])
    sharp = backends.softmax_with_temperature(logits, 1.0)
    soft = backends.softmax_with_temperature(logits, 3.0)
    check("temperature softens overconfidence", soft.max() < sharp.max(),
          f"T=1 -> {sharp.max():.3f}, T=3 -> {soft.max():.3f}")
    check("probabilities still sum to 1", abs(soft.sum() - 1.0) < 1e-9, f"sum={soft.sum()}")

    # --- Energy and TTA (OOD detection) -------------------------------------
    r_in = pipeline.analyze(make_image(BRIGHT_LEAF), "rice")
    r_ood = pipeline.analyze(make_image(OOD_LEAF), "rice")
    
    check("energy score is higher for a stub-flagged OOD input than an in-distribution one",
          r_ood.energy is not None and r_in.energy is not None and r_ood.energy > r_in.energy,
          f"ood_energy={r_ood.energy} in_energy={r_in.energy}")
    
    check("energy triggers abstention for OOD",
          r_ood.status == pipeline.ABSTAINED and r_ood.reject_reason == "HIGH_ENERGY_OOD",
          f"status={r_ood.status} reason={r_ood.reject_reason}")
    
    # Disable energy, enable TTA
    config.ENABLE_ENERGY = False
    config.ENABLE_TTA = True
    
    r_ood_tta = pipeline.analyze(make_image(OOD_LEAF), "rice")
    check("TTA disagreement triggers abstention",
          r_ood_tta.status == pipeline.ABSTAINED and r_ood_tta.reject_reason == "TTA_DISAGREEMENT",
          f"status={r_ood_tta.status} reason={r_ood_tta.reject_reason} tta={r_ood_tta.tta_agreement}")
    
    r_in_tta = pipeline.analyze(make_image(BRIGHT_LEAF), "rice")
    check("TTA agrees for in-distribution input",
          r_in_tta.tta_agreement is not None and r_in_tta.tta_agreement >= config.TTA_AGREEMENT_THRESHOLD,
          f"tta={r_in_tta.tta_agreement}")
    check("TTA does not trigger abstention for in-distribution",
          r_in_tta.status == pipeline.OK,
          f"status={r_in_tta.status}")

    # Both can be disabled
    config.ENABLE_TTA = False
    config.ENABLE_ENERGY = False
    r_ood_none = pipeline.analyze(make_image(OOD_LEAF), "rice")
    check("both signals can be independently disabled",
          r_ood_none.reject_reason not in ("HIGH_ENERGY_OOD", "TTA_DISAGREEMENT"),
          f"reason={r_ood_none.reject_reason}")
          
    config.ENABLE_ENERGY = True

    # --- The invariant that matters: no path invents a diagnosis -----------
    non_ok = [
        pipeline.analyze(make_image(ROAD), "rice"),
        pipeline.analyze(make_image(DARK_LEAF), "rice"),
        pipeline.analyze(make_image(OOD_LEAF), "rice"),
        pipeline.analyze("garbage", "rice"),
    ]
    check("no fabricated label on any non-OK path",
          all(r.label is None for r in non_ok),
          f"labels={[r.label for r in non_ok]}")
    check("no result is ever sourced from a mock",
          all(r.source == "live" for r in non_ok),
          f"sources={[r.source for r in non_ok]}")

    # --- Report -------------------------------------------------------------
    width = max(len(n) for n, _, _ in results)
    passed = 0
    print()
    for name, ok, detail in results:
        mark = "PASS" if ok else "FAIL"
        print(f"  [{mark}] {name.ljust(width)}  {detail if not ok else ''}")
        passed += ok
    print(f"\n  {passed}/{len(results)} checks passed\n")
    return passed == len(results)


if __name__ == "__main__":
    sys.exit(0 if run() else 1)
