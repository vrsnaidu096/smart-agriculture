import os
import json
import argparse
import torch
from transformers import AutoModelForImageClassification

def export(args):
    with open(os.path.join(args.data_dir, "class_map.json"), 'r') as f:
        class_map = json.load(f)
        
    model = AutoModelForImageClassification.from_pretrained(
        args.model_name,
        ignore_mismatched_sizes=True,
        num_labels=len(class_map)
    )
    
    if args.model_path and os.path.exists(args.model_path):
        model.load_state_dict(torch.load(args.model_path, map_location="cpu"))
        
    id2label = {str(v): k for k, v in class_map.items()}
    label2id = {k: v for k, v in class_map.items()}
    model.config.id2label = id2label
    model.config.label2id = label2id
    
    os.makedirs(args.output_dir, exist_ok=True)
    model.save_pretrained(args.output_dir)
    print(f"Model exported to {args.output_dir}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-path", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--data-dir", default="data_splits")
    parser.add_argument("--model-name", default="prithivMLmods/Rice-Leaf-Disease")
    parser.add_argument("--smoke-test", action="store_true")
    args = parser.parse_args()
    export(args)
