#!/usr/bin/env python3
"""
Four-part evaluation of the pre-trained pipeline.

  1. GATE          - do non-crop photos get rejected before any classifier runs?
  2. ACCURACY      - how good is the model on real field photos it never saw?
  3. ABSTENTION    - on diseases the model has no label for, does it abstain
                     or confidently pick the nearest wrong class?
  4. THRESHOLD     - precision against abstention rate, so the cutoff is chosen
                     from evidence instead of guessed.

Usage
-----
    python -m ml.harness.evaluate \
        --data-dir  ~/data/paddy-doctor/train_images \
        --negatives ~/data/negatives \
        --crop rice --limit-per-class 150

`--data-dir` expects one subfolder per class (Paddy Doctor's native layout).
`--negatives` expects a flat folder of non-crop photos: roads, hands, soil,
buildings, sky.

Set ML_BACKEND=stub to smoke-test the harness itself without model weights.
"""

from __future__ import annotations

import argparse
import json
import os
import random
import sys
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from ml.app import backends, config, pipeline  # noqa: E402

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}

# Paddy Doctor folder name -> label emitted by prithivMLmods/Rice-Leaf-Disease.
# The five below are the overlap. Everything else in Paddy Doctor is a disease
# the model has no name for, which is exactly what part 3 tests.
PADDY_TO_MODEL = {
    "bacterial_leaf_blight": "Bacterial Blight",
    "blast": "Blast",
    "brown_spot": "Brown Spot",
    "normal": "Healthy",
    "tungro": "Tungro",
}


def find_images(folder: Path, limit: int | None = None) -> list[Path]:
    files = sorted(p for p in folder.rglob("*") if p.suffix.lower() in IMAGE_EXTS)
    if limit is not None and len(files) > limit:
        random.Random(0).shuffle(files)
        files = files[:limit]
    return files


def load_bytes(path: Path) -> bytes:
    return path.read_bytes()


def bar(value: float, width: int = 28) -> str:
    filled = int(round(max(0.0, min(1.0, value)) * width))
    return "#" * filled + "." * (width - filled)


def rule(title: str) -> None:
    print(f"\n{'=' * 74}\n{title}\n{'=' * 74}")


# --- Part 1: the gate -------------------------------------------------------

def evaluate_gate(negatives: list[Path], positives: list[Path], crop: str) -> dict:
    rule("1. GATE - non-crop photos must never reach a classifier")

    false_accepts, rejected = [], 0
    for path in negatives:
        result = pipeline.analyze(load_bytes(path), crop)
        if result.status == pipeline.REJECTED:
            rejected += 1
        else:
            false_accepts.append((path.name, result.status, result.label, result.confidence))

    over_rejected, passed = [], 0
    for path in positives:
        result = pipeline.analyze(load_bytes(path), crop)
        if result.status == pipeline.REJECTED and result.reject_reason == pipeline.NOT_A_LEAF:
            over_rejected.append(path.name)
        else:
            passed += 1

    n_neg, n_pos = max(len(negatives), 1), max(len(positives), 1)
    far = len(false_accepts) / n_neg
    orr = len(over_rejected) / n_pos

    print(f"\n  non-crop images tested : {len(negatives)}")
    print(f"  correctly rejected     : {rejected}  [{bar(rejected / n_neg)}] {rejected / n_neg:6.1%}")
    print(f"  FALSE ACCEPTS          : {len(false_accepts)}  <-- the number that matters, target 0")
    print(f"\n  real leaves tested     : {len(positives)}")
    print(f"  correctly passed       : {passed}  [{bar(passed / n_pos)}] {passed / n_pos:6.1%}")
    print(f"  wrongly rejected       : {len(over_rejected)}")

    if false_accepts:
        print("\n  Non-crop images that got through:")
        for name, status, label, conf in false_accepts[:10]:
            print(f"    {name:35s} -> {status} {label} ({conf})")

    return {
        "negatives": len(negatives), "rejected": rejected,
        "false_accepts": len(false_accepts), "false_accept_rate": far,
        "positives": len(positives), "passed": passed,
        "over_rejected": len(over_rejected), "over_reject_rate": orr,
    }


# --- Parts 2-4: classification ---------------------------------------------

