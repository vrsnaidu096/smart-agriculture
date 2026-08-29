# 🌾 Surya Kshetra: Smart Agriculture Intelligence Platform

> **"जय जवान जय किसान — Smart, Contextual, and Resilient Agronomy for the Modern Farmer."**

Surya Kshetra is a next-generation mobile platform designed to bridge the gap between complex agricultural science and the everyday farmer. By fusing edge-AI computer vision, live satellite telemetry (weather/soil), and Generative AI, we provide farmers with highly specific, hyper-local, and actionable agronomic advice.

---

## 💡 The Problem
Farmers currently rely on static knowledge bases or generic advice when their crops fall ill. Existing apps will detect "Leaf Blast" and output a static Wikipedia-style paragraph. However, agronomic treatment **must** change based on the environment (e.g., spraying chemicals during high heat or heavy rain is catastrophic). Furthermore, farmers often operate in low-bandwidth environments where heavy AI applications time out and fail.

## 🚀 The Solution & Core Innovations (Jury Defense Guide)

If the jury asks what makes this project technically impressive or different from existing solutions, refer to these core pillars:

### 1. Context-Aware LLM Engine (Not just a wrapper!)
* **Jury Question:** *"How is this different from just asking ChatGPT?"*
* **Our Answer:** We don't just pass the disease name to an LLM. Our `farmOrchestrator` acts as a data pipeline. When a scan completes, we fetch **live Open-Meteo telemetry** (temperature, volumetric soil moisture). We inject the detected disease, soil data, and weather data into a strict prompt for **Gemini 2.5 Flash**. The AI dynamically alters its treatment plan based on the *actual dirt the farmer is standing on*. If the soil is dry, the LLM adapts its chemical and irrigation advice accordingly.

### 2. The 3-Second "Circuit Breaker" (Offline Resilience)
* **Jury Question:** *"What happens if the farmer has a terrible 2G internet connection in the field? Does the AI just spin forever?"*
* **Our Answer:** No. We engineered a strict `Promise.race()` circuit breaker in our Recommendation Engine. If the Gemini API takes more than exactly 3.0 seconds (due to network drops or latency), the system instantly aborts the network request and falls back to our local, static `knowledge/diseases` JSON database. The farmer gets a 100% reliable, zero-latency response every single time—Genius AI when they have a signal, Safe Baseline when they don't.

### 3. Out-of-Distribution (OOD) ML Rejection
* **Jury Question:** *"What if I take a picture of my shoe or a dog? Will it tell me my shoe has Leaf Blight?"*
* **Our Answer:** No. Our Python/FastAPI ML sidecar implements an **Energy Score** algorithm (`-logsumexp(logits)`) and **Test-Time Augmentation (TTA)**. Instead of blindly trusting the highest softmax probability, the model measures prediction uncertainty. If the user scans a non-leaf, the energy score triggers an abstention, and the app gracefully informs the user that the image is invalid.

### 4. 3D Geospatial Heatmaps & Live Tracking
* **Jury Question:** *"How does this help at a macro/farm-management level?"*
* **Our Answer:** Every scan is plotted on a custom **3D Isometric Map** (powered by React Native Maps & Google Maps). We implemented predictive `<Heatmap>` overlays to visualize disease spread and high-risk zones. Clicking on invisible touch targets reveals rich Callouts with historical scan data and risk badges. 

### 5. Seamless Native Localization
* **Jury Question:** *"How are you handling regional languages?"*
* **Our Answer:** We didn't just translate text; we engineered dynamic typography. Android fails to render custom fonts across mixed scripts (Latin, Devanagari, Telugu). We built a dynamic `useAppTypography` hook that intercepts `react-i18next` state and hot-swaps the font family (e.g., to `Noto Sans Telugu`) precisely when the user switches to Telugu, ensuring perfect rendering without falling back to ugly system defaults.

---

## 🏗️ Technical Architecture

### 📱 Frontend (Mobile)
* **Framework:** React Native / Expo (SDK 54)
* **UI/UX:** Custom Brand Identity (`BrandMark` SVG primitives dynamically generated to prevent gradient ID collisions), safe area handling, native Pinch-to-Zoom Camera gestures.
* **State & Navigation:** React Navigation (Native Stack), AsyncStorage for local persistence.
* **Maps:** `react-native-maps` with Isometric Camera and Heatmap support.

### ⚙️ Backend (Node.js/Express)
* **Orchestrator:** `farmOrchestrator.js` manages async resolution of ML predictions, live weather, and history.
* **Intelligence:** `recommendationEngine.js` integrates `@google/genai`.
* **Database:** SQLite3 (`database.sqlite`) for ultra-fast, local read/writes of historical scans and telemetry.
* **Infrastructure:** Tunneled via Pinggy for live public cloud demonstrations.

### 🧠 ML Inference Sidecar (Python/FastAPI)
* **Model:** Fine-tuned `SigLIP2` (transfer learning via PyTorch).
* **Pipeline:** Configurable TTA, temperature scaling, and OOD energy scoring.

---

## 🛠️ APIs & Integrations
1. **Google Gemini (2.5 Flash):** Generative agronomic intelligence.
2. **Open-Meteo:** Unauthenticated, high-accuracy weather and volumetric soil moisture retrieval.
3. **Firebase Auth:** Phone OTP (configured with Test Numbers `+91 99999 99999` to bypass free-tier SMS quotas during demos).

---

## 🎭 Hackathon "Demo Mode" Features
To ensure a flawless presentation from a desk, the app includes hidden demo mechanisms:
* **Demo Jitter:** When scanning from the presentation desk, the map slightly jitters the GPS coordinates so the pins spread out and look like a real, distributed farm.
* **Boundary Forcing:** The app intelligently overrides the phone's physical GPS and forces the scan coordinates to drop exactly inside the user's drawn farm boundary. 

---
*Built with ❤️ for the Smart Agriculture Hackathon.*
