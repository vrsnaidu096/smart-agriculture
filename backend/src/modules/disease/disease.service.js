const DiseaseMapper = require('./disease.mapper');
const { getDiseasePrediction } = require('../../integrations/diseaseModel');

/**
 * Disease Service
 * Handles business logic and delegates to the integration layer.
 */
class DiseaseService {
  async analyze(images, cropName = null) {
    try {
      let highestRiskResult = null;

      // Loop through the uploaded images (sequentially to avoid hitting HF Free Tier rate limits)
      for (let i = 0; i < images.length; i++) {
        console.log(`[DiseaseService] Analyzing image ${i + 1} of ${images.length}...`);
        const rawPrediction = await getDiseasePrediction(images[i], cropName);
        const mappedResult = DiseaseMapper.mapToStandard(rawPrediction);

        // If it's not a crop, skip it
        if (mappedResult.status === 'NOT_A_CROP') continue;

        // If we found a disease, we can set it as the highest risk and stop (or continue to find worst)
        // For MVP, if we find a disease, we immediately flag it for the user
        if (mappedResult.healthStatus === 'DISEASE_DETECTED') {
          return mappedResult;
        }

        // Keep track of a valid result in case they are all healthy
        highestRiskResult = mappedResult;
      }

      // If all images were rejected as NOT_A_CROP
      if (!highestRiskResult) {
        return { status: 'NOT_A_CROP' };
      }

      // If we got here, they were all healthy crops
      return highestRiskResult;
    } catch (error) {
      console.error('Disease AI failed:', error.message);
      return { status: 'UNAVAILABLE' }; // Graceful degradation
    }
  }
}

module.exports = new DiseaseService();