def collect_predictions(data_dir: Path, crop: str, limit: int | None) -> tuple[list, list]:
    """Run every image once; return (known_rows, unknown_rows)."""
    cfg = config.crop_config(crop)
    classifier = backends.get_classifier(cfg)
    labels = classifier.labels()

    known, unknown = [], []
    class_dirs = sorted(d for d in data_dir.iterdir() if d.is_dir())
    if not class_dirs:
        raise SystemExit(f"No class subfolders under {data_dir}")

    for class_dir in class_dirs:
        folder = class_dir.name.lower()
        mapped = PADDY_TO_MODEL.get(folder)
        files = find_images(class_dir, limit)
        print(f"  {folder:32s} {len(files):5d} images  "
              f"{'-> ' + mapped if mapped else '(no matching model class)'}")

        for path in files:
            try:
                image = pipeline.decode_image(load_bytes(path))
            except ValueError:
                continue

            gate = backends.get_gate().score(image)
            gated_out = (gate.leaf_score < config.GATE_MIN_LEAF_SCORE
                         or not gate.top_prompt_is_leaf)

            probs = backends.softmax_with_temperature(
                classifier.logits(image), cfg.temperature
            )
            best = int(np.argmax(probs))
            row = {
                "file": path.name,
                "truth_folder": folder,
                "truth_label": mapped,
                "pred_label": labels[best],
                "confidence": float(probs[best]),
                "gated_out": gated_out,
            }
            (known if mapped else unknown).append(row)

    return known, unknown


def evaluate_accuracy(rows: list[dict], cfg) -> dict:
    rule("2. ACCURACY on real field photos the model never trained on")

    answered = [r for r in rows if not r["gated_out"] and r["confidence"] >= cfg.min_confidence]
    correct = sum(r["pred_label"] == r["truth_label"] for r in answered)
    overall = correct / max(len(answered), 1)

    print(f"\n  images with a matching class : {len(rows)}")
    print(f"  answered (passed gate + threshold {cfg.min_confidence}) : {len(answered)}")
    print(f"  accuracy on answered         : [{bar(overall)}] {overall:6.1%}\n")

    per_class = defaultdict(lambda: {"tp": 0, "fp": 0, "fn": 0, "n": 0})
    for r in answered:
        per_class[r["truth_label"]]["n"] += 1
        if r["pred_label"] == r["truth_label"]:
            per_class[r["truth_label"]]["tp"] += 1
        else:
            per_class[r["truth_label"]]["fn"] += 1
            per_class[r["pred_label"]]["fp"] += 1

    print(f"  {'class':22s} {'n':>6s} {'precision':>10s} {'recall':>8s} {'f1':>7s}")
    print(f"  {'-' * 56}")
    for label in sorted(per_class):
        s = per_class[label]
        prec = s["tp"] / max(s["tp"] + s["fp"], 1)
        rec = s["tp"] / max(s["tp"] + s["fn"], 1)
        f1 = 2 * prec * rec / max(prec + rec, 1e-9)
        print(f"  {label:22s} {s['n']:6d} {prec:10.3f} {rec:8.3f} {f1:7.3f}")

    confusion = Counter((r["truth_label"], r["pred_label"]) for r in answered)
    worst = [(t, p, c) for (t, p), c in confusion.items() if t != p]
    worst.sort(key=lambda x: -x[2])
    if worst:
        print("\n  Most common confusions:")
        for truth, pred, count in worst[:6]:
            print(f"    {truth:22s} mistaken for {pred:22s} {count:4d}x")

    return {"answered": len(answered), "accuracy": overall, "total": len(rows)}


def evaluate_abstention(rows: list[dict], cfg) -> dict:
    rule("3. ABSTENTION on diseases the model has no label for")
    print("\n  These are real rice diseases outside the model's 5 classes.")
    print("  Correct behaviour is to abstain. A confident answer here is a")
    print("  precise, well-calibrated, WRONG diagnosis handed to a farmer.\n")

    if not rows:
        print("  (no unmatched classes in this dataset)")
        return {"total": 0}

    gated = sum(r["gated_out"] for r in rows)
    remaining = [r for r in rows if not r["gated_out"]]
    abstained = sum(r["confidence"] < cfg.min_confidence for r in remaining)
    confident_wrong = len(remaining) - abstained
    total = len(rows)
    safe = gated + abstained

    print(f"  unknown-disease images  : {total}")
    print(f"  stopped by the gate     : {gated}")
    print(f"  abstained (low conf)    : {abstained}")
    print(f"  SAFE (gated + abstained): {safe}  [{bar(safe / total)}] {safe / total:6.1%}")
    print(f"  CONFIDENTLY WRONG       : {confident_wrong}  [{bar(confident_wrong / total)}] "
          f"{confident_wrong / total:6.1%}  <-- drive this down")

    if confident_wrong:
        by_folder = Counter(r["truth_folder"] for r in remaining
                            if r["confidence"] >= cfg.min_confidence)
        print("\n  Worst offenders (true disease -> answered anyway):")
        for folder, count in by_folder.most_common(6):
            print(f"    {folder:32s} {count:4d}x")

    return {"total": total, "safe_rate": safe / total,
            "confident_wrong_rate": confident_wrong / total}


