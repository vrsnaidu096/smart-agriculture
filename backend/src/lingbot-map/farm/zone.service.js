const config = require('../../config/environment');
const { distanceMetres, centroid } = require('../location/coordinateConverter');

/**
 * Groups nearby scans into farm zones (spec section 20).
 *
 * Deliberately simple: greedy single-pass clustering by distance, newest scans
 * first, with the zone taking the worst risk level it contains. The spec calls
 * for exactly this - no geospatial ML in the MVP.
 */

const RANK = { LOW: 0, MEDIUM: 1, HIGH: 2 };
const LEVEL_TO_ZONE = { LOW: 'HEALTHY', MEDIUM: 'MONITORING', HIGH: 'HIGH_RISK' };

class ZoneService {
  build(scans, radiusMetres = config.map.zoneRadiusMetres) {
    const usable = (scans || []).filter(
      (s) =>
        typeof s.latitude === 'number' &&
        typeof s.longitude === 'number' &&
        s.risk_level &&
        RANK[s.risk_level] !== undefined
    );

    const clusters = [];

    for (const scan of usable) {
      const home = clusters.find(
        (cluster) =>
          distanceMetres(
            cluster.centre.latitude,
            cluster.centre.longitude,
            scan.latitude,
            scan.longitude
          ) <= radiusMetres
      );

      if (home) {
        home.scans.push(scan);
        home.centre = centroid(home.scans);
      } else {
        clusters.push({ scans: [scan], centre: { latitude: scan.latitude, longitude: scan.longitude } });
      }
    }

    return clusters.map((cluster, index) => {
      const worst = cluster.scans.reduce(
        (acc, s) => (RANK[s.risk_level] > RANK[acc.risk_level] ? s : acc),
        cluster.scans[0]
      );

      const diseases = [
        ...new Set(
          cluster.scans
            .map((s) => s.disease)
            .filter((d) => d && !['NOT_A_CROP', 'REJECTED', 'UNAVAILABLE'].includes(d))
        )
      ];

      return {
        id: `zone-${index + 1}`,
        type: LEVEL_TO_ZONE[worst.risk_level],
        riskLevel: worst.risk_level,
        centre: cluster.centre,
        scanCount: cluster.scans.length,
        diseases,
        radiusMetres,
        lastScanAt: cluster.scans[0]?.created_at ?? null
      };
    });
  }

  /** Zones that the farmer should act on - drives the dashboard's counter. */
  needingAttention(zones) {
    return (zones || []).filter((z) => z.type === 'MONITORING' || z.type === 'HIGH_RISK');
  }
}

module.exports = new ZoneService();
