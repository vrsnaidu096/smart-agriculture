const BoundaryService = require('../lingbot-map/farm/boundary.service');
const HistoryService = require('../modules/history/history.service');
const ZoneService = require('../lingbot-map/farm/zone.service');
const MarkerService = require('../lingbot-map/spatial/marker.service');
const FarmService = require('../modules/farm/farm.service');
const { ok, badRequest } = require('../utils/response');

class MapController {
  async saveBoundary(req, res, next) {
    try {
      const { farmId, geojson } = req.body;
      if (!farmId || !geojson) {
        return badRequest(res, 'Missing farmId or geojson', 'MISSING_DATA');
      }

      // Accept a bare coordinate array as well as a full GeoJSON Polygon, so the
      // mobile boundary walker can post what it has.
      const polygon = Array.isArray(geojson)
        ? { type: 'Polygon', coordinates: [geojson] }
        : geojson;

      if (polygon.type !== 'Polygon' || !Array.isArray(polygon.coordinates)) {
        return badRequest(res, 'geojson must be a Polygon.', 'BAD_GEOJSON');
      }

      const ring = polygon.coordinates[0];
      if (!Array.isArray(ring) || ring.length < 3) {
        return badRequest(res, 'A farm boundary needs at least 3 points.', 'TOO_FEW_POINTS');
      }

      const boundaryId = await BoundaryService.saveBoundary(farmId, polygon);
      return ok(res, { boundaryId, points: ring.length });
    } catch (error) {
      next(error);
    }
  }

  /** Boundary + markers + zones: everything the map screen renders. */
  async getMapData(req, res, next) {
    try {
      const farmId = Number(req.params.farmId);
      if (!Number.isInteger(farmId) || farmId <= 0) {
        return badRequest(res, 'farmId must be a positive integer.', 'BAD_FARM_ID');
      }

      const [boundary, scans] = await Promise.all([
        BoundaryService.getBoundary(farmId),
        FarmService.recentScoredScans(farmId, 200)
      ]);

      const { markers, bounds } = MarkerService.build(scans);
      const zones = ZoneService.build(scans);

      return ok(res, {
        boundary: boundary ? boundary.geojson : null,
        markers,
        zones,
        bounds,
        legend: [
          { type: 'HIGH_RISK', label: 'High Risk Zone' },
          { type: 'MONITORING', label: 'Monitoring Zone' },
          { type: 'HEALTHY', label: 'Healthy Zone' }
        ]
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MapController();
