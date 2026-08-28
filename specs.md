# Smart Agriculture Intelligence Platform - Specification Sheet

## 1. Project Overview
**Name:** Smart Agriculture Intelligence Platform
**Custom Mapping Module:** LingBot-Map
**Goal:** Build a modular, production-ready agricultural assistance system connecting farmers to AI-powered insights (disease detection, soil data, weather data) along with custom spatial mapping.

## 2. Core User Flow
1. Farmer opens the app.
2. Grants camera and location permissions.
3. Captures a crop/leaf image.
4. Clicks "Analyze Crop".
5. App automatically captures GPS coordinates and sends them with the image to the backend.
6. Backend processes intelligence modules in parallel (Disease AI, Soil, Weather, History).
7. Results are merged and evaluated by the Decision Engine.
8. Safety Validator checks constraints; Risk Engine assigns a risk level.
9. Farmer views simple recommendations.
10. Scan data is saved and mapped via LingBot-Map.

## 3. Architecture
- **Frontend:** React Native with Expo. Clean, farmer-friendly, multi-lingual UI (English, Telugu, Hindi).
- **Backend:** Node.js, Express.js (Modular Monolith). Asynchronous parallel processing.
- **Database:** SQLite (MVP), ready for PostgreSQL.
- **Mapping:** LingBot-Map for 2D zones/markers, architecture prepared for future 3D via Three.js.

### 3.1 Backend Components
- **Mobile Application:** Entry point.
- **Farm Orchestrator:** Manages parallel execution of intelligence modules.
- **Result Merger:** Combines parallel module outputs into a `Farm Context`.
- **Knowledge Base:** JSON-based rules (diseases, irrigation, weather, risk).
- **Decision Engine:** Applies Knowledge Base to the Farm Context to produce recommendations.
- **Safety Validator:** Checks for contradictions or environmental hazards (e.g., advising spraying during rain).
- **Risk Engine:** Calculates an overall Risk Score (Low, Medium, High).
- **LingBot-Map (Backend):** Manages spatial data, farm boundaries, and scan zones.

## 4. Intelligence Modules
- **Disease Intelligence:** Image classification of crops/leaves with an abstraction layer for model interchangeability.
- **Soil Intelligence:** Retrieves soil metrics based on GPS.
- **Weather Intelligence:** Retrieves weather and forecast data based on GPS.
- **Farm History:** Retrieves past scan data and risk occurrences.

## 5. Development Phases
- **Phase 1:** Project setup (Mobile, Backend, Database, Env config).
- **Phase 2:** GPS integration.
- **Phase 3:** Crop image capture.
- **Phase 4:** Disease AI integration.
- **Phase 5:** Weather intelligence.
- **Phase 6:** Soil intelligence.
- **Phase 7:** Parallel Farm Orchestrator.
- **Phase 8:** Result merger.
- **Phase 9:** Decision Engine.
- **Phase 10:** Safety Validator.
- **Phase 11:** Risk Engine.
- **Phase 12:** Database history.
- **Phase 13:** LingBot-Map base.
- **Phase 14:** Farm boundary mapping.
- **Phase 15:** Scan markers and zones.
- **Phase 16:** UI improvements.
- **Phase 17:** Prepare 3D mapping architecture.

## 6. Important Guidelines
- **No hardcoded secrets:** Use `.env`.
- **Parallel processing:** Avoid sequential bottlenecks.
- **Modular Monolith:** Clean separation of concerns.
- **Graceful degradation:** If one module fails (e.g., Soil), others should still succeed and the application should handle the partial result.
