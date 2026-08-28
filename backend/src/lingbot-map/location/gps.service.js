class GpsService {
  /**
   * Validate and normalize a coordinate pair.
   * @param {any} lat - Latitude
   * @param {any} lon - Longitude
   * @returns {{ latitude: number, longitude: number } | null} Normalized coordinates or null if invalid
   */
  normalizeCoordinates(lat, lon) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return null;
    }

    if (latitude < -90 || latitude > 90) {
      return null;
    }

    if (longitude < -180 || longitude > 180) {
      return null;
    }

    return {
      latitude,
      longitude
    };
  }

  /**
   * Return the quality band for a given GPS accuracy reading in meters.
   * @param {number} accuracyInMeters 
   * @returns {'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'}
   */
  getAccuracyQualityBand(accuracyInMeters) {
    if (typeof accuracyInMeters !== 'number' || isNaN(accuracyInMeters)) {
      return 'UNKNOWN';
    }
    
    if (accuracyInMeters <= 5) {
      return 'HIGH';
    } else if (accuracyInMeters <= 20) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }
}

module.exports = new GpsService();
