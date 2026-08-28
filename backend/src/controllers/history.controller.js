const HistoryService = require('../modules/history/history.service');
const { ok, badRequest, notFound } = require('../utils/response');

class HistoryController {
  async getHistory(req, res, next) {
    try {
      const farmId = Number(req.params.farmId);
      if (!Number.isInteger(farmId) || farmId <= 0) {
        return badRequest(res, 'farmId must be a positive integer.', 'BAD_FARM_ID');
      }

      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Math.max(Number(req.query.offset) || 0, 0);

      const [scans, total] = await Promise.all([
        HistoryService.getHistory(farmId, limit, offset),
        HistoryService.countScans(farmId)
      ]);

      // Weather and soil are stored as JSON strings; expand them for the client.
      const expand = (raw) => {
        try {
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      };

      return ok(res, {
        total,
        limit,
        offset,
        scans: scans.map((scan) => ({
          id: scan.id,
          farmId: scan.farm_id,
          latitude: scan.latitude,
          longitude: scan.longitude,
          imageRef: scan.image_ref,
          disease: scan.disease,
          confidence: scan.confidence,
          riskLevel: scan.risk_level,
          riskScore: scan.risk_score,
          recommendation: scan.recommendation,
          weather: expand(scan.weather_data),
          soil: expand(scan.soil_data),
          dataSource: scan.prediction_source,
          createdAt: scan.created_at
        }))
      });
    } catch (error) {
      next(error);
    }
  }

  async getScan(req, res, next) {
    try {
      const scanId = Number(req.params.scanId);
      if (!Number.isInteger(scanId) || scanId <= 0) {
        return badRequest(res, 'scanId must be a positive integer.', 'BAD_SCAN_ID');
      }

      const scan = await HistoryService.getScan(scanId);
      if (!scan) return notFound(res, 'No scan with that id.');

      return ok(res, { scan });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HistoryController();
