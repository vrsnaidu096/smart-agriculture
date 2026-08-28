const axios = require('axios');

/**
 * Weather Intelligence Integration - WeatherAPI.com.
 *
 * No mock fallback. Fabricated weather silently drives the risk engine and the
 * spray-safety warnings, so an outage must surface as "unavailable" rather than
 * as plausible-looking numbers.
 */

const getWeatherData = async (lat, lon) => {
  const API_KEY = process.env.WEATHER_API_KEY;

  if (!API_KEY) {
    console.warn('[Weather] WEATHER_API_KEY is not set - weather intelligence disabled.');
    return null;
  }

  try {
    console.log(`[Integration] Fetching weather for ${lat}, ${lon}...`);

    const url = 'https://api.weatherapi.com/v1/forecast.json';
    const response = await axios.get(url, {
      params: { key: API_KEY, q: `${lat},${lon}`, days: 1, aqi: 'no', alerts: 'yes' },
      timeout: 8000
    });

    const current = response.data?.current;
    if (!current) throw new Error('Missing "current" block in WeatherAPI response');

    const forecast = response.data?.forecast?.forecastday?.[0]?.day;

    return {
      temp_c: current.temp_c,
      humidity: current.humidity,
      precip_mm: current.precip_mm,
      chance_of_rain: forecast?.daily_chance_of_rain ?? 0,
      wind_kph: current.wind_kph,
      condition_text: current.condition?.text || 'Unknown'
    };
  } catch (error) {
    console.error('[Integration Error] Weather API failed:', error.message);
    return null;
  }
};

module.exports = { getWeatherData };
