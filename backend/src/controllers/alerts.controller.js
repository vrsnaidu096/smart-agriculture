const AlertsService = require('../modules/alerts/alerts.service');
const FarmService = require('../modules/farm/farm.service');
const { ok, badRequest } = require('../utils/response');

class AlertsController {
  async getAlerts(req, res, next) {
    try {
      const farmId = Number(req.params.farmId);
      if (!Number.isInteger(farmId) || farmId <= 0) {
        return badRequest(res, 'farmId must be a positive integer.', 'BAD_FARM_ID');
      }

      const [scans, stored] = await Promise.all([
        FarmService.recentScoredScans(farmId, 30),
        AlertsService.stored(farmId, 20)
      ]);

      const alerts = AlertsService.merge(AlertsService.derive(scans), stored);

      return ok(res, {
        count: alerts.length,
        unreadHigh: alerts.filter((a) => a.level === 'HIGH').length,
        alerts
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AlertsController();
