const axios = require('axios');

/**
 * Disease Model Integration
 *
 * A thin HTTP client for the Python inference sidecar (see ../../ml). All the
 * intelligence - the CLIP leaf/not-leaf gate, crop routing, calibration and
 * abstention - lives there.
 *
 * There is deliberately NO mock fallback. If the sidecar cannot answer, this
 * returns UNAVAILABLE and the farmer is told the service is down. Inventing a
 * diagnosis is worse than admitting we do not have one.
 */

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
const ML_TIMEOUT_MS = Number(process.env.ML_TIMEOUT_MS || 20000);

const unavailable = (reason) => ({
  status: 'UNAVAILABLE',
  source: 'live',
  reason,
  message: 'Crop analysis is temporarily unavailable. Please try again shortly.'
});

const getDiseasePrediction = async (image, cropName) => {
  try {
    const response = await axios.post(
      `${ML_SERVICE_URL}/predict`,
      { image, crop: cropName || null },
      { timeout: ML_TIMEOUT_MS, headers: { 'Content-Type': 'application/json' } }
    );

    const data = response.data;
    if (!data || typeof data.status !== 'string') {
      console.error('[Integration Error] Malformed response from inference service.');
      return unavailable('MALFORMED_RESPONSE');
    }

    return data;
  } catch (error) {
    const detail = error.response
      ? `HTTP ${error.response.status}`
      : error.code || error.message;
    console.error(`[Integration Error] Inference service unreachable: ${detail}`);
    return unavailable(error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'UNREACHABLE');
  }
};

const checkHealth = async () => {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 5000 });
    return { reachable: true, ...response.data };
  } catch (error) {
    return { reachable: false, error: error.code || error.message };
  }
};

module.exports = {
  getDiseasePrediction,
  checkHealth,
  ML_SERVICE_URL
};
