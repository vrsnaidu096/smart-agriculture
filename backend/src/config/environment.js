require('dotenv').config();

/**
 * One place that reads process.env (spec section 30).
 * Nothing else in the backend should touch it directly.
 */

const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const config = {
  port: num(process.env.PORT, 3000),
  logLevel: process.env.LOG_LEVEL || 'info',

  ml: {
    serviceUrl: process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000',
    timeoutMs: num(process.env.ML_TIMEOUT_MS, 20000)
  },

  weather: { apiKey: process.env.WEATHER_API_KEY || null },

  images: {
    storageDir: process.env.IMAGE_STORAGE_DIR || 'storage/scans',
    maxPerScan: num(process.env.MAX_IMAGES_PER_SCAN, 8),
    maxBytes: num(process.env.MAX_IMAGE_BYTES, 8 * 1024 * 1024)
  },

  review: { token: process.env.REVIEW_TOKEN || null },

  map: {
    // Two scans closer than this are treated as the same zone.
    zoneRadiusMetres: num(process.env.ZONE_RADIUS_METRES, 50)
  },

  history: { recentLimit: num(process.env.HISTORY_RECENT_LIMIT, 5) }
};

module.exports = config;
