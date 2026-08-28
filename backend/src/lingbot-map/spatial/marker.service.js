const { bounds } = require('../location/coordinateConverter');

/**
 * Turns stored scans into map markers (spec section 19).
 * Styling stays on the client; this only assigns a semantic state.
 */

const stateFor = (scan) => {
  if (scan.disease === 'NOT_A_CROP' || scan.disease === 'REJECTED') return 'INVALID';
  if (scan.disease === 'UNAVAILABLE' || !scan.risk_level) return 'UNKNOWN';
  if (scan.risk_level === 'HIGH') return 'HIGH_RISK';
  if (scan.risk_level === 'MEDIUM') return 'MONITOR';
  return 'HEALTHY';
};

class MarkerService {
  build(scans) {
    const usable = (scans || []).filter(
      (s) => typeof s.latitude === 'number' && typeof s.longitude === 'number'
    );

    const markers = usable.map((scan) => ({
      id: scan.id,
      latitude: scan.latitude,
      longitude: scan.longitude,
      disease: scan.disease || null,
      confidence: scan.confidence ?? null,
      riskLevel: scan.risk_level || null,
      riskScore: scan.risk_score ?? null,
      state: stateFor(scan),
      timestamp: scan.created_at
    }));

    return { markers, bounds: bounds(markers) };
  }
}

module.exports = new MarkerService();