def evaluate_threshold(known: list[dict], unknown: list[dict]) -> dict:
    rule("4. THRESHOLD - precision bought per unit of abstention")
    print("\n  Pick the lowest threshold that hits your target precision.")
    print("  'unknown answered' is how many out-of-scope diseases still get a")
    print("  confident label at that threshold.\n")
    print(f"  {'thresh':>7s} {'answered':>9s} {'precision':>10s} {'abstained':>10s} {'unknown answered':>17s}")
    print(f"  {'-' * 60}")

    live_known = [r for r in known if not r["gated_out"]]
    live_unknown = [r for r in unknown if not r["gated_out"]]
    rows = []

    for thresh in [round(0.30 + i * 0.05, 2) for i in range(15)]:
        answered = [r for r in live_known if r["confidence"] >= thresh]
        correct = sum(r["pred_label"] == r["truth_label"] for r in answered)
        precision = correct / max(len(answered), 1)
        abstain_rate = 1 - len(answered) / max(len(live_known), 1)
        unknown_answered = sum(r["confidence"] >= thresh for r in live_unknown)
        unknown_rate = unknown_answered / max(len(live_unknown), 1)

        marker = ""
        if precision >= 0.90 and not any(r["flagged"] for r in rows):
            marker = "  <-- first threshold at 90% precision"
        rows.append({"threshold": thresh, "answered": len(answered),
                     "precision": precision, "abstain_rate": abstain_rate,
                     "unknown_answered": unknown_answered,
                     "flagged": bool(marker)})

        print(f"  {thresh:7.2f} {len(answered):9d} {precision:10.3f} {abstain_rate:9.1%} "
              f"{unknown_answered:9d} ({unknown_rate:4.0%}){marker}")

    return {"curve": [{k: v for k, v in r.items() if k != "flagged"} for r in rows]}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data-dir", required=True, type=Path)
    parser.add_argument("--negatives", type=Path, default=None)
    parser.add_argument("--crop", default="rice")
    parser.add_argument("--limit-per-class", type=int, default=150)
    parser.add_argument("--gate-sample", type=int, default=60)
    parser.add_argument("--json-out", type=Path, default=None)
    args = parser.parse_args()

    if not args.data_dir.is_dir():
        raise SystemExit(f"--data-dir not found: {args.data_dir}")

    cfg = config.crop_config(args.crop)
    print(f"\nbackend      : {config.BACKEND}")
    print(f"gate model   : {config.GATE_MODEL}")
    print(f"crop model   : {cfg.model_id}")
    print(f"threshold    : {cfg.min_confidence}   temperature: {cfg.temperature}")
    print(f"gate min leaf: {config.GATE_MIN_LEAF_SCORE}")

    report: dict = {}

    if args.negatives and args.negatives.is_dir():
        negatives = find_images(args.negatives, args.gate_sample)
        leaf_source = next((d for d in sorted(args.data_dir.iterdir()) if d.is_dir()), None)
        positives = find_images(leaf_source, args.gate_sample) if leaf_source else []
        report["gate"] = evaluate_gate(negatives, positives, args.crop)
    else:
        print("\n  (no --negatives folder given; skipping part 1)")

    rule("Scanning dataset")
    known, unknown = collect_predictions(args.data_dir, args.crop, args.limit_per_class)

    report["accuracy"] = evaluate_accuracy(known, cfg)
    report["abstention"] = evaluate_abstention(unknown, cfg)
    report["threshold"] = evaluate_threshold(known, unknown)

    if args.json_out:
        args.json_out.write_text(json.dumps(report, indent=2))
        print(f"\n  full report written to {args.json_out}")

    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
