# 🌾 Surya Kshetra: Smart Agriculture Intelligence Platform

> **"जय जवान जय किसान — Smart, Contextual, and Resilient Agronomy for the Modern Farmer."**

Surya Kshetra is a comprehensive, production-ready mobile platform designed to bridge the gap between complex agricultural science and the everyday farmer. By fusing edge-AI computer vision, live satellite telemetry (weather/soil), and Generative AI, the platform provides farmers with highly specific, hyper-local, and actionable agronomic advice.

---

## 📦 What This Project Includes (From Beginning to End)

The project is built as a complete ecosystem, integrating multiple modern technologies to deliver a seamless experience:

### 1. Mobile Application (Frontend)
* Built using **React Native & Expo**.
* Features a clean, farmer-friendly, multi-lingual UI (English, Telugu, Hindi) with dynamic typography handling.
* Includes custom camera integrations for image capture, and interactive 3D spatial mapping using LingBot-Map architecture.

### 2. Backend Platform (Node.js & Express)
* A robust **Modular Monolith** architecture designed for asynchronous parallel processing.
* **Farm Orchestrator:** Manages the simultaneous execution of multiple intelligence modules to minimize latency.
* **Database:** SQLite-based local storage (ready for PostgreSQL) to track historical scans, risk factors, and farm telemetry.

### 3. Machine Learning Inference Engine (Python & FastAPI)
* Dedicated ML sidecar for crop disease classification.
* Implements **Out-of-Distribution (OOD) Rejection** using Energy Scores to ensure only valid crop images are processed (e.g., rejecting pictures of random objects).

### 4. Intelligence Modules
* **Disease Intelligence:** Visual analysis of plant leaves/crops.
* **Soil & Weather Intelligence:** Live telemetry retrieval via Open-Meteo based on the farmer's exact GPS coordinates.
* **Generative AI Recommendations:** Context-aware treatment plans generated using Google Gemini 2.5 Flash, strictly guided by the current soil and weather conditions.

### 5. Resiliency Mechanisms
* **3-Second Circuit Breaker:** Ensures the app remains functional even in low-bandwidth rural areas by falling back to a local JSON knowledge base if API requests timeout.

---

## 🔄 Complete Workflow (From Zero to End)

The platform follows a strictly defined workflow to convert a simple image into comprehensive, actionable agronomic advice:

### Step 1: User Onboarding & Setup
1. The farmer opens the app and logs in (supporting OTP-based Firebase Authentication).
2. The user selects their preferred regional language (e.g., Telugu, Hindi, or English).
3. The app requests required device permissions (Camera and Location).

### Step 2: Farm Mapping
1. The farmer can define their farm's physical boundaries using the custom mapping interface.
2. The app initializes the base for 2D/3D spatial mapping and historical heatmaps.

### Step 3: Crop Image Capture
1. When a farmer notices an unhealthy crop, they use the app's native camera.
2. The app captures a high-resolution image of the affected leaf/crop.
3. Simultaneously, the app records the precise GPS coordinates of the scan location.
4. The user clicks **"Analyze Crop"**, sending the image and location data to the backend.

### Step 4: Parallel Intelligence Processing (The Orchestrator)
Upon receiving the data, the Backend **Farm Orchestrator** triggers several modules simultaneously:
* **ML Inference:** The image is sent to the FastAPI ML sidecar to identify the specific disease (or reject it if invalid).
* **Soil Module:** Fetches volumetric soil moisture data for the given GPS coordinates.
* **Weather Module:** Fetches current temperature, precipitation, and forecasts.
* **History Module:** Retrieves past disease occurrences in that specific farm zone.

### Step 5: Decision Engine & Safety Validation
1. **Result Merger:** The outputs from all parallel modules are combined into a single `Farm Context`.
2. **LLM Integration:** The `Farm Context` is injected into a strict prompt for the Gemini LLM. Instead of generic advice, the LLM provides context-aware treatment (e.g., advising against chemical sprays if rain is forecasted).
3. **Safety Validator & Risk Engine:** The system checks the AI's output against strict safety constraints and assigns an overall Risk Score (Low, Medium, High).
4. *(Fallback)*: If the LLM takes over 3 seconds due to poor network, the system instantly provides static, offline recommendations.

### Step 6: Visualization and Action
1. The farmer views a simplified, actionable recommendation screen in their chosen language.
2. The scan data, identified disease, and risk level are saved to the backend database.
3. The scan is plotted as a zone/marker on the in-app spatial heatmap, allowing the farmer to track disease spread over time.

---

## 🛠️ Technical Stack Overview
* **Mobile App:** React Native, Expo, React Navigation, react-native-maps.
* **Backend:** Node.js, Express.js, SQLite3.
* **AI & ML:** Google Gemini 2.5 Flash, PyTorch (SigLIP2 via FastAPI).
* **External APIs:** Open-Meteo (Weather/Soil), Firebase Auth.

---
*Built to empower farmers with Context-Aware AI.*
