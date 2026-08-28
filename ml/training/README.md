# Fine-Tuning the Rice Model

This pipeline fine-tunes the `prithivMLmods/Rice-Leaf-Disease` model on the Paddy Doctor dataset, adding a `not_a_leaf` rejection class for robustness in the field.

## Kaggle Notebooks Setup (Free GPU)

To run this pipeline end-to-end on a Kaggle Notebook (which provides ~30h/week of free GPU):

1. **Create a new Kaggle Notebook** and set the Accelerator to **GPU T4 x2** or **P100**.
2. **Add Data**: Search for and add the "Paddy Doctor" dataset to your notebook.
3. **Upload Negatives**: Create a new dataset on Kaggle with your `negatives` folder (roads, soil, hands, etc.) and add it to the notebook.
4. **Install Requirements**:
   ```bash
   !pip install -r ml/requirements.txt
   !pip install scipy torchvision transformers
   ```

## Running the Pipeline

**1. Prepare Data**
```bash
!python ml/training/prepare_data.py \
  --data-dir /kaggle/input/paddydoctor/train_images \
  --negatives-dir /kaggle/input/your-negatives-dataset \
  --output-dir /kaggle/working/data_splits
```

**2. Train**
```bash
!python ml/training/train.py \
  --data-dir /kaggle/working/data_splits \
  --checkpoint-dir /kaggle/working/checkpoints \
  --epochs 10 \
  --batch-size 32 \
  --unfreeze-blocks 1
```

**3. Calibrate**
```bash
!python ml/training/calibrate.py \
  --model-path /kaggle/working/checkpoints/epoch_10.pt \
  --data-dir /kaggle/working/data_splits
```
*Take the resulting `RICE_TEMPERATURE` value and update it in your `.env` file.*

**4. Export**
```bash
!python ml/training/export.py \
  --model-path /kaggle/working/checkpoints/epoch_10.pt \
  --output-dir /kaggle/working/exported_model
```

You can then download `/kaggle/working/exported_model` and place it where the backend can load it.

## Smoke Test

To verify the pipeline code works locally on a tiny subset without full datasets:
```bash
python ml/training/train.py --smoke-test
```
