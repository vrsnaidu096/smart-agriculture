const FarmService = require('../modules/farm/farm.service');
const HistoryService = require('../modules/history/history.service');
const WeatherService = require('../modules/weather/weather.service');
const ZoneService = require('../lingbot-map/farm/zone.service');
const { ok, badRequest, notFound } = require('../utils/response');
const config = require('../config/environment');

class FarmController {
  async listFarms(req, res, next) {
    try {
      const farms = await FarmService.listFarms(
        req.query.userId ? Number(req.query.userId) : null
      );
      return ok(res, { farms });
    } catch (error) {
      next(error);
    }
  }

  async createFarm(req, res, next) {
    try {
      const { name, userId } = req.body;
      if (typeof name !== 'string' || name.trim() === '') {
        return badRequest(res, 'A farm name is required.', 'MISSING_NAME');
      }

      const farm = await FarmService.createFarm(name.trim(), Number(userId) || 1);
      if (!farm) return badRequest(res, 'Could not create the farm.', 'CREATE_FAILED');

      return ok(res, { farm }, 201);
    } catch (error) {
      next(error);
    }
  }

  async getFarm(req, res, next) {
    try {
      const farmId = Number(req.params.farmId);
      if (!Number.isInteger(farmId) || farmId <= 0) {
        return badRequest(res, 'farmId must be a positive integer.', 'BAD_FARM_ID');
      }

      const farm = await FarmService.getFarm(farmId);
      if (!farm) return notFound(res, 'No farm with that id.');

      return ok(res, { farm });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Everything the home dashboard needs, in one request: health ring, weather,
   * and recent scans. One round trip keeps the farmer's first screen fast.
   */
  async getSummary(req, res, next) {
    try {
      const farmId = Number(req.params.farmId);
      if (!Number.isInteger(farmId) || farmId <= 0) {
        return badRequest(res, 'farmId must be a positive integer.', 'BAD_FARM_ID');
      }

      const farm = await FarmService.getFarm(farmId);
      if (!farm) return notFound(res, 'No farm with that id.');

      const scoredScans = await FarmService.recentScoredScans(farmId, 50);
      const zones = ZoneService.build(scoredScans);
      const attention = ZoneService.needingAttention(zones).length;

      // Weather is fetched for the most recent scan location. With no scans yet
      // there is no location to ask about, so it stays unavailable rather than
      // guessing a coordinate.
      const anchor = scoredScans[0];
      const [recentScans, weather] = await Promise.all([
        HistoryService.getHistory(farmId, config.history.recentLimit, 0),
        anchor
          ? WeatherService.getWeatherForLocation(anchor.latitude, anchor.longitude)
          : Promise.resolve({ status: 'UNAVAILABLE' })
      ]);

      return ok(res, {
        farm: { id: farm.id, name: farm.name },
        health: FarmService.summarise(scoredScans, attention),
        weather,
        zones: { total: zones.length, needingAttention: attention },
        recentScans: recentScans.map((scan) => ({
          id: scan.id,
          disease: scan.disease,
          confidence: scan.confidence,
          riskLevel: scan.risk_level,
          imageRef: scan.image_ref,
          createdAt: scan.created_at
        }))
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FarmController();
