import torchvision.transforms as T
from transformers import AutoImageProcessor

def get_transforms(model_name="prithivMLmods/Rice-Leaf-Disease"):
    try:
        processor = AutoImageProcessor.from_pretrained(model_name)
        image_mean = processor.image_mean if hasattr(processor, "image_mean") else [0.5, 0.5, 0.5]
        image_std = processor.image_std if hasattr(processor, "image_std") else [0.5, 0.5, 0.5]
        size = processor.size["height"] if hasattr(processor, "size") and "height" in processor.size else 224
    except Exception:
        image_mean = [0.5, 0.5, 0.5]
        image_std = [0.5, 0.5, 0.5]
        size = 224
        
    train_transforms = T.Compose([
        # Random crop helps handle varying distances and partial occlusions in the field.
        T.RandomResizedCrop(size, scale=(0.7, 1.0)),
        
        # Rotation handles varying orientations from handheld smartphones.
        T.RandomRotation(degrees=30),
        
        # Color jitter helps robustify against different lighting (cloudy/sunny) and smartphone ISP colors.
        T.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1),
        
        # Gaussian blur mimics out-of-focus scenarios common in field macro shots.
        T.RandomApply([T.GaussianBlur(kernel_size=3)], p=0.3),
        
        T.ToTensor(),
        T.Normalize(mean=image_mean, std=image_std)
    ])
    
    val_transforms = T.Compose([
        T.Resize(size, interpolation=T.InterpolationMode.BICUBIC),
        T.CenterCrop(size),
        T.ToTensor(),
        T.Normalize(mean=image_mean, std=image_std)
    ])
    
    return train_transforms, val_transforms
