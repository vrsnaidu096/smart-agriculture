const BoundaryService = require('../lingbot-map/farm/boundary.service');
const HistoryService = require('../modules/history/history.service');

class MapController {
  async saveBoundary(req, res, next) {
    try {
      const { farmId, geojson } = req.body;
      if (!farmId || !geojson) {
        return res.status(400).json({ success: false, error: { message: 'Missing farmId or geojson' }});
      }
      const boundaryId = await BoundaryService.saveBoundary(farmId, geojson);
      res.json({ success: true, data: { boundaryId }});
    } catch (error) {
      next(error);
    }
  }

  async getMapData(req, res, next) {
    try {
      const { farmId } = req.params;
      const boundary = await BoundaryService.getBoundary(farmId);
      
      // Get historical scan markers to display on map
      const scans = await HistoryService.getFarmHistory(farmId);

      res.json({
        success: true,
        data: {
          boundary: boundary ? boundary.geojson : null,
          markers: scans.map(scan => ({
            id: scan.id,
            latitude: scan.latitude,
            longitude: scan.longitude,
            disease: scan.disease,
            riskLevel: scan.risk_level,
            timestamp: scan.created_at
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MapController();
