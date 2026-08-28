# Model and API Selection Strategy

Since we do not have our own custom pre-trained datasets for the MVP, we will leverage existing public APIs and pre-trained models. Our architecture's abstraction layer ensures that when you *do* decide to train custom models later, you can swap these out without changing the rest of the application.

## 1. Disease AI Integration
**Strategy:** Use a hosted pre-trained model via an Inference API.
- **Provider:** [Hugging Face Inference API](https://huggingface.co/models)
- **Model:** Search for open-source models trained on the "PlantVillage" dataset (e.g., models tagged with `plant-disease`). 
- **How it works:** We send the base64 crop image from the mobile app directly to the Hugging Face REST API. The API returns the predicted disease and confidence score, which our `DiseaseMapper` converts to our standard format.

## 2. Weather Intelligence Integration
**Strategy:** Use a commercial weather data provider. We don't need an AI for this; we just need accurate localized forecast data.
- **Provider:** [WeatherAPI](https://www.weatherapi.com/) or [OpenWeatherMap](https://openweathermap.org/)
- **How it works:** We pass the GPS `latitude` and `longitude` captured by the mobile app to the Weather API. It returns temperature, humidity, wind speed, and rain probability, which our `WeatherMapper` standardizes for the Decision Engine.

## 3. Soil Intelligence Integration
**Strategy:** Use global geospatial soil databases that have already run machine learning models on planetary data.
- **Provider:** [SoilGrids API (ISRIC)](https://rest.isric.org/)
- **How it works:** SoilGrids is a system for global digital soil mapping. By passing the GPS `latitude` and `longitude`, the API returns estimated soil properties like pH, organic carbon, and texture at different depths. Our `SoilMapper` extracts the topsoil values.

---

## Future Path (Custom Models)
When you have collected enough proprietary data (e.g., through the app's `CropScans` history database):
1. Export the images and labels.
2. Train a custom model using TensorFlow or PyTorch.
3. Host it on a cloud provider (AWS SageMaker, Google Vertex AI).
4. Update **only** the `diseaseModel.js` integration file to point to your new endpoint. The rest of the app remains completely unchanged.
