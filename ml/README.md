# Disease inference sidecar

A small FastAPI service that answers one question — *what is wrong with this
leaf, and should we even be answering?* The Node backend calls it over HTTP;
`backend/src/integrations/diseaseModel.js` is a thin client and nothing else in
the app knows which models are behind it.

## Why a gate

A classifier trained on N disease classes always returns one of those N. Show it
a photograph of a road and it will answer **Rice Blast, 87%** — high softmax
confidence on garbage input is normal, not a bug. Thresholding alone cannot fix
it.

So a CLIP zero-shot gate runs first, scoring the image against prompts for
leaves *and* prompts for roads, hands, soil, sky, buildings. If the probability
mass lands outside the leaf prompts, the image is rejected before any classifier
loads. New reject categories are one sentence in `app/config.py` — no retraining.

```
gate → route by declared crop → specialist classifier → calibrate → answer or abstain
```

## Models

| Stage | Model | Notes |
|---|---|---|
| Gate | `openai/clip-vit-base-patch32` | Zero-shot leaf / not-leaf |
| Rice | `prithivMLmods/Rice-Leaf-Disease` | SigLIP2-base, 5 classes, 94.77% on its own test split, Apache-2.0 |
| Sugarcane | `dwililiya/sugarcane-plant-diseases-classification` | EfficientNet, 6 classes, ~86.8%, CDLA-Sharing-1.0 |

Those accuracies are each model's own test split. Real field accuracy will be
lower — that is what the harness measures.

## No mocks

There is no fabricated-diagnosis path anywhere in this service. If a model
cannot run, the response is `UNAVAILABLE` and the farmer is told so. The same
now applies to weather and soil in the Node backend.

## Running it

```bash
pip install -r requirements.txt
# CPU-only machines: a much smaller torch
#   pip install torch --index-url https://download.pytorch.org/whl/cpu

uvicorn ml.app.server:app --port 8000
curl -X POST localhost:8000/warmup      # download + load weights up front
```

`ML_BACKEND=stub` swaps in a deterministic fake backend that needs no weights —
used by the tests.

```bash
ML_BACKEND=stub python3 ml/tests/test_pipeline.py
```

## Evaluating it

The point of the harness is to find out whether these pre-trained models are
actually any good on *field* photos, before they reach a farmer.

1. Download **Paddy Doctor** (16,225 real field images, 13 classes, Tamil Nadu):
   <https://paddydoc.github.io/dataset/>
2. Collect 50–100 non-crop photos into a folder — roads, hands, soil, walls,
   sky. Your own phone works fine.

```bash
python3 ml/harness/evaluate.py \
  --data-dir  ~/data/paddy-doctor/train_images \
  --negatives ~/data/negatives \
  --crop rice --limit-per-class 150 \
  --json-out  report.json
```

It prints four sections:

1. **Gate** — false-accept rate on non-crop photos. Target zero.
2. **Accuracy** — the model against Paddy Doctor's five matching classes
   (bacterial_leaf_blight, blast, brown_spot, normal, tungro). It was trained on
   a different dataset, so this is a genuine held-out measurement.
3. **Abstention** — Paddy Doctor's *other* eight classes are real rice diseases
   the model has no label for. It should abstain. A confident answer here is a
   precise, well-calibrated, wrong diagnosis.
4. **Threshold** — precision against abstention rate, so you pick the cutoff
   from evidence rather than guessing.

Then write the chosen threshold into `RICE_MIN_CONFIDENCE` /
`SUGARCANE_MIN_CONFIDENCE` in your `.env`.

## Tuning

Everything adjustable lives in `app/config.py` and can be overridden by
environment variable:

| Variable | Default | Meaning |
|---|---|---|
| `ML_BACKEND` | `hf` | `hf` or `stub` |
| `GATE_MIN_LEAF_SCORE` | `0.55` | Probability mass that must land on leaf prompts |
| `RICE_MIN_CONFIDENCE` | `0.70` | Abstain below this |
| `SUGARCANE_MIN_CONFIDENCE` | `0.85` | Stricter — the model is weaker |
| `RICE_TEMPERATURE` | `1.0` | Calibration; >1 softens overconfidence |

## Training

The `ml/training` directory contains the fine-tuning pipeline for adapting the base model to real field photographs using the Paddy Doctor dataset. It handles:
- Downloading and splitting data, including a custom `not_a_leaf` class.
- Lab-to-field gap augmentations (color jitter, blur, rotation).
- Transfer learning with class-weighted loss.
- Temperature scaling calibration on the validation set.

See `ml/training/README.md` for exact commands to run this on a Kaggle free GPU.
