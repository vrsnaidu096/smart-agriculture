const db = require('../../database/database');

class HistoryService {
  /**
   * Recent scans for a farm. Always resolves to an array — callers map over
   * this, so an error must not hand them a non-iterable.
   */
  async getFarmHistory(farmId) {
    return new Promise((resolve) => {
      const query = `
        SELECT * FROM CropScans
        WHERE farm_id = ?
        ORDER BY created_at DESC
        LIMIT 5
      `;
      db.all(query, [farmId ?? null], (err, rows) => {
        if (err) {
          console.error('History fetch error:', err.message);
          return resolve([]);
        }
        resolve(rows || []);
      });
    });
  }

  /**
   * Paginated scan history for the History screen.
   */
  async getHistory(farmId, limit = 20, offset = 0) {
    return new Promise((resolve) => {
      const query = `
        SELECT id, farm_id, latitude, longitude, image_ref, disease, confidence,
               risk_level, risk_score, recommendation, weather_data, soil_data,
               prediction_source, created_at
        FROM CropScans
        WHERE farm_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;
      db.all(query, [farmId ?? null, limit, offset], (err, rows) => {
        if (err) {
          console.error('History page error:', err.message);
          return resolve([]);
        }
        resolve(rows || []);
      });
    });
  }

  async countScans(farmId) {
    return new Promise((resolve) => {
      db.get(
        'SELECT COUNT(*) AS n FROM CropScans WHERE farm_id = ?',
        [farmId ?? null],
        (err, row) => resolve(err ? 0 : row?.n ?? 0)
      );
    });
  }

  /** Single scan with its stored images, for the result screen. */
  async getScan(scanId) {
    return new Promise((resolve) => {
      db.get('SELECT * FROM CropScans WHERE id = ?', [scanId], (err, row) => {
        if (err) {
          console.error('Get scan error:', err.message);
          return resolve(null);
        }
        resolve(row || null);
      });
    });
  }

  /**
   * Persist the scan itself. `imageRef` points at the primary stored image so
   * a row is always traceable back to the photo it was derived from.
   */
  async saveScan({
    farmId,
    latitude,
    longitude,
    disease,
    weather,
    soil,
    risk,
    imageRef = null,
    imageCount = 0,
    modelVersion = null,
    predictionSource = null
  }) {
    return new Promise((resolve) => {
      const query = `
        INSERT INTO CropScans (
          farm_id, latitude, longitude, image_ref, disease, confidence,
          risk_level, risk_score, recommendation, weather_data, soil_data,
          model_version, prediction_source, image_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(
        query,
        [
          farmId ?? null,
          latitude,
          longitude,
          imageRef,
          disease?.disease ?? null,
          disease?.confidence ?? null,
          risk?.riskLevel ?? null,
          risk?.riskScore ?? null,
          risk?.alert ?? null,
          JSON.stringify(weather ?? null),
          JSON.stringify(soil ?? null),
          modelVersion,
          predictionSource,
          imageCount
        ],
        function (err) {
          if (err) {
            console.error('Save scan error:', err.message);
            return resolve(null);
          }
          resolve(this?.lastID ?? null);
        }
      );
    });
  }

  /**
   * Persist one row per stored image, carrying the prediction that was made
   * for it. `verified_label` stays null until a human confirms it — that
   * column is what turns usage into an annotated dataset.
   */
  async saveScanImages(scanId, images) {
    if (!scanId || !Array.isArray(images) || images.length === 0) return 0;

    const query = `
      INSERT INTO ScanImages (
        scan_id, file_path, sha256, mime, bytes, crop_name,
        predicted_label, predicted_confidence, prediction_source, model_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const rows = images.map(
      (image) =>
        new Promise((resolve) => {
          db.run(
            query,
            [
              scanId,
              image.path,
              image.sha256,
              image.mime ?? null,
              image.bytes ?? null,
              image.cropName ?? null,
              image.predictedLabel ?? null,
              image.predictedConfidence ?? null,
              image.predictionSource ?? null,
              image.modelVersion ?? null
            ],
            (err) => {
              if (err) {
                console.error('Save scan image error:', err.message);
                return resolve(false);
              }
              resolve(true);
            }
          );
        })
    );

    const results = await Promise.all(rows);
    return results.filter(Boolean).length;
  }

  /**
   * Set the human-confirmed label for a stored image.
   */
  async verifyImageLabel(imageId, verifiedLabel, verifiedBy = 'reviewer') {
    return new Promise((resolve) => {
      const query = `
        UPDATE ScanImages
        SET verified_label = ?, verified_at = CURRENT_TIMESTAMP, verified_by = ?
        WHERE id = ?
      `;
      db.run(query, [verifiedLabel, verifiedBy, imageId], function (err) {
        if (err) {
          console.error('Verify label error:', err.message);
          return resolve(0);
        }
        resolve(this?.changes ?? 0);
      });
    });
  }

  /**
   * Images awaiting human review, oldest first.
   */
  async getUnverifiedImages(limit = 50) {
    return new Promise((resolve) => {
      const query = `
        SELECT si.*, cs.latitude, cs.longitude, cs.farm_id
        FROM ScanImages si
        LEFT JOIN CropScans cs ON cs.id = si.scan_id
        WHERE si.verified_label IS NULL
        ORDER BY si.created_at ASC
        LIMIT ?
      `;
      db.all(query, [limit], (err, rows) => {
        if (err) {
          console.error('Unverified fetch error:', err.message);
          return resolve([]);
        }
        resolve(rows || []);
      });
    });
  }
}

module.exports = new HistoryService();
