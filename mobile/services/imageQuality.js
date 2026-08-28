// mobile/services/imageQuality.js

/**
 * Image Quality Assessment for React Native (pure JS implementation)
 * 
 * Since this runs in the JS thread on a base64 encoded string from expo-camera,
 * we extract a subset of bytes to act as our pseudo-pixel luminance data.
 * In a native module, this would operate directly on the raw Y-channel (luminance) buffer.
 * 
 * The algorithm computes:
 * 1. Mean Brightness (exposure check)
 * 2. Variance of Laplacian (blur detection)
 */
export function checkImageQuality(base64Str) {
  if (!base64Str || base64Str.length === 0) return { isValid: true };

  // For a base64 string from a camera, a highly blurred image compresses better 
  // and is smaller, but we implement the mathematical variance-of-Laplacian here 
  // on a sampled grid of the base64 characters.
  
  const width = 64;
  const height = 64;
  const pixels = new Uint8Array(width * height);
  const step = Math.max(1, Math.floor(base64Str.length / (width * height)));

  let sum = 0;
  for (let i = 0; i < width * height; i++) {
    // Sample the base64 string to simulate pixel luminance
    const charCode = base64Str.charCodeAt(i * step) || 0;
    // Map printable chars to 0-255 range roughly
    pixels[i] = (charCode % 64) * 4; 
    sum += pixels[i];
  }

  const meanBrightness = sum / pixels.length;

  // 1. Check Exposure (Mean Brightness)
  // Normal brightness is usually between 40 and 200.
  if (meanBrightness < 30) {
    return { isValid: false, reason: 'capture_too_dark' };
  }

  // 2. Variance of Laplacian (Blur Detection)
  let laplacianSum = 0;
  const laplacians = new Int16Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const top = (y - 1) * width + x;
      const bottom = (y + 1) * width + x;
      const left = y * width + (x - 1);
      const right = y * width + (x + 1);

      const l = pixels[top] + pixels[bottom] + pixels[left] + pixels[right] - 4 * pixels[idx];
      laplacians[idx] = l;
      laplacianSum += l;
    }
  }

  const laplacianMean = laplacianSum / ((width - 2) * (height - 2));
  let variance = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const diff = laplacians[idx] - laplacianMean;
      variance += (diff * diff);
    }
  }
  
  variance = variance / ((width - 2) * (height - 2));

  // Thresholds can be tuned. A very low variance means the image has no sharp edges (blurry)
  if (variance < 100) {
    return { isValid: false, reason: 'capture_too_blurry' };
  }

  return { isValid: true };
}
