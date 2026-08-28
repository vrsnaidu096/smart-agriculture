import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Thin wrapper over AsyncStorage so screens never deal with JSON or failures.
 * Every read falls back to a default rather than throwing - losing a saved
 * preference must never stop the app opening.
 */

const KEYS = {
  LANGUAGE: '@sa/language',
  ACTIVE_FARM: '@sa/activeFarmId',
  FARMER_NAME: '@sa/farmerName'
};

const read = async (key, fallback = null) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    console.warn(`[storage] read ${key} failed:`, error.message);
    return fallback;
  }
};

const write = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`[storage] write ${key} failed:`, error.message);
    return false;
  }
};

export const getLanguage = () => read(KEYS.LANGUAGE, 'en');
export const setLanguage = (code) => write(KEYS.LANGUAGE, code);

export const getActiveFarmId = () => read(KEYS.ACTIVE_FARM, 1);
export const setActiveFarmId = (id) => write(KEYS.ACTIVE_FARM, id);

export const getFarmerName = () => read(KEYS.FARMER_NAME, null);
export const setFarmerName = (name) => write(KEYS.FARMER_NAME, name);

export const getToken = () => read('@sa/token', null);
export const setToken = (token) => write('@sa/token', token);

export default { getLanguage, setLanguage, getActiveFarmId, setActiveFarmId, getFarmerName, setFarmerName, getToken, setToken };
