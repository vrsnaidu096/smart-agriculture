import axios from 'axios';
import Constants from 'expo-constants';

/**
 * Backend client.
 *
 * The base URL comes from app.json -> expo.extra.apiBaseUrl so it is not
 */

const FALLBACK_URL = 'https://wbwfv-182-71-120-142.free.pinggy.net/api';

export const API_BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl ||
  FALLBACK_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
  headers: { 'Content-Type': 'application/json' }
});

import { getToken } from './storage';

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Normalise every failure into one shape the screens can render. */
const toError = (error) => {
  if (error.response?.data?.error) {
    return {
      message: error.response.data.error.message || 'Request failed.',
      code: error.response.data.error.code || 'ERROR',
      status: error.response.status
    };
  }
  if (error.code === 'ECONNABORTED') {
    return { message: 'The request timed out. Please try again.', code: 'TIMEOUT' };
  }
  return { message: 'Cannot reach the server. Check your connection.', code: 'NETWORK' };
};

const unwrap = async (promise) => {
  try {
    const response = await promise;
    return { ok: true, data: response.data?.data ?? response.data };
  } catch (error) {
    console.warn('[api]', error.message);
    return { ok: false, error: toError(error) };
  }
};

// --- Analysis ---------------------------------------------------------------
export const analyzeCrop = (payload) => unwrap(api.post('/analyze', payload));

// --- Farms ------------------------------------------------------------------
export const listFarms = () => unwrap(api.get('/farms'));
export const getFarm = (farmId) => unwrap(api.get(`/farms/${farmId}`));
export const createFarm = (name) => unwrap(api.post('/farms', { name }));
export const getFarmSummary = (farmId) => unwrap(api.get(`/farms/${farmId}/summary`));

// --- History ----------------------------------------------------------------
export const getHistory = (farmId, limit = 20, offset = 0) =>
  unwrap(api.get(`/history/${farmId}`, { params: { limit, offset } }));
export const getScan = (scanId) => unwrap(api.get(`/history/scan/${scanId}`));

// --- Alerts -----------------------------------------------------------------
export const getAlerts = (farmId) => unwrap(api.get(`/alerts/${farmId}`));

// --- LingBot-Map ------------------------------------------------------------
export const getMapData = (farmId) => unwrap(api.get(`/map/${farmId}`));
export const saveBoundary = (farmId, coordinates) =>
  unwrap(api.post('/map/boundary', { farmId, geojson: { type: 'Polygon', coordinates: [coordinates] } }));

export default api;
