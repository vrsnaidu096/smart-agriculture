const db = require('../../database/database');
const log = require('../../utils/logger').create('FarmService');

const all = (sql, params = []) =>
  new Promise((resolve) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        log.error(err.message);
        return resolve([]);
      }
      resolve(rows || []);
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        log.error(err.message);
        return resolve(null);
      }
      resolve(row || null);
    });
  });

class FarmService {
  async listFarms(userId = null) {
    return userId
      ? all('SELECT * FROM Farms WHERE user_id = ? ORDER BY created_at DESC', [userId])
      : all('SELECT * FROM Farms ORDER BY created_at DESC');
  }

  async getFarm(farmId) {
    return get('SELECT * FROM Farms WHERE id = ?', [farmId]);
  }

  async createFarm(name, userId = 1) {
    return new Promise((resolve) => {
      db.run(
        'INSERT INTO Farms (user_id, name) VALUES (?, ?)',
        [userId, name],
        function (err) {
          if (err) {
            log.error(`Create farm failed: ${err.message}`);
            return resolve(null);
          }
          resolve({ id: this.lastID, user_id: userId, name });
        }
      );
    });
  }

  /** Scans used for dashboard metrics: recent, and only ones that produced a risk. */
  async recentScoredScans(farmId, limit = 50) {
    return all(
      `SELECT id, latitude, longitude, disease, confidence, risk_level, risk_score, created_at
       FROM CropScans
       WHERE farm_id = ? AND risk_score IS NOT NULL
       ORDER BY created_at DESC
       LIMIT ?`,
      [farmId, limit]
    );
  }

  /**
   * Farm health for the dashboard ring.
   * Health is the inverse of average recent risk. Returns null rather than a
   * flattering default when there is nothing to judge from.
   */
  summarise(scans, zonesNeedingAttention) {
    if (!scans || scans.length === 0) {
      return {
        healthScore: null,
        status: 'NO_DATA',
        label: 'No scans yet',
        detail: 'Analyze a crop to see farm health',
        areasNeedingAttention: 0,
        scansConsidered: 0
      };
    }

    const avgRisk = scans.reduce((sum, s) => sum + (s.risk_score || 0), 0) / scans.length;
    const healthScore = Math.max(0, Math.min(100, Math.round(100 - avgRisk)));

    let status = 'ACTION_NEEDED';
    let label = 'Action Needed';
    if (healthScore >= 80) {
      status = 'HEALTHY';
      label = 'Healthy';
    } else if (healthScore >= 50) {
      status = 'MONITORING';
      label = 'Monitoring Required';
    }

    const count = zonesNeedingAttention;
    const detail =
      count > 0
        ? `${count} ${count === 1 ? 'area needs' : 'areas need'} attention`
        : 'No areas need attention';

    return {
      healthScore,
      status,
      label,
      detail,
      areasNeedingAttention: count,
      scansConsidered: scans.length
    };
  }
}

module.exports = new FarmService();
