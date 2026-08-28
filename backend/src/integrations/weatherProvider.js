const axios = require('axios');

/**
 * Weather Intelligence Integration - Open-Meteo.
 *
 * No mock fallback. Fabricated weather silently drives the risk engine and the
 * spray-safety warnings, so an outage must surface as "unavailable" rather than
 * as plausible-looking numbers.
 */

const getWeatherData = async (lat, lon) => {
  try {
    console.log(`[Integration] Fetching weather for ${lat}, ${lon}...`);

    const url = 'https://api.open-meteo.com/v1/forecast';
    const response = await axios.get(url, {
      params: { 
        latitude: lat, 
        longitude: lon, 
        current: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code',
        daily: 'precipitation_probability_max',
        timezone: 'auto'
      },
      timeout: 8000
    });

    const current = response.data?.current;
    if (!current) throw new Error('Missing "current" block in Open-Meteo response');

    const daily = response.data?.daily;
    const wmoCode = current.weather_code;
    
    // Map WMO codes to a basic text description to maintain the condition_text contract
    let condition = 'Unknown';
    if (wmoCode === 0) condition = 'Clear';
    else if (wmoCode >= 1 && wmoCode <= 3) condition = 'Cloudy';
    else if (wmoCode >= 51 && wmoCode <= 67) condition = 'Rain';
    else if (wmoCode >= 71 && wmoCode <= 77) condition = 'Snow';
    else if (wmoCode >= 80 && wmoCode <= 82) condition = 'Showers';
    else if (wmoCode >= 95 && wmoCode <= 99) condition = 'Thunderstorm';

    return {
      temp_c: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      precip_mm: current.precipitation,
      chance_of_rain: daily?.precipitation_probability_max?.[0] ?? 0,
      wind_kph: current.wind_speed_10m,
      condition_text: condition
    };
  } catch (error) {
    console.error('[Integration Error] Weather API failed:', error.message);
    return null;
  }
};

module.exports = { getWeatherData };
