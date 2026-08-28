const db = require('../../database/database');

class BoundaryService {
  async saveBoundary(farmId, geojson) {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO FarmBoundaries (farm_id, geojson) VALUES (?, ?)`;
      db.run(query, [farmId, JSON.stringify(geojson)], function(err) {
        if (err) return reject(err);
        resolve(this.lastID);
      });
    });
  }

  async getBoundary(farmId) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM FarmBoundaries WHERE farm_id = ? ORDER BY created_at DESC LIMIT 1`;
      db.get(query, [farmId], (err, row) => {
        if (err) return reject(err);
        if (row && row.geojson) {
          row.geojson = JSON.parse(row.geojson);
        }
        resolve(row || null);
      });
    });
  }
}

module.exports = new BoundaryService();
