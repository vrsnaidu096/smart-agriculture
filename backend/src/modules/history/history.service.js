const db = require('../../database/database');

class HistoryService {
  async getFarmHistory(farmId) {
    return new Promise((resolve) => {
      // For MVP, if DB isn't fully wired, resolve with empty array or mock
      db.all(`SELECT * FROM CropScans WHERE farm_id = ? ORDER BY created_at DESC LIMIT 5`, [farmId], (err, rows) => {
        if (err) {
          console.error('History fetch error:', err.message);
          return resolve({ status: 'UNAVAILABLE' });
        }
        resolve(rows || []);
      });
    });
  }

  async saveScan(farmId, lat, lon, diseaseData, weatherData, soilData, riskData) {
    // Save logic
    return new Promise((resolve) => {
      const query = `
        INSERT INTO CropScans (
          farm_id, latitude, longitude, disease, confidence, risk_level, risk_score, recommendation, weather_data, soil_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      db.run(query, [
        farmId, lat, lon, 
        diseaseData?.disease, diseaseData?.confidence,
        riskData?.riskLevel, riskData?.riskScore, riskData?.alert,
        JSON.stringify(weatherData), JSON.stringify(soilData)
      ], function(err) {
        if (err) console.error('Save scan error:', err.message);
        resolve(this?.lastID || null);
      });
    });
  }
}

module.exports = new HistoryService();
