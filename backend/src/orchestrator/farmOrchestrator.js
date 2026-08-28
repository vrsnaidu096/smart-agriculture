const DiseaseService = require('../modules/disease/disease.service');
const SoilService = require('../modules/soil/soil.service');
const WeatherService = require('../modules/weather/weather.service');
const HistoryService = require('../modules/history/history.service');
const ImageStore = require('../storage/imageStore');
const AlertsService = require('../modules/alerts/alerts.service');

const DecisionEngine = require('../intelligence/decisionEngine');
const SafetyValidator = require('../intelligence/safetyValidator');
const RiskEngine = require('../intelligence/riskEngine');
const RecommendationEngine = require('../intelligence/recommendationEngine');

class FarmOrchestrator {
  /**
   * Coordinates the entire analysis pipeline.
   * Steps run in parallel where possible.
   */
  async processScan(payload) {
    const { images, latitude, longitude, farmId, cropName } = payload;

    console.log(`[Orchestrator] Starting parallel intelligence gathering for Farm ${farmId}`);

    // 1. Gather Intelligence IN PARALLEL.
    //    Image persistence is independent of the inference calls, so it rides
    //    along here rather than adding latency after them.
    const [diseaseRaw, soilResult, weatherResult, historyResult, storedImages] =
      await Promise.all([
        DiseaseService.analyze(images, cropName),
        SoilService.getSoilForLocation(latitude, longitude),
        WeatherService.getWeatherForLocation(latitude, longitude),
        HistoryService.getFarmHistory(farmId),
        ImageStore.persistBatch(images)
      ]);

    // Split the per-image predictions off the headline result so the response
    // payload sent to the phone stays unchanged.
    const { perImage = [], ...diseaseResult } = diseaseRaw;

    const persisted = storedImages.filter((image) => image.ok);
    const primaryImage = persisted[0] || null;

    const imageRows = persisted.map((image) => {
      const prediction = perImage.find((p) => p.index === image.index) || {};
      return {
        path: image.path,
        sha256: image.sha256,
        mime: image.mime,
        bytes: image.bytes,
        cropName: cropName ?? null,
        // Store the model's raw label where we have it: that is what a
        // reviewer corrects against, and what maps onto a dataset class.
        predictedLabel: prediction.rawLabel ?? prediction.disease ?? null,
        predictedConfidence: prediction.confidence ?? null,
        predictionSource: prediction.source ?? null,
        modelVersion: prediction.modelVersion ?? null
      };
    });

    const predictionSource = perImage.find((p) => p.source)?.source ?? null;
    const modelVersion = perImage.find((p) => p.modelVersion)?.modelVersion ?? null;

    // 2. Photos we cannot diagnose are still worth keeping - rejected frames
    //    are the negative examples an out-of-distribution class needs, and an
    //    outage should not throw away the farmer's photo either. Record the
    //    scan before returning rather than dropping them on the floor.
    const undiagnosable = ['REJECTED', 'UNAVAILABLE'].includes(diseaseResult.status);

    if (undiagnosable) {
      console.log(`[Orchestrator] No diagnosis: ${diseaseResult.status}`);

      const scanId = await HistoryService.saveScan({
        farmId,
        latitude,
        longitude,
        disease: { disease: diseaseResult.status, confidence: diseaseResult.confidence ?? 0 },
        weather: weatherResult,
        soil: soilResult,
        risk: null,
        imageRef: primaryImage ? primaryImage.path : null,
        imageCount: persisted.length,
        modelVersion,
        predictionSource
      });

      await HistoryService.saveScanImages(scanId, imageRows);

      return {
        scanId,
        error: true,
        status: diseaseResult.status,
        reason: diseaseResult.rejectReason ?? null,
        message:
          diseaseResult.message ||
          (diseaseResult.status === 'REJECTED'
            ? 'We could not find a crop leaf in this photo. Hold the camera close so a single leaf fills the frame.'
            : 'Crop analysis is temporarily unavailable. Please try again shortly.')
      };
    }

    // 3. Result Merger (Phase 8)
    const farmContext = {
      location: { latitude, longitude },
      disease: diseaseResult,
      soil: soilResult,
      weather: weatherResult,
      history: historyResult
    };

    console.log('[Orchestrator] Farm Context Merged.');

    // 4. Decision Engine (Phase 9)
    const decisions = DecisionEngine.evaluate(farmContext);

    // 5. Safety Validator (Phase 10)
    const safeRecommendations = SafetyValidator.validate(decisions, farmContext);

    // 6. Risk Engine (Phase 11)
    const risk = RiskEngine.calculate(farmContext);

    // Combine top recommendation string for mobile UI simplicity
    const topRecommendation =
      safeRecommendations.length > 0 ? safeRecommendations[0].message : risk.alert;

    // 6.5 Recommendation Engine (Phase 11.5)
    // Sit AFTER SafetyValidator: enrich with symptoms, precautions, and monitoring
    const enrichedData = RecommendationEngine.enrich(safeRecommendations, farmContext);

    // 7. Save History (Phase 12)
    const scanId = await HistoryService.saveScan({
      farmId,
      latitude,
      longitude,
      disease: diseaseResult,
      weather: weatherResult,
      soil: soilResult,
      risk,
      imageRef: primaryImage ? primaryImage.path : null,
      imageCount: persisted.length,
      modelVersion,
      predictionSource
    });

    if (!scanId) {
      // Images are already on disk; without a scan row they cannot be labelled
      // or exported, so make the failure loud rather than leaving orphan files.
      console.error(
        `[Orchestrator] Scan row was NOT saved - ${persisted.length} image(s) are on disk with no database record.`
      );
    }

    const savedImages = await HistoryService.saveScanImages(scanId, imageRows);
    console.log(`[Orchestrator] Scan ${scanId} saved with ${savedImages} image row(s).`);

    // A HIGH risk result becomes a standing alert the farmer sees on the
    // dashboard, not just a one-off screen they might dismiss.
    if (risk.riskLevel === 'HIGH') {
      await AlertsService.persist(farmId, topRecommendation, 'HIGH');
    }

    // 8. Return to Mobile App
    // Adding the enriched content to the response WITHOUT changing existing field names
    return {
      scanId,
      disease: diseaseResult,
      soil: soilResult,
      weather: weatherResult,
      risk,
      status: diseaseResult.status,
      dataSource: predictionSource,
      recommendation: topRecommendation,
      ...(enrichedData.symptoms && { symptoms: enrichedData.symptoms }),
      ...(enrichedData.precautions && { precautions: enrichedData.precautions }),
      ...(enrichedData.monitoring && { monitoring: enrichedData.monitoring })
    };
  }
}

module.exports = new FarmOrchestrator();
