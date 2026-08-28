import os
import json
import argparse
import numpy as np
import torch
from torch.utils.data import DataLoader
from transformers import AutoModelForImageClassification
from scipy.optimize import minimize
from augment import get_transforms
from train import RiceDataset

def calibrate(args):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    with open(os.path.join(args.data_dir, "class_map.json"), 'r') as f:
        class_map = json.load(f)
        
    model = AutoModelForImageClassification.from_pretrained(
        args.model_name,
        ignore_mismatched_sizes=True,
        num_labels=len(class_map)
    )
    
    if args.model_path and os.path.exists(args.model_path):
        model.load_state_dict(torch.load(args.model_path, map_location=device))
    model.to(device)
    model.eval()
    
    _, val_transforms = get_transforms(args.model_name)
    val_dataset = RiceDataset(os.path.join(args.data_dir, "val.json"), val_transforms)
    val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)
    
    logits_list = []
    labels_list = []
    
    with torch.no_grad():
        for batch_idx, (inputs, targets) in enumerate(val_loader):
            inputs = inputs.to(device)
            outputs = model(inputs).logits
            logits_list.append(outputs.cpu())
            labels_list.append(targets)
            if args.smoke_test and batch_idx >= 1:
                break
                
    logits = torch.cat(logits_list).numpy()
    labels = torch.cat(labels_list).numpy()
    
    def nll_func(temp):
        t = temp[0]
        scaled_logits = logits / t
        max_logits = scaled_logits.max(axis=1, keepdims=True)
        log_probs = scaled_logits - max_logits - np.log(np.exp(scaled_logits - max_logits).sum(axis=1, keepdims=True))
        return -np.mean(log_probs[np.arange(len(labels)), labels])

    res = minimize(nll_func, [1.5], bounds=[(0.1, 10.0)], method='L-BFGS-B')
    best_temp = res.x[0]
    
    print(f"Fitted Temperature: {best_temp:.4f}")
    with open("temperature.json", "w") as f:
        json.dump({"RICE_TEMPERATURE": float(best_temp)}, f, indent=2)
        
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-path", required=True)
    parser.add_argument("--data-dir", default="data_splits")
    parser.add_argument("--model-name", default="prithivMLmods/Rice-Leaf-Disease")
    parser.add_argument("--smoke-test", action="store_true")
    args = parser.parse_args()
    calibrate(args)
