const axios = require('axios');

/**
 * Weather Intelligence Integration
 * Communicates with WeatherAPI.com for localized weather data.
 */
const getWeatherData = async (lat, lon) => {
  try {
    console.log(`[Integration] Fetching weather for ${lat}, ${lon}...`);
    
    const API_KEY = process.env.WEATHER_API_KEY;

    if (!API_KEY) {
      console.warn('[Warning] No WEATHER_API_KEY found in .env. Using mock fallback.');
      return getMockWeather();
    }

    const url = `http://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${lat},${lon}&days=1&aqi=no&alerts=yes`;
    
    const response = await axios.get(url, { timeout: 8000 });
    const data = response.data;

    const current = data.current;
    const forecast = data.forecast?.forecastday[0]?.day;

    return {
      temp_c: current.temp_c,
      humidity: current.humidity,
      precip_mm: current.precip_mm,
      chance_of_rain: forecast?.daily_chance_of_rain || 0,
      wind_kph: current.wind_kph,
      condition_text: current.condition?.text || "Unknown"
    };

  } catch (error) {
    console.error('[Integration Error] Weather API failed:', error.message);
    console.log('[Fail-safe] Falling back to mock weather data...');
    return getMockWeather();
  }
};

const getMockWeather = () => {
  return {
    temp_c: 27,
    humidity: 86,
    precip_mm: 1.5,
    chance_of_rain: 70,
    wind_kph: 12,
    condition_text: "Rain expected"
  };
};

module.exports = {
  getWeatherData
};
