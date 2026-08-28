/**
 * Disease Mapper
 * Standardizes the raw output from various AI models into our unified format.
 */
class DiseaseMapper {
  static mapToStandard(rawResult) {
    if (!rawResult || rawResult.status === 'UNAVAILABLE') {
      return { status: 'UNAVAILABLE' };
    }

    if (rawResult.status === 'NOT_A_CROP') {
      return {
        status: 'NOT_A_CROP',
        crop: 'Unknown',
        disease: 'None',
        confidence: 0,
        healthStatus: 'INVALID_IMAGE'
      };
    }

    return {
      status: 'SUCCESS',
      crop: rawResult.detected_crop || 'Unknown',
      disease: rawResult.predicted_disease || 'Unknown',
      confidence: rawResult.confidence_score || 0.0,
      healthStatus: rawResult.confidence_score > 0.7 && rawResult.predicted_disease !== 'Healthy' 
        ? 'DISEASE_DETECTED' 
        : 'HEALTHY'
    };
  }
}

module.exports = DiseaseMapper;
