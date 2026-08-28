import os
import json
import argparse
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from PIL import Image
from transformers import AutoModelForImageClassification
from augment import get_transforms

class RiceDataset(Dataset):
    def __init__(self, json_path, transforms):
        with open(json_path, 'r') as f:
            self.data = json.load(f)
        self.transforms = transforms
        
        class_map_path = os.path.join(os.path.dirname(json_path), "class_map.json")
        with open(class_map_path, 'r') as f:
            self.class_map = json.load(f)
            
    def __len__(self):
        return len(self.data)
        
    def __getitem__(self, idx):
        item = self.data[idx]
        img_path = item["image_path"]
        label = self.class_map[item["label"]]
        
        try:
            image = Image.open(img_path).convert("RGB")
        except Exception:
            image = Image.new("RGB", (224, 224), color=(0,0,0))
            
        return self.transforms(image), label
        
    def get_class_weights(self):
        counts = [0] * len(self.class_map)
        for item in self.data:
            counts[self.class_map[item["label"]]] += 1
        total = sum(counts)
        weights = [total / (len(counts) * c) if c > 0 else 1.0 for c in counts]
        return torch.FloatTensor(weights)

def train(args):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on {device}")
    
    train_transforms, val_transforms = get_transforms(args.model_name)
    
    train_dataset = RiceDataset(os.path.join(args.data_dir, "train.json"), train_transforms)
    val_dataset = RiceDataset(os.path.join(args.data_dir, "val.json"), val_transforms)
    
    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=0)
    
    model = AutoModelForImageClassification.from_pretrained(
        args.model_name, 
        ignore_mismatched_sizes=True,
        num_labels=len(train_dataset.class_map)
    )
    
    for param in model.parameters():
        param.requires_grad = False
        
    for param in model.classifier.parameters():
        param.requires_grad = True
        
    if args.unfreeze_blocks > 0:
        encoder = None
        if hasattr(model, "siglip"):
            encoder = model.siglip.encoder.layers
        elif hasattr(model, "vision_model"):
            encoder = model.vision_model.encoder.layers
        elif hasattr(model, "vit"):
            encoder = model.vit.encoder.layer
            
        if encoder is not None:
            for layer in encoder[-args.unfreeze_blocks:]:
                for param in layer.parameters():
                    param.requires_grad = True

    model = model.to(device)
    
    class_weights = train_dataset.get_class_weights().to(device)
    criterion = nn.CrossEntropyLoss(weight=class_weights)
    optimizer = optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=args.lr)
    
    os.makedirs(args.checkpoint_dir, exist_ok=True)
    
    for epoch in range(args.epochs):
        model.train()
        train_loss = 0
        for batch_idx, (inputs, targets) in enumerate(train_loader):
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()
            outputs = model(inputs).logits
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()
            
            if args.smoke_test and batch_idx >= 1:
                break
                
        model.eval()
        val_loss = 0
        correct = 0
        total = 0
        with torch.no_grad():
            for batch_idx, (inputs, targets) in enumerate(val_loader):
                inputs, targets = inputs.to(device), targets.to(device)
                outputs = model(inputs).logits
                loss = criterion(outputs, targets)
                val_loss += loss.item()
                _, predicted = outputs.max(1)
                total += targets.size(0)
                correct += predicted.eq(targets).sum().item()
                
                if args.smoke_test and batch_idx >= 1:
                    break
                    
        val_acc = 100. * correct / total if total > 0 else 0
        print(f"Epoch {epoch+1}/{args.epochs} - Train Loss: {train_loss/len(train_loader):.4f} "
              f"Val Loss: {val_loss/len(val_loader):.4f} Val Acc: {val_acc:.2f}%")
              
        torch.save(model.state_dict(), os.path.join(args.checkpoint_dir, f"epoch_{epoch+1}.pt"))
        if args.smoke_test:
            break

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", default="data_splits")
    parser.add_argument("--checkpoint-dir", default="checkpoints")
    parser.add_argument("--model-name", default="prithivMLmods/Rice-Leaf-Disease")
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--unfreeze-blocks", type=int, default=1)
    parser.add_argument("--smoke-test", action="store_true")
    args = parser.parse_args()
    
    if args.smoke_test:
        import subprocess
        print("Running full smoke test pipeline...")
        subprocess.run(["python", "ml/training/prepare_data.py", 
                       "--data-dir", "dummy_paddy", 
                       "--negatives-dir", "dummy_neg", 
                       "--output-dir", "data_splits",
                       "--smoke-test"], check=True)
        args.data_dir = "data_splits"
        args.epochs = 1
        args.batch_size = 2
        
    train(args)
    
    if args.smoke_test:
        print("Running calibration smoke test...")
        subprocess.run(["python", "ml/training/calibrate.py", 
                       "--model-path", os.path.join(args.checkpoint_dir, "epoch_1.pt"),
                       "--data-dir", "data_splits",
                       "--smoke-test"], check=True)
                       
        print("Running export smoke test...")
        subprocess.run(["python", "ml/training/export.py", 
                       "--model-path", os.path.join(args.checkpoint_dir, "epoch_1.pt"),
                       "--output-dir", "exported_model",
                       "--smoke-test"], check=True)
        print("Smoke test complete!")
