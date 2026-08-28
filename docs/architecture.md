# Architecture

## Parallel Orchestrator
The platform uses a Parallel Orchestrator (`backend/src/orchestrator/farmOrchestrator.js`) to minimize latency during inference. When a crop photo is uploaded, the orchestrator dispatches requests to `DiseaseService`, `SoilService`, `WeatherService`, `HistoryService`, and `ImageStore` simultaneously using `Promise.all`. Image persistence rides along in parallel rather than blocking the response.

## Modular Monolith
The system is built as a Modular Monolith. 
**Why?** It keeps deployment simple (a single Node.js process) while enforcing strict logical separation of concerns. This allows us to scale out individual components into microservices later if load demands it, without sacrificing the current low-latency local function calls between modules.

## Module Boundaries
- **Modules (`backend/src/modules/`)**: Independent domains responsible for data gathering and specific formatting (`disease`, `soil`, `weather`, `history`, `alerts`). They do not talk to each other directly.
- **Intelligence (`backend/src/intelligence/`)**: Contains the business logic. 
  - `DecisionEngine`: Merges farm context.
  - `SafetyValidator`: Filters unsafe recommendations.
  - `RiskEngine`: Calculates the overall risk score.
  - `RecommendationEngine`: Enriches recommendations with symptoms and precautions.
- **Storage (`backend/src/storage/`)**: Handles file persistence (`imageStore`).
- **Orchestrator (`backend/src/orchestrator/`)**: Coordinates the flow of data between Modules and Intelligence.
- **Routes & Controllers**: Handle HTTP API boundaries and request validation.
