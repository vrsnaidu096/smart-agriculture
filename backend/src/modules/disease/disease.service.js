const DiseaseMapper = require('./disease.mapper');
const { getDiseasePrediction } = require('../../integrations/diseaseModel');

/**
 * Disease Service
 *
 * Runs each submitted photo through the inference sidecar and picks the most
 * actionable result. Precedence, worst news first:
 *
 *   1. DISEASE_DETECTED  - stop, the farmer needs to know
 *   2. HEALTHY           - a confident clean bill of health
 *   3. ABSTAINED         - a leaf, but too unclear to call
 *   4. REJECTED          - no crop leaf found in any photo
 *   5. UNAVAILABLE       - the service could not answer
 *
 * Every per-image result is retained in `perImage` for persistence, whatever
 * the headline outcome.
 */
class DiseaseService {
  async analyze(images, cropName = null) {
    const perImage = [];

    try {
      let healthy = null;
      let abstained = null;
      let rejected = null;
      let diseased = null;

      for (let i = 0; i < images.length; i++) {
        console.log(`[DiseaseService] Analyzing image ${i + 1} of ${images.length}...`);

        const raw = await getDiseasePrediction(images[i], cropName);
        const mapped = DiseaseMapper.mapToStandard(raw);
        perImage.push({ index: i, ...mapped });

        if (mapped.status === 'SUCCESS' && mapped.healthStatus === 'DISEASE_DETECTED') {
          diseased = mapped;
          break; // break, not return - perImage must survive
        }
        if (mapped.status === 'SUCCESS' && !healthy) healthy = mapped;
        if (mapped.status === 'ABSTAINED' && !abstained) abstained = mapped;
        if (mapped.status === 'REJECTED' && !rejected) rejected = mapped;
      }

      const result =
        diseased ||
        healthy ||
        abstained ||
        rejected || { status: 'UNAVAILABLE', healthStatus: 'UNKNOWN', source: 'live' };

      return { ...result, perImage };
    } catch (error) {
      console.error('Disease analysis failed:', error.message);
      return { status: 'UNAVAILABLE', healthStatus: 'UNKNOWN', source: 'live', perImage };
    }
  }
}

module.exports = new DiseaseService();
