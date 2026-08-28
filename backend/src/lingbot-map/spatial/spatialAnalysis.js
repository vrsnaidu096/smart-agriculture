class SpatialAnalysis {
  /**
   * Analyzes scan markers to report disease spread direction and cluster growth.
   * @param {Array<{latitude: number, longitude: number, timestamp: Date | number}>} markers 
   * @returns {{ direction: string | null, isGrowing: boolean, message?: string }}
   */
  analyzeSpread(markers) {
    if (!markers || markers.length < 2) {
      return { direction: null, isGrowing: false, message: 'Not enough markers for spatial analysis' };
    }

    // Sort markers by time
    const sortedMarkers = [...markers].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Split markers into two halves: older and newer
    const midIndex = Math.floor(sortedMarkers.length / 2);
    const older = sortedMarkers.slice(0, midIndex);
    const newer = sortedMarkers.slice(midIndex);

    // Calculate centroids
    const centroidOld = this.getCentroid(older);
    const centroidNew = this.getCentroid(newer);

    // Calculate direction
    const direction = this.getDirection(centroidOld, centroidNew);

    // Check if growing by area
    const oldArea = this.getBoundingBoxArea(older);
    const newArea = this.getBoundingBoxArea(newer);
    
    let isGrowing = false;
    // If area is 0 (e.g. single point), fall back to count.
    if (oldArea === 0 && newArea === 0) {
       isGrowing = newer.length > older.length;
    } else {
       isGrowing = newArea > oldArea;
    }

    return {
      direction,
      isGrowing
    };
  }

  getCentroid(markers) {
    if (!markers.length) return { latitude: 0, longitude: 0 };
    let sumLat = 0;
    let sumLon = 0;
    for (const m of markers) {
      sumLat += parseFloat(m.latitude);
      sumLon += parseFloat(m.longitude);
    }
    return {
      latitude: sumLat / markers.length,
      longitude: sumLon / markers.length
    };
  }

  getDirection(from, to) {
    const latDiff = to.latitude - from.latitude;
    const lonDiff = to.longitude - from.longitude;

    // Small threshold to avoid micro-movements being classified
    if (Math.abs(latDiff) < 1e-6 && Math.abs(lonDiff) < 1e-6) return 'Stationary';

    const angle = Math.atan2(lonDiff, latDiff) * (180 / Math.PI);
    
    // Map angle to compass direction
    const compassDirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
    // Normalize to 0-360 starting from North
    let normalized = (angle < 0 ? angle + 360 : angle);
    
    const index = Math.round(normalized / 45);
    return compassDirs[index];
  }

  getBoundingBoxArea(markers) {
    if (!markers.length) return 0;
    
    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;
    
    for (const m of markers) {
      const lat = parseFloat(m.latitude);
      const lon = parseFloat(m.longitude);
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    }
    
    const latDist = maxLat - minLat;
    const lonDist = maxLon - minLon;
    return latDist * lonDist;
  }
}

module.exports = new SpatialAnalysis();
