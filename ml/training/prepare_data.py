import os
import json
import argparse
from pathlib import Path
from PIL import Image
import numpy as np
from sklearn.model_selection import train_test_split

def calculate_ahash(image_path, hash_size=8):
    try:
        with Image.open(image_path) as img:
            img = img.convert("L").resize((hash_size, hash_size), Image.Resampling.LANCZOS)
            pixels = np.array(img.getdata(), dtype=float).reshape((hash_size, hash_size))
            avg = pixels.mean()
            diff = pixels > avg
            return "".join(["1" if b else "0" for b in diff.flatten()])
    except Exception as e:
        return None

def download_smoke_test_data(data_dir, negatives_dir):
    print("Downloading smoke test data...")
    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(negatives_dir, exist_ok=True)
    
    classes = ["bacterial_leaf_blight", "blast", "brown_spot", "normal", "tungro"]
    for c in classes:
        os.makedirs(os.path.join(data_dir, c), exist_ok=True)
        for i in range(10):
            img = Image.new('RGB', (224, 224), color=(i*20, 100, 100))
            img.save(os.path.join(data_dir, c, f"dummy_{i}.jpg"))
            
    for i in range(10):
        img = Image.new('RGB', (224, 224), color=(100, 100, i*20))
        img.save(os.path.join(negatives_dir, f"dummy_neg_{i}.jpg"))
        
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", required=True)
    parser.add_argument("--negatives-dir", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--original-data-dir", default=None, help="Check overlap against original data")
    parser.add_argument("--smoke-test", action="store_true")
    args = parser.parse_args()

    if args.smoke_test:
        download_smoke_test_data(args.data_dir, args.negatives_dir)

    original_hashes = set()
    if args.original_data_dir and os.path.exists(args.original_data_dir):
        print("Hashing original dataset to check overlap...")
        for ext in ["*.jpg", "*.jpeg", "*.png"]:
            for path in Path(args.original_data_dir).rglob(ext):
                h = calculate_ahash(path)
                if h: original_hashes.add(h)

    print("Collecting Paddy Doctor and Negative images...")
    valid_classes = ["bacterial_leaf_blight", "blast", "brown_spot", "normal", "tungro"]
    dataset = []
    
    for c in valid_classes:
        class_dir = os.path.join(args.data_dir, c)
        if os.path.exists(class_dir):
            for ext in ["*.jpg", "*.jpeg", "*.png"]:
                for f in Path(class_dir).glob(ext):
                    dataset.append((str(f), c))
                    
    for ext in ["*.jpg", "*.jpeg", "*.png"]:
        for f in Path(args.negatives_dir).glob(ext):
            dataset.append((str(f), "not_a_leaf"))
            
    print(f"Total images before hash check: {len(dataset)}")
    filtered_dataset = []
    for path, label in dataset:
        h = calculate_ahash(path)
        if h and h not in original_hashes:
            filtered_dataset.append((path, label))
            
    print(f"Total images after hash check: {len(filtered_dataset)}")
    
    if len(filtered_dataset) == 0:
        print("No images found! Exiting.")
        return

    paths, labels = zip(*filtered_dataset)
    
    X_train, X_temp, y_train, y_temp = train_test_split(paths, labels, test_size=0.3, stratify=labels, random_state=42)
    X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.5, stratify=y_temp, random_state=42)
    
    os.makedirs(args.output_dir, exist_ok=True)
    
    def save_split(name, X, y):
        out_path = os.path.join(args.output_dir, f"{name}.json")
        data = [{"image_path": p, "label": l} for p, l in zip(X, y)]
        with open(out_path, "w") as f:
            json.dump(data, f, indent=2)
        print(f"{name} split saved: {len(data)} items")
        
    save_split("train", X_train, y_train)
    save_split("val", X_val, y_val)
    save_split("test", X_test, y_test)
    
    class_map = {c: i for i, c in enumerate(valid_classes + ["not_a_leaf"])}
    with open(os.path.join(args.output_dir, "class_map.json"), "w") as f:
        json.dump(class_map, f, indent=2)

if __name__ == "__main__":
    main()
