const db = require('../../database/database');
const log = require('../../utils/logger').create('AlertsService');

/**
 * Alerts (spec section 23).
 *
 * Two sources: rows persisted in RiskAlerts when a scan comes back HIGH, and
 * alerts derived on the fly from recent scans so the list is useful before any
 * have been written.
 */

const SEVERITY_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 };

class AlertsService {
  async persist(farmId, message, level) {
    return new Promise((resolve) => {
      db.run(
        'INSERT INTO RiskAlerts (farm_id, message, level) VALUES (?, ?, ?)',
        [farmId ?? null, message, level],
        function (err) {
          if (err) {
            log.error(`Persist alert failed: ${err.message}`);
            return resolve(null);
          }
          resolve(this.lastID);
        }
      );
    });
  }

  async stored(farmId, limit = 20) {
    return new Promise((resolve) => {
      db.all(
        'SELECT * FROM RiskAlerts WHERE farm_id = ? ORDER BY created_at DESC LIMIT ?',
        [farmId, limit],
        (err, rows) => {
          if (err) {
            log.error(err.message);
            return resolve([]);
          }
          resolve(rows || []);
        }
      );
    });
  }

  /** Derive alerts from recent scans that still warrant attention. */
  derive(scans) {
    return (scans || [])
      .filter((s) => s.risk_level === 'HIGH' || s.risk_level === 'MEDIUM')
      .map((scan) => ({
        id: `scan-${scan.id}`,
        source: 'SCAN',
        scanId: scan.id,
        level: scan.risk_level,
        title:
          scan.disease && !['NOT_A_CROP', 'REJECTED', 'UNAVAILABLE'].includes(scan.disease)
            ? `${scan.disease} detected`
            : 'Elevated risk detected',
        message: scan.recommendation || 'Review this scan and monitor the affected area.',
        latitude: scan.latitude,
        longitude: scan.longitude,
        createdAt: scan.created_at
      }));
  }

  merge(derived, stored) {
    const fromTable = (stored || []).map((row) => ({
      id: `alert-${row.id}`,
      source: 'ALERT',
      scanId: null,
      level: row.level,
      title: 'Farm alert',
      message: row.message,
      latitude: null,
      longitude: null,
      createdAt: row.created_at
    }));

    return [...derived, ...fromTable].sort((a, b) => {
      const bySeverity =
        (SEVERITY_RANK[a.level] ?? 9) - (SEVERITY_RANK[b.level] ?? 9);
      if (bySeverity !== 0) return bySeverity;
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
  }
}

module.exports = new AlertsService();
