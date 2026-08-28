# API Contract

## POST `/api/analyze`

Analyzes crop images and farm context to return disease predictions and recommendations.

### Request Example
```json
{
  "images": [
    {
      "base64": "/9j/4AAQSkZJRgABAQE...",
      "mime": "image/jpeg"
    }
  ],
  "latitude": 17.3850,
  "longitude": 78.4867,
  "accuracy": 5.0,
  "farmId": "farm_123",
  "cropName": "rice",
  "language": "en"
}
```

### Response Example (Success)
```json
{
  "success": true,
  "data": {
    "scanId": "scan_456",
    "disease": {
      "status": "COMPLETED",
      "disease": "Leaf Blast",
      "confidence": 0.92
    },
    "soil": { "moisture": 45 },
    "weather": { "temperature": 28, "humidity": 65, "rainExpected": false },
    "risk": { "riskLevel": "MEDIUM", "score": 55, "alert": "Monitor closely" },
    "status": "COMPLETED",
    "recommendation": "Monitor closely and prepare preventative measures.",
    "symptoms": ["Brown spots"],
    "precautions": ["Avoid excess nitrogen"]
  }
}
```

### Edge States (Important!)

The orchestrator catches specific failure states from the ML services to ensure the app handles them gracefully.

**1. REJECTED**
Returned when the model cannot find a crop leaf in the photo (e.g. out of distribution).
```json
{
  "success": true,
  "data": {
    "scanId": "scan_457",
    "error": true,
    "status": "REJECTED",
    "reason": "NO_CROP_FOUND",
    "message": "We could not find a crop leaf in this photo. Hold the camera close so a single leaf fills the frame."
  }
}
```

**2. UNAVAILABLE / ABSTAINED**
Returned when the model is offline or lacks confidence to make a safe prediction.
```json
{
  "success": true,
  "data": {
    "scanId": "scan_458",
    "error": true,
    "status": "UNAVAILABLE",
    "reason": "MODEL_TIMEOUT",
    "message": "Crop analysis is temporarily unavailable. Please try again shortly."
  }
}
```
*Note: Even in these edge states, the scan and images are saved to history as negative examples or for future debugging.*
