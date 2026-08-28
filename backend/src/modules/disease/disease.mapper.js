/**
 * Disease Mapper
 * Normalises the inference sidecar's response into the shape the rest of the
 * app consumes. Keeping this layer means swapping the model - or the whole
 * service - touches nothing downstream.
 */

class DiseaseMapper {
  static mapToStandard(raw) {
    if (!raw || typeof raw.status !== 'string') {
      return { status: 'UNAVAILABLE', healthStatus: 'UNKNOWN', source: 'live' };
    }

    const base = {
      source: 'live',
      modelVersion: raw.modelVersion ?? null,
      message: raw.message ?? null,
      gate: raw.gate ?? null
    };

    switch (raw.status) {
      case 'OK':
        return {
          ...base,
          status: 'SUCCESS',
          crop: raw.crop || 'Unknown',
          disease: raw.label || 'Unknown',
          rawLabel: raw.label || null,
          confidence: raw.confidence ?? 0,
          healthStatus: raw.healthStatus || 'UNKNOWN',
          threshold: raw.threshold ?? null,
          topK: raw.topK || []
        };

      case 'REJECTED':
        // Not a crop leaf, or an undecodable/oversize file.
        return {
          ...base,
          status: 'REJECTED',
          crop: raw.crop || 'Unknown',
          disease: null,
          confidence: 0,
          healthStatus: 'INVALID_IMAGE',
          rejectReason: raw.rejectReason || 'NOT_A_LEAF'
        };

      case 'ABSTAINED':
        // A leaf, but the model is not confident enough to name a disease.
        // This is a legitimate answer, not a failure.
        return {
          ...base,
          status: 'ABSTAINED',
          crop: raw.crop || 'Unknown',
          disease: null,
          confidence: raw.confidence ?? 0,
          healthStatus: 'UNKNOWN',
          rejectReason: raw.rejectReason || 'LOW_CONFIDENCE',
          threshold: raw.threshold ?? null,
          topK: raw.topK || []
        };

      default:
        return { ...base, status: 'UNAVAILABLE', healthStatus: 'UNKNOWN' };
    }
  }
}

module.exports = DiseaseMapper;
