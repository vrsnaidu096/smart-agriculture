const DiseaseService = require('../modules/disease/disease.service');
const SoilService = require('../modules/soil/soil.service');
const WeatherService = require('../modules/weather/weather.service');
const HistoryService = require('../modules/history/history.service');

const DecisionEngine = require('../intelligence/decisionEngine');
const SafetyValidator = require('../intelligence/safetyValidator');
const RiskEngine = require('../intelligence/riskEngine');

class FarmOrchestrator {
  /**
   * Coordinates the entire analysis pipeline.
   * Steps run in parallel where possible.
   */
  async processScan(payload) {
    const { images, latitude, longitude, farmId, cropName } = payload;
    
    console.log(`[Orchestrator] Starting parallel intelligence gathering for Farm ${farmId}`);
    
    // 1. Gather Intelligence IN PARALLEL
    const [diseaseResult, soilResult, weatherResult, historyResult] = await Promise.all([
      DiseaseService.analyze(images, cropName), // Pass the array of images
      SoilService.getSoilForLocation(latitude, longitude),
      WeatherService.getWeatherForLocation(latitude, longitude),
      HistoryService.getFarmHistory(farmId)
    ]);

    if (diseaseResult.status === 'NOT_A_CROP') {
      console.log('[Orchestrator] Rejected image: Not a valid crop.');
      return {
        error: true,
        message: "We could not detect a valid crop in this image. Please ensure the leaf is clearly visible."
      };
    }

    // 2. Result Merger (Phase 8)
    const farmContext = {
      location: { latitude, longitude },
      disease: diseaseResult,
      soil: soilResult,
      weather: weatherResult,
      history: historyResult
    };

    console.log('[Orchestrator] Farm Context Merged.');

    // 3. Decision Engine (Phase 9)
    const decisions = DecisionEngine.evaluate(farmContext);

    // 4. Safety Validator (Phase 10)
    const safeRecommendations = SafetyValidator.validate(decisions, farmContext);

    // 5. Risk Engine (Phase 11)
    const risk = RiskEngine.calculate(farmContext);

    // Combine top recommendation string for mobile UI simplicity
    const topRecommendation = safeRecommendations.length > 0 
      ? safeRecommendations[0].message 
      : risk.alert;

    // 6. Save History (Phase 12)
    const scanId = await HistoryService.saveScan(
      farmId, latitude, longitude, diseaseResult, weatherResult, soilResult, risk
    );

    // 7. Return to Mobile App
    return {
      scanId,
      disease: diseaseResult,
      soil: soilResult,
      weather: weatherResult,
      risk: risk,
      recommendation: topRecommendation
    };
  }
}

module.exports = new FarmOrchestrator();
